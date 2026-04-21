import { Request, Response, NextFunction } from 'express';
import { submitOnboardingSchema } from '../onboarding-forms/onboarding-forms.schema';
import * as service from '../onboarding-forms/onboarding-forms.service';
import { uploadFileToFolder } from '../../services/google-drive.service';

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
    const form = await service.getFormByToken(req.params.token);
    if (!form.driveFolderId) {
      throw { status: 503, message: 'Upload indisponível: pasta do Drive não configurada' };
    }
    const file = req.file;
    if (!file) throw { status: 400, message: 'Nenhum arquivo enviado' };

    const questionId = (req.body?.questionId as string | undefined) ?? 'upload';
    const filename = `${questionId}__${Date.now()}__${sanitize(file.originalname)}`;

    const result = await uploadFileToFolder({
      folderId: form.driveFolderId,
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
