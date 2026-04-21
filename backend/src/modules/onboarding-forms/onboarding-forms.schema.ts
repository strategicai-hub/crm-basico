import { z } from 'zod';

export const createOnboardingFormSchema = z.object({
  niche: z.enum(['ACADEMIA', 'ESCOLA_CURSOS', 'CONSORCIO', 'GENERICO']),
  targetPlan: z.enum(['START', 'PLENO']),
});

export type CreateOnboardingFormInput = z.infer<typeof createOnboardingFormSchema>;

export const submitOnboardingSchema = z.object({
  answers: z.record(z.any()),
  uploads: z
    .array(
      z.object({
        questionId: z.string(),
        name: z.string(),
        driveFileId: z.string(),
        url: z.string(),
      })
    )
    .default([]),
});

export type SubmitOnboardingInput = z.infer<typeof submitOnboardingSchema>;
