import { z } from 'zod';

export const createOriginSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(100),
});

export type CreateOriginInput = z.infer<typeof createOriginSchema>;
