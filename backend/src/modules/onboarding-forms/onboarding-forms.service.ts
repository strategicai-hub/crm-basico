import crypto from 'crypto';
import { PrismaClient, Prisma } from '@prisma/client';
import { CreateOnboardingFormInput } from './onboarding-forms.schema';
import { filterQuestionsForForm } from './questions';
import { generateYaml, UploadEntry } from './yaml-generator';
import { createClientFolder, deleteFile, isDriveConfigured } from '../../services/google-drive.service';

const prisma = new PrismaClient();

function buildFormUrl(token: string) {
  const base = process.env.PUBLIC_APP_URL || '';
  return base ? `${base}/formulario-negocio/${token}` : `/formulario-negocio/${token}`;
}

export async function getOnboardingForm(clientId: string) {
  const form = await prisma.onboardingForm.findUnique({
    where: { clientId },
    include: {
      createdBy: { select: { id: true, name: true } },
      submissions: {
        orderBy: { submittedAt: 'desc' },
        select: { id: true, submittedAt: true },
      },
    },
  });

  if (!form) return null;

  return {
    ...form,
    url: form.token ? buildFormUrl(form.token) : null,
  };
}

export async function createOrUpdateOnboardingForm(
  clientId: string,
  input: CreateOnboardingFormInput,
  userId: string
) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, name: true },
  });
  if (!client) throw { status: 404, message: 'Cliente não encontrado' };

  const existing = await prisma.onboardingForm.findUnique({ where: { clientId } });
  const token = existing?.token ?? crypto.randomBytes(24).toString('base64url');

  let driveFolderId = existing?.driveFolderId ?? null;
  let driveFolderUrl = existing?.driveFolderUrl ?? null;

  if (!driveFolderId && isDriveConfigured()) {
    try {
      const folder = await createClientFolder(client.name, client.id);
      driveFolderId = folder.folderId;
      driveFolderUrl = folder.folderUrl;
    } catch (err) {
      console.error('[onboarding] Falha ao criar pasta no Drive:', err);
    }
  }

  await prisma.onboardingForm.upsert({
    where: { clientId },
    create: {
      clientId,
      token,
      niche: input.niche,
      targetPlan: input.targetPlan,
      driveFolderId,
      driveFolderUrl,
      createdById: userId,
    },
    update: {
      token,
      niche: input.niche,
      targetPlan: input.targetPlan,
      ...(driveFolderId ? { driveFolderId, driveFolderUrl } : {}),
    },
  });

  return getOnboardingForm(clientId);
}

export async function revokeToken(clientId: string) {
  const form = await prisma.onboardingForm.findUnique({ where: { clientId } });
  if (!form) throw { status: 404, message: 'Formulário não encontrado' };

  await prisma.onboardingForm.update({
    where: { clientId },
    data: { token: null },
  });
}

export async function deleteSubmission(clientId: string, submissionId: string) {
  const submission = await prisma.onboardingSubmission.findUnique({
    where: { id: submissionId },
    include: { form: { select: { clientId: true } } },
  });
  if (!submission || submission.form.clientId !== clientId) {
    throw { status: 404, message: 'Resposta não encontrada' };
  }

  const uploads = ((submission.uploads as unknown) as UploadEntry[]) ?? [];
  if (isDriveConfigured()) {
    for (const upload of uploads) {
      try {
        await deleteFile(upload.driveFileId);
      } catch (err) {
        console.error('[onboarding] falha ao deletar arquivo do Drive:', err);
      }
    }
  }

  await prisma.onboardingSubmission.delete({ where: { id: submissionId } });
}

export async function listSubmissions(clientId: string) {
  const form = await prisma.onboardingForm.findUnique({
    where: { clientId },
    include: {
      submissions: { orderBy: { submittedAt: 'desc' } },
    },
  });
  if (!form) return [];
  return form.submissions;
}

export async function generateYamlForLatest(clientId: string): Promise<{ yaml: string; filename: string }> {
  const form = await prisma.onboardingForm.findUnique({
    where: { clientId },
    include: {
      submissions: { orderBy: { submittedAt: 'desc' }, take: 1 },
      client: { select: { name: true } },
    },
  });

  if (!form) throw { status: 404, message: 'Formulário não encontrado' };
  const submission = form.submissions[0];
  if (!submission) throw { status: 404, message: 'Nenhuma submissão ainda' };

  const answers = (submission.answers as Record<string, unknown>) ?? {};
  const uploads = ((submission.uploads as unknown) as UploadEntry[]) ?? [];

  const yaml = generateYaml({
    niche: form.niche,
    targetPlan: form.targetPlan,
    answers,
    uploads,
  });

  const safeName = form.client.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return { yaml, filename: `client-${safeName || 'cliente'}.yaml` };
}

export async function getFormQuestions(clientId: string) {
  const form = await prisma.onboardingForm.findUnique({ where: { clientId } });
  if (!form) throw { status: 404, message: 'Formulário não encontrado' };
  return filterQuestionsForForm(form.niche, form.targetPlan);
}

export async function getPublicFormContext(token: string) {
  const form = await prisma.onboardingForm.findUnique({
    where: { token },
    include: { client: { select: { name: true } } },
  });
  if (!form || !form.token) throw { status: 404, message: 'Formulário não encontrado' };

  return {
    clientName: form.client.name,
    niche: form.niche,
    targetPlan: form.targetPlan,
    questions: filterQuestionsForForm(form.niche, form.targetPlan),
    hasDrive: Boolean(form.driveFolderId),
  };
}

export async function getFormByToken(token: string) {
  const form = await prisma.onboardingForm.findUnique({
    where: { token },
    include: { client: { select: { id: true, name: true, ownerId: true } } },
  });
  if (!form || !form.token) throw { status: 404, message: 'Formulário não encontrado' };
  return form;
}

export async function recordSubmission(
  token: string,
  data: { answers: Record<string, unknown>; uploads: UploadEntry[] }
) {
  const form = await getFormByToken(token);

  return prisma.$transaction(async (tx) => {
    const submission = await tx.onboardingSubmission.create({
      data: {
        formId: form.id,
        answers: data.answers as unknown as Prisma.InputJsonValue,
        uploads: data.uploads as unknown as Prisma.InputJsonValue,
      },
    });

    await tx.activity.create({
      data: {
        type: 'ONBOARDING_FORM_SUBMITTED',
        content: `Formulário de onboarding preenchido (${form.niche}/${form.targetPlan})`,
        clientId: form.clientId,
        userId: form.client.ownerId,
      },
    });

    return submission;
  });
}
