import { PrismaClient } from '@prisma/client';
import { CreateClientInput, UpdateClientInput, AddActivityInput } from './clients.schema';

const prisma = new PrismaClient();

export async function listClients(
  ownerFilter: any,
  search: string | undefined,
  page: number,
  limit: number,
  skip: number
) {
  const where: any = {
    ...ownerFilter,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { company: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      where,
      skip,
      take: limit,
      include: { owner: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.client.count({ where }),
  ]);

  return { clients, total };
}

export async function getClient(id: string, ownerFilter: any) {
  const client = await prisma.client.findFirst({
    where: { id, ...ownerFilter },
    include: {
      owner: { select: { id: true, name: true } },
      _count: { select: { deals: true, tasks: true } },
    },
  });

  if (!client) throw { status: 404, message: 'Cliente não encontrado' };
  return client;
}

export async function createClient(data: CreateClientInput, ownerId: string) {
  return prisma.client.create({
    data: { ...data, email: data.email || null, ownerId },
    include: { owner: { select: { id: true, name: true } } },
  });
}

export async function updateClient(id: string, data: UpdateClientInput, ownerFilter: any) {
  const existing = await prisma.client.findFirst({ where: { id, ...ownerFilter } });
  if (!existing) throw { status: 404, message: 'Cliente não encontrado' };

  return prisma.client.update({
    where: { id },
    data: { ...data, email: data.email || null },
    include: { owner: { select: { id: true, name: true } } },
  });
}

export async function deleteClient(id: string, ownerFilter: any) {
  const existing = await prisma.client.findFirst({ where: { id, ...ownerFilter } });
  if (!existing) throw { status: 404, message: 'Cliente não encontrado' };

  await prisma.client.delete({ where: { id } });
}

export async function bulkDeleteClients(ids: string[], ownerFilter: any) {
  const result = await prisma.client.deleteMany({
    where: { id: { in: ids }, ...ownerFilter },
  });
  return { count: result.count };
}

export async function getClientActivities(id: string, ownerFilter: any) {
  const client = await prisma.client.findFirst({ where: { id, ...ownerFilter } });
  if (!client) throw { status: 404, message: 'Cliente não encontrado' };

  return prisma.activity.findMany({
    where: { clientId: id },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

export async function addClientActivity(id: string, data: AddActivityInput, userId: string, ownerFilter: any) {
  const client = await prisma.client.findFirst({ where: { id, ...ownerFilter } });
  if (!client) throw { status: 404, message: 'Cliente não encontrado' };

  return prisma.activity.create({
    data: { ...data, clientId: id, userId },
    include: { user: { select: { id: true, name: true } } },
  });
}
