import { z } from 'zod';

export const createDealSchema = z.object({
  title: z.string().min(2, 'Título deve ter ao menos 2 caracteres'),
  value: z.number().positive().optional(),
  clientId: z.string().uuid('ID do cliente inválido'),
  stageId: z.string().uuid('ID da etapa inválido'),
  originId: z.string().uuid('ID da origem inválido').optional().nullable(),
});

export const updateDealSchema = z.object({
  title: z.string().min(2).optional(),
  value: z.number().positive().optional().nullable(),
  stageId: z.string().uuid('ID da etapa inválido').optional(),
  position: z.number().int().min(0).optional(),
  ownerId: z.string().uuid('ID do responsável inválido').optional(),
  originId: z.string().uuid('ID da origem inválido').optional().nullable(),
});

export const moveDealSchema = z.object({
  stageId: z.string().uuid('ID da etapa inválido'),
  position: z.number().int().min(0),
});

export const bulkDeleteDealsSchema = z.object({
  ids: z.array(z.string().uuid('ID de negócio inválido')).min(1, 'Informe ao menos um ID').max(200, 'Máximo de 200 IDs por requisição'),
});

export type CreateDealInput = z.infer<typeof createDealSchema>;
export type UpdateDealInput = z.infer<typeof updateDealSchema>;
export type MoveDealInput = z.infer<typeof moveDealSchema>;
export type BulkDeleteDealsInput = z.infer<typeof bulkDeleteDealsSchema>;
