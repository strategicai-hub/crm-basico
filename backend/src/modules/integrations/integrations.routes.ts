import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { apiKeyAuth } from '../../middleware/apiKeyAuth';
import { emitDealsChanged } from '../../events/dealsBus';

const router = Router();
const prisma = new PrismaClient();

const createLeadSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(1),
  company: z.string().optional(),
  ownerId: z.string().uuid().optional(),
  origin: z.string().min(1).optional(),
});

router.post('/lead', apiKeyAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createLeadSchema.parse(req.body);

    // Resolver o owner: usar o ownerId informado ou fallback para o primeiro ADMIN
    let ownerId = data.ownerId;

    if (ownerId) {
      const userExists = await prisma.user.findUnique({ where: { id: ownerId } });
      if (!userExists) {
        return res.status(400).json({ error: 'Usuário responsável não encontrado' });
      }
    } else {
      const adminUser = await prisma.user.findFirst({
        where: { role: 'ADMIN' },
        orderBy: { createdAt: 'asc' },
      });
      if (!adminUser) {
        return res.status(500).json({ error: 'Nenhum usuário ADMIN encontrado no sistema' });
      }
      ownerId = adminUser.id;
    }

    // Buscar a primeira etapa do pipeline
    const firstStage = await prisma.stage.findFirst({
      orderBy: { position: 'asc' },
    });

    if (!firstStage) {
      return res.status(500).json({ error: 'Nenhuma etapa do pipeline encontrada' });
    }

    // Deduplicação por telefone: reutiliza cliente existente se já houver
    let client = await prisma.client.findFirst({ where: { phone: data.phone } });
    let clientReused = false;

    if (client) {
      clientReused = true;
    } else {
      client = await prisma.client.create({
        data: {
          name: data.name,
          phone: data.phone,
          company: data.company ?? null,
          ownerId,
        },
      });
    }

    // Se o cliente já tem um deal em etapa aberta (OPEN), reutiliza ao invés de criar novo
    const existingOpenDeal = await prisma.deal.findFirst({
      where: {
        clientId: client.id,
        stage: { type: 'OPEN' },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingOpenDeal) {
      return res.status(200).json({
        client,
        deal: existingOpenDeal,
        reused: { client: clientReused, deal: true },
      });
    }

    // Resolve (find-or-create) a origem do lead, se informada
    let originId: string | undefined;
    if (data.origin) {
      const origin = await prisma.leadOrigin.upsert({
        where: { name: data.origin },
        update: {},
        create: { name: data.origin },
      });
      originId = origin.id;
    }

    const deal = await prisma.deal.create({
      data: {
        title: data.name,
        clientId: client.id,
        stageId: firstStage.id,
        ownerId,
        originId,
      },
    });

    emitDealsChanged({ action: 'created', source: 'integration' });
    res.status(201).json({ client, deal, reused: { client: clientReused, deal: false } });
  } catch (err) {
    next(err);
  }
});

// ---------- Integrações usadas pelo bot Telegram ----------

function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, '');
}

// GET /deals?phone=<phone>
// Busca cliente pelo sufixo do telefone (tolerante a DDI/DDD) e retorna seus deals
router.get('/deals', apiKeyAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const phone = typeof req.query.phone === 'string' ? req.query.phone : '';
    if (!phone) {
      return res.status(400).json({ error: 'Parâmetro phone é obrigatório' });
    }

    const normalized = normalizePhone(phone);
    const suffix = normalized.slice(-8);

    const clients = await prisma.client.findMany({
      where: { phone: { contains: suffix } },
      include: {
        deals: {
          include: { stage: true },
          orderBy: { updatedAt: 'desc' },
        },
      },
    });

    if (clients.length === 0) {
      return res.status(404).json({ error: 'Cliente não encontrado pelo telefone' });
    }

    const best =
      clients.find((c) => c.deals.some((d) => d.stage.type === 'OPEN')) ?? clients[0];

    res.json({
      client: {
        id: best.id,
        name: best.name,
        phone: best.phone,
        company: best.company,
        email: best.email,
      },
      deals: best.deals.map((d) => ({
        id: d.id,
        title: d.title,
        value: d.value,
        stage: {
          id: d.stage.id,
          key: d.stage.key,
          label: d.stage.label,
          type: d.stage.type,
        },
      })),
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /deals/:id/stage
// Move um deal para outra etapa (identificada por stageKey, mais estável que stageId)
const moveStageSchema = z.object({
  stageKey: z.string().min(1),
  note: z.string().optional(),
  notes: z.string().optional(),
});

router.patch(
  '/deals/:id/stage',
  apiKeyAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const body = moveStageSchema.parse(req.body);

      const stage = await prisma.stage.findUnique({ where: { key: body.stageKey } });
      if (!stage) {
        return res.status(404).json({ error: `Etapa '${body.stageKey}' não encontrada` });
      }

      const deal = await prisma.deal.findUnique({
        where: { id },
        include: { stage: true },
      });
      if (!deal) {
        return res.status(404).json({ error: 'Deal não encontrado' });
      }

      const updateData: any = {
        stageId: stage.id,
        closedAt: stage.type === 'WON' ? new Date() : null,
      };
      if (body.notes) {
        updateData.notes = body.notes;
      }

      const updated = await prisma.deal.update({
        where: { id },
        data: updateData,
        include: { stage: true },
      });

      if (body.note) {
        await prisma.activity.create({
          data: {
            type: 'stage_move',
            content: body.note,
            dealId: updated.id,
            clientId: updated.clientId,
            userId: updated.ownerId,
          },
        });
      }

      emitDealsChanged({ action: 'moved', source: 'integration' });
      res.json({
        id: updated.id,
        title: updated.title,
        stage: {
          id: updated.stage.id,
          key: updated.stage.key,
          label: updated.stage.label,
          type: updated.stage.type,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /deals/:id
// Remove um deal. Cascata remove atividades relacionadas (Activity.dealId é onDelete: SetNull).
router.delete(
  '/deals/:id',
  apiKeyAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const deal = await prisma.deal.findUnique({ where: { id } });
      if (!deal) {
        return res.status(404).json({ error: 'Deal não encontrado' });
      }
      await prisma.deal.delete({ where: { id } });
      emitDealsChanged({ action: 'deleted', source: 'integration' });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

// GET /stages/stats
// Retorna cada etapa do pipeline com a contagem de deals
router.get(
  '/stages/stats',
  apiKeyAuth,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const stages = await prisma.stage.findMany({ orderBy: { position: 'asc' } });
      const grouped = await prisma.deal.groupBy({
        by: ['stageId'],
        _count: { _all: true },
      });
      const countByStage = new Map(grouped.map((g) => [g.stageId, g._count._all]));

      const result = stages.map((s) => ({
        id: s.id,
        key: s.key,
        label: s.label,
        count: countByStage.get(s.id) ?? 0,
      }));
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
