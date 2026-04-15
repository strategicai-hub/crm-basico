import { PrismaClient } from '@prisma/client';
import { CreateOriginInput } from './origins.schema';

const prisma = new PrismaClient();

export async function listOrigins() {
  return prisma.leadOrigin.findMany({ orderBy: { createdAt: 'asc' } });
}

export async function createOrigin(data: CreateOriginInput) {
  const existing = await prisma.leadOrigin.findUnique({ where: { name: data.name } });
  if (existing) throw { status: 409, message: 'Origem já cadastrada' };
  return prisma.leadOrigin.create({ data });
}

export async function deleteOrigin(id: string) {
  const origin = await prisma.leadOrigin.findUnique({ where: { id } });
  if (!origin) throw { status: 404, message: 'Origem não encontrada' };

  const count = await prisma.deal.count({ where: { originId: id } });
  if (count > 0) throw { status: 409, message: `Origem está em uso por ${count} negócio(s) e não pode ser removida` };

  await prisma.leadOrigin.delete({ where: { id } });
}
