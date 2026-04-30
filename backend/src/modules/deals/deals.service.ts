import { PrismaClient, StageType, ContractStage } from '@prisma/client';
import { CreateDealInput, UpdateDealInput, MoveDealInput, UpdateContractStageInput } from './deals.schema';
import { emitDealsChanged } from '../../events/dealsBus';

const prisma = new PrismaClient();

const dealInclude = {
  client: {
    select: {
      id: true,
      name: true,
      company: true,
      phone: true,
      onboardingForm: {
        select: {
          id: true,
          submissions: { select: { id: true }, take: 1 },
        },
      },
    },
  },
  owner: { select: { id: true, name: true } },
  stage: { select: { id: true, key: true, label: true, color: true, type: true, position: true } },
  origin: { select: { id: true, name: true } },
  niche: { select: { id: true, name: true } },
  plan: { select: { id: true, name: true } },
} as const;

function decorateDeal<T extends { client: { onboardingForm: { id: string; submissions: { id: string }[] } | null } }>(deal: T) {
  const form = deal.client.onboardingForm;
  let onboardingStatus: 'not_generated' | 'sent' | 'submitted' = 'not_generated';
  if (form) {
    onboardingStatus = form.submissions.length > 0 ? 'submitted' : 'sent';
  }
  return { ...deal, onboardingStatus };
}

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

  const decorated = deals.map(decorateDeal);

  const grouped: Record<string, typeof decorated> = {};
  for (const stage of stages) {
    grouped[stage.id] = [];
  }
  for (const deal of decorated) {
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
  return decorateDeal(deal);
}

export async function createDeal(data: CreateDealInput, ownerId: string) {
  const stage = await getStageOrThrow(data.stageId);

  const maxPosition = await prisma.deal.aggregate({
    where: { stageId: stage.id },
    _max: { position: true },
  });

  const created = await prisma.deal.create({
    data: {
      title: data.title,
      value: data.value,
      stageId: stage.id,
      position: (maxPosition._max.position ?? -1) + 1,
      clientId: data.clientId,
      ownerId,
      originId: data.originId ?? null,
      nicheId: data.nicheId ?? null,
      planId: data.planId ?? null,
      notes: data.notes ?? null,
      closedAt: stage.type === StageType.OPEN ? null : new Date(),
    },
    include: dealInclude,
  });
  emitDealsChanged({ action: 'created', source: 'app' });
  return decorateDeal(created);
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
    originId: data.originId,
    nicheId: data.nicheId,
    planId: data.planId,
    clientId: data.clientId,
    notes: data.notes,
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

  const updated = await prisma.deal.update({
    where: { id },
    data: updateData,
    include: dealInclude,
  });
  emitDealsChanged({ action: 'updated', source: 'app' });
  return decorateDeal(updated);
}

export async function moveDeal(id: string, data: MoveDealInput, userId: string, ownerFilter: any) {
  const existing = await prisma.deal.findFirst({
    where: { id, ...ownerFilter },
    include: { stage: true },
  });
  if (!existing) throw { status: 404, message: 'Negócio não encontrado' };

  const newStage = await getStageOrThrow(data.stageId);

  const sameStage = newStage.id === existing.stageId;
  const oldPosition = existing.position;

  const destCount = await prisma.deal.count({
    where: { stageId: newStage.id, id: sameStage ? { not: id } : undefined },
  });
  const targetPosition = Math.max(0, Math.min(data.position, destCount));

  const updateData: any = {
    stageId: newStage.id,
    position: targetPosition,
  };

  if (!sameStage) {
    if (newStage.type !== StageType.OPEN) {
      updateData.closedAt = new Date();
    } else if (existing.stage.type !== StageType.OPEN) {
      updateData.closedAt = null;
    }
  }

  const deal = await prisma.$transaction(async (tx) => {
    if (sameStage) {
      if (targetPosition === oldPosition) {
        return tx.deal.findUniqueOrThrow({ where: { id }, include: dealInclude });
      }
      if (targetPosition > oldPosition) {
        await tx.deal.updateMany({
          where: {
            stageId: newStage.id,
            id: { not: id },
            position: { gt: oldPosition, lte: targetPosition },
          },
          data: { position: { decrement: 1 } },
        });
      } else {
        await tx.deal.updateMany({
          where: {
            stageId: newStage.id,
            id: { not: id },
            position: { gte: targetPosition, lt: oldPosition },
          },
          data: { position: { increment: 1 } },
        });
      }
    } else {
      await tx.deal.updateMany({
        where: {
          stageId: existing.stageId,
          id: { not: id },
          position: { gt: oldPosition },
        },
        data: { position: { decrement: 1 } },
      });
      await tx.deal.updateMany({
        where: {
          stageId: newStage.id,
          id: { not: id },
          position: { gte: targetPosition },
        },
        data: { position: { increment: 1 } },
      });
    }

    return tx.deal.update({
      where: { id },
      data: updateData,
      include: dealInclude,
    });
  });

  if (!sameStage) {
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

  emitDealsChanged({ action: 'moved', source: 'app' });
  return decorateDeal(deal);
}

export async function deleteDeal(id: string, ownerFilter: any) {
  const existing = await prisma.deal.findFirst({ where: { id, ...ownerFilter } });
  if (!existing) throw { status: 404, message: 'Negócio não encontrado' };

  await prisma.deal.delete({ where: { id } });
  emitDealsChanged({ action: 'deleted', source: 'app' });
}

export async function bulkDeleteDeals(ids: string[], ownerFilter: any) {
  const result = await prisma.deal.deleteMany({
    where: { id: { in: ids }, ...ownerFilter },
  });
  if (result.count > 0) emitDealsChanged({ action: 'deleted', source: 'app' });
  return { count: result.count };
}

const CONTRACT_STAGE_LABELS: Record<ContractStage, string> = {
  NOT_GENERATED: 'Não gerado',
  LINK_SENT: 'Link enviado',
  FORM_FILLED: 'Formulário preenchido',
  MINUTA_SENT: 'Minuta enviada',
  SIGNING_SENT: 'Enviado para assinatura',
  SIGNED: 'Assinado',
};

export async function updateContractStage(
  id: string,
  data: UpdateContractStageInput,
  userId: string,
  ownerFilter: any,
) {
  const existing = await prisma.deal.findFirst({ where: { id, ...ownerFilter } });
  if (!existing) throw { status: 404, message: 'Negócio não encontrado' };

  if (existing.contractStage === data.stage) {
    return prisma.deal.findUnique({ where: { id }, include: dealInclude }).then((d) => decorateDeal(d!));
  }

  const updated = await prisma.deal.update({
    where: { id },
    data: { contractStage: data.stage },
    include: dealInclude,
  });

  await prisma.activity.create({
    data: {
      type: 'CONTRACT_STAGE',
      content: `Contrato: ${CONTRACT_STAGE_LABELS[existing.contractStage]} → ${CONTRACT_STAGE_LABELS[data.stage]}`,
      dealId: id,
      clientId: existing.clientId,
      userId,
    },
  });

  emitDealsChanged({ action: 'updated', source: 'app' });
  return decorateDeal(updated);
}

/**
 * Avança `contractStage` de todos os deals de um cliente cujo estado atual esteja em `fromStages`
 * para o novo estado `toStage`. Usado em transições automáticas (gerar link, receber submissão).
 * Nunca retrocede um deal que já esteja em fase posterior.
 */
export async function advanceContractStageForClient(
  clientId: string,
  fromStages: ContractStage[],
  toStage: ContractStage,
) {
  const result = await prisma.deal.updateMany({
    where: { clientId, contractStage: { in: fromStages } },
    data: { contractStage: toStage },
  });
  if (result.count > 0) emitDealsChanged({ action: 'updated', source: 'app' });
  return result.count;
}
