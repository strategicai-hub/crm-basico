import { Request, Response, NextFunction } from 'express';
import { submitOnboardingSchema } from '../onboarding-forms/onboarding-forms.schema';
import * as service from '../onboarding-forms/onboarding-forms.service';
import { uploadFileToFolder, getRootFolderId } from '../../services/google-drive.service';

export async function getByToken(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.getPublicFormContext(req.params.token);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function upload(req: Request, res: Response, next: NextFunction) {
  try {
    const base = await service.getFormByToken(req.params.token);
    const file = req.file;
    if (!file) throw { status: 400, message: 'Nenhum arquivo enviado' };

    let folderId: string;
    try {
      const form = await service.ensureDriveFolder(base.id);
      folderId = form.driveFolderId ?? getRootFolderId();
    } catch (err) {
      console.error('[onboarding] Falha ao garantir subpasta do Drive, usando pasta raiz:', err);
      folderId = getRootFolderId();
    }

    const questionId = (req.body?.questionId as string | undefined) ?? 'upload';
    const clientPrefix = sanitize(base.client.name).toLowerCase().slice(0, 32);
    const filename = `${clientPrefix}__${questionId}__${Date.now()}__${sanitize(file.originalname)}`;

    const result = await uploadFileToFolder({
      folderId,
      filename,
      mimeType: file.mimetype,
      buffer: file.buffer,
    });

    res.status(201).json({
      questionId,
      name: file.originalname,
      driveFileId: result.fileId,
      url: result.webViewLink,
    });
  } catch (err) {
    next(err);
  }
}

export async function submit(req: Request, res: Response, next: NextFunction) {
  try {
    const data = submitOnboardingSchema.parse(req.body);
    const submission = await service.recordSubmission(req.params.token, data);
    res.status(201).json({ id: submission.id, submittedAt: submission.submittedAt });
  } catch (err) {
    next(err);
  }
}

function sanitize(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120);
}
