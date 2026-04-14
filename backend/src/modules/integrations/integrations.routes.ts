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
});

router.post('/lead', apiKeyAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createLeadSchema.parse(req.body);

    // Buscar o primeiro usuário ADMIN para atribuir como owner
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      orderBy: { createdAt: 'asc' },
    });

    if (!adminUser) {
      return res.status(500).json({ error: 'Nenhum usuário ADMIN encontrado no sistema' });
    }

    // Buscar a primeira etapa do pipeline
    const firstStage = await prisma.stage.findFirst({
      orderBy: { position: 'asc' },
    });

    if (!firstStage) {
      return res.status(500).json({ error: 'Nenhuma etapa do pipeline encontrada' });
    }

    // Criar o cliente
    const client = await prisma.client.create({
      data: {
        name: data.name,
        phone: data.phone,
        company: data.company ?? null,
        ownerId: adminUser.id,
      },
    });

    // Criar o deal na primeira etapa
    const deal = await prisma.deal.create({
      data: {
        title: `Lead WhatsApp - ${data.name}`,
        clientId: client.id,
        stageId: firstStage.id,
        ownerId: adminUser.id,
      },
    });

    res.status(201).json({ client, deal });
  } catch (err) {
    next(err);
  }
});

export default router;
