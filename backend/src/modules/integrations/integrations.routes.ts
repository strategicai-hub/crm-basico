import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { apiKeyAuth } from '../../middleware/apiKeyAuth';

const router = Router();
const prisma = new PrismaClient();

const createLeadSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(1),
  company: z.string().optional(),
  ownerId: z.string().uuid().optional(),
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

    const deal = await prisma.deal.create({
      data: {
        title: `Lead WhatsApp - ${data.name}`,
        clientId: client.id,
        stageId: firstStage.id,
        ownerId,
      },
    });

    res.status(201).json({ client, deal, reused: { client: clientReused, deal: false } });
  } catch (err) {
    next(err);
  }
});

export default router;
