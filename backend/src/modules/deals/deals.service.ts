import { PrismaClient, StageType } from '@prisma/client';
import { CreateDealInput, UpdateDealInput, MoveDealInput } from './deals.schema';

const prisma = new PrismaClient();

const dealInclude = {
  client: { select: { id: true, name: true, company: true } },
  owner: { select: { id: true, name: true } },
  stage: { select: { id: true, key: true, label: true, color: true, type: true, position: true } },
} as const;

async function getStageOrThrow(stageId: string) {
  const stage = await prisma.stage.findUnique({ where: { id: stageId } });
  if (!stage) throw { status: 400, message: 'Etapa não encontrada' };
  return stage;
}

export async function listDeals(ownerFilter: any) {
  const [stages, deals] = await Promise.all([
    prisma.stage.findMany({ orderBy: { position: 'asc' } }),
    prisma.deal.findMany({
      where: ownerFilter,
      include: dealInclude,
      orderBy: [{ position: 'asc' }],
    }),
  ]);

  const grouped: Record<string, typeof deals> = {};
  for (const stage of stages) {
    grouped[stage.id] = [];
  }
  for (const deal of deals) {
    if (!grouped[deal.stageId]) grouped[deal.stageId] = [];
    grouped[deal.stageId].push(deal);
  }

  return grouped;
}

export async function getDeal(id: string, ownerFilter: any) {
  const deal = await prisma.deal.findFirst({
    where: { id, ...ownerFilter },
    include: {
      ...dealInclude,
      activities: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  });

  if (!deal) throw { status: 404, message: 'Negócio não encontrado' };
  return deal;
}

export async function createDeal(data: CreateDealInput, ownerId: string) {
  const stage = await getStageOrThrow(data.stageId);

  const maxPosition = await prisma.deal.aggregate({
    where: { stageId: stage.id },
    _max: { position: true },
  });

  return prisma.deal.create({
    data: {
      title: data.title,
      value: data.value,
      stageId: stage.id,
      position: (maxPosition._max.position ?? -1) + 1,
      clientId: data.clientId,
      ownerId,
      closedAt: stage.type === StageType.OPEN ? null : new Date(),
    },
    include: dealInclude,
  });
}

export async function updateDeal(id: string, data: UpdateDealInput, ownerFilter: any) {
  const existing = await prisma.deal.findFirst({
    where: { id, ...ownerFilter },
    include: { stage: true },
  });
  if (!existing) throw { status: 404, message: 'Negócio não encontrado' };

  const updateData: any = {
    title: data.title,
    value: data.value,
    position: data.position,
    ownerId: data.ownerId,
  };

  if (data.stageId && data.stageId !== existing.stageId) {
    const newStage = await getStageOrThrow(data.stageId);
    updateData.stageId = newStage.id;
    if (newStage.type !== StageType.OPEN) {
      updateData.closedAt = new Date();
    } else if (existing.stage.type !== StageType.OPEN) {
      updateData.closedAt = null;
    }
  }

  return prisma.deal.update({
    where: { id },
    data: updateData,
    include: dealInclude,
  });
}

export async function moveDeal(id: string, data: MoveDealInput, userId: string, ownerFilter: any) {
  const existing = await prisma.deal.findFirst({
    where: { id, ...ownerFilter },
    include: { stage: true },
  });
  if (!existing) throw { status: 404, message: 'Negócio não encontrado' };

  const newStage = await getStageOrThrow(data.stageId);

  const updateData: any = {
    stageId: newStage.id,
    position: data.position,
  };

  if (newStage.id !== existing.stageId) {
    if (newStage.type !== StageType.OPEN) {
      updateData.closedAt = new Date();
    } else if (existing.stage.type !== StageType.OPEN) {
      updateData.closedAt = null;
    }
  }

  const deal = await prisma.deal.update({
    where: { id },
    data: updateData,
    include: dealInclude,
  });

  if (existing.stageId !== newStage.id) {
    await prisma.activity.create({
      data: {
        type: 'STAGE_CHANGE',
        content: `Movido de ${existing.stage.label} para ${newStage.label}`,
        dealId: id,
        clientId: existing.clientId,
        userId,
      },
    });
  }

  return deal;
}

export async function deleteDeal(id: string, ownerFilter: any) {
  const existing = await prisma.deal.findFirst({ where: { id, ...ownerFilter } });
  if (!existing) throw { status: 404, message: 'Negócio não encontrado' };

  await prisma.deal.delete({ where: { id } });
}

export async function bulkDeleteDeals(ids: string[], ownerFilter: any) {
  const result = await prisma.deal.deleteMany({
    where: { id: { in: ids }, ...ownerFilter },
  });
  return { count: result.count };
}
