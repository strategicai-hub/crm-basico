import { PrismaClient, StageType } from '@prisma/client';

const prisma = new PrismaClient();

export async function getSummary(ownerFilter: any) {
  const [totalClients, openDeals, pipelineValue, pendingTasks] = await Promise.all([
    prisma.client.count({ where: ownerFilter }),
    prisma.deal.count({
      where: {
        ...ownerFilter,
        stage: { type: StageType.OPEN },
      },
    }),
    prisma.deal.aggregate({
      where: {
        ...ownerFilter,
        stage: { type: StageType.OPEN },
      },
      _sum: { value: true },
    }),
    prisma.task.count({
      where: { ...ownerFilter, status: { in: ['PENDENTE', 'EM_ANDAMENTO'] } },
    }),
  ]);

  return {
    totalClients,
    openDeals,
    pipelineValue: pipelineValue._sum.value || 0,
    pendingTasks,
  };
}

export async function getSalesByMonth(ownerFilter: any) {
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const deals = await prisma.deal.findMany({
    where: {
      ...ownerFilter,
      stage: { type: StageType.WON },
      closedAt: { gte: twelveMonthsAgo },
    },
    select: { value: true, closedAt: true },
  });

  const monthlyData: Record<string, number> = {};
  for (let i = 11; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyData[key] = 0;
  }

  for (const deal of deals) {
    if (deal.closedAt && deal.value) {
      const key = `${deal.closedAt.getFullYear()}-${String(deal.closedAt.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyData[key] !== undefined) {
        monthlyData[key] += Number(deal.value);
      }
    }
  }

  return Object.entries(monthlyData).map(([month, value]) => ({ month, value }));
}

export async function getConversionFunnel(ownerFilter: any) {
  const stages = await prisma.stage.findMany({ orderBy: { position: 'asc' } });

  const counts = await Promise.all(
    stages.map(async (stage) => ({
      stageId: stage.id,
      label: stage.label,
      type: stage.type,
      count: await prisma.deal.count({ where: { ...ownerFilter, stageId: stage.id } }),
    }))
  );

  return counts;
}

export async function getLeadsBySource(ownerFilter: any, startDate: Date, endDate: Date) {
  const [allOrigins, stages, deals] = await Promise.all([
    prisma.leadOrigin.findMany({ orderBy: { name: 'asc' } }),
    prisma.stage.findMany({ orderBy: { position: 'asc' } }),
    prisma.deal.findMany({
      where: {
        ...ownerFilter,
        createdAt: { gte: startDate, lt: endDate },
        originId: { not: null },
      },
      select: { id: true, originId: true, stageId: true },
    }),
  ]);

  const origins = allOrigins.filter((o) => !/descobrir\s*origem/i.test(o.name));

  const contractStage = stages.find((s) => /contrato/i.test(s.label)) || null;
  const contractPosition = contractStage?.position ?? null;

  const matrix: Record<string, Record<string, number>> = {};
  for (const stage of stages) {
    matrix[stage.id] = { __total: 0 };
    for (const origin of origins) matrix[stage.id][origin.id] = 0;
  }

  const totals: Record<string, number> = { __total: 0 };
  for (const origin of origins) totals[origin.id] = 0;

  const passedContract: Record<string, number> = { __total: 0 };
  for (const origin of origins) passedContract[origin.id] = 0;

  const stageById = new Map(stages.map((s) => [s.id, s]));

  for (const deal of deals) {
    if (!deal.originId) continue;
    const row = matrix[deal.stageId];
    if (!row) continue;
    if (row[deal.originId] === undefined) continue;
    row[deal.originId] += 1;
    row.__total += 1;
    totals[deal.originId] += 1;
    totals.__total += 1;
    if (contractPosition !== null) {
      const stage = stageById.get(deal.stageId);
      if (stage && stage.type !== 'LOST' && stage.position >= contractPosition) {
        passedContract[deal.originId] += 1;
        passedContract.__total += 1;
      }
    }
  }

  let conversion: Record<string, number | null> | null = null;
  if (contractStage) {
    conversion = { __total: totals.__total ? passedContract.__total / totals.__total : 0 };
    for (const origin of origins) {
      conversion[origin.id] = totals[origin.id] ? passedContract[origin.id] / totals[origin.id] : 0;
    }
  }

  const newClients: Record<string, number | null> = contractStage
    ? { ...passedContract }
    : (() => {
        const o: Record<string, number | null> = { __total: null };
        for (const origin of origins) o[origin.id] = null;
        return o;
      })();

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    origins: origins.map((o) => ({ id: o.id, name: o.name })),
    stages: stages.map((s) => ({ id: s.id, label: s.label, type: s.type })),
    matrix,
    totals,
    newClients,
    conversion,
    contractStageId: contractStage?.id ?? null,
  };
}

export async function getRecentActivities(ownerFilter: any) {
  const userFilter = ownerFilter.ownerId ? { userId: ownerFilter.ownerId } : {};

  return prisma.activity.findMany({
    where: userFilter,
    include: {
      user: { select: { id: true, name: true } },
      client: { select: { id: true, name: true } },
      deal: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
}
