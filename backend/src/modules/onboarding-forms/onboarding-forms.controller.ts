import { Request, Response, NextFunction } from 'express';
import { createOnboardingFormSchema } from './onboarding-forms.schema';
import * as service from './onboarding-forms.service';
import { QUESTIONS } from './questions';

export async function get(req: Request, res: Response, next: NextFunction) {
  try {
    const form = await service.getOnboardingForm(req.params.id);
    res.json(form);
  } catch (err) {
    next(err);
  }
}

export async function createOrUpdate(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createOnboardingFormSchema.parse(req.body);
    const form = await service.createOrUpdateOnboardingForm(req.params.id, data, req.user!.userId);
    res.status(201).json(form);
  } catch (err) {
    next(err);
  }
}

export async function revoke(req: Request, res: Response, next: NextFunction) {
  try {
    await service.revokeToken(req.params.id);
    res.json({ message: 'Link revogado' });
  } catch (err) {
    next(err);
  }
}

export async function listSubmissions(req: Request, res: Response, next: NextFunction) {
  try {
    const submissions = await service.listSubmissions(req.params.id);
    res.json(submissions);
  } catch (err) {
    next(err);
  }
}

export async function deleteSubmission(req: Request, res: Response, next: NextFunction) {
  try {
    await service.deleteSubmission(req.params.id, req.params.submissionId);
    res.json({ message: 'Resposta removida' });
  } catch (err) {
    next(err);
  }
}

export async function getQuestions(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(QUESTIONS);
  } catch (err) {
    next(err);
  }
}

export async function downloadYaml(req: Request, res: Response, next: NextFunction) {
  try {
    const { yaml, filename } = await service.generateYamlForLatest(req.params.id);
    res.setHeader('Content-Type', 'application/x-yaml; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(yaml);
  } catch (err) {
    next(err);
  }
}
