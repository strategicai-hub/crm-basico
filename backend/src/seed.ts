import { PrismaClient, Role, StageType } from '@prisma/client';

const defaultOrigins = ['Google Ads', 'Disparos', 'SDR'];
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const defaultStages = [
  { key: 'LEAD', label: 'Lead', color: 'bg-gray-100 border-gray-300', position: 0, type: StageType.OPEN },
  { key: 'PROPOSTA', label: 'Proposta', color: 'bg-blue-50 border-blue-300', position: 1, type: StageType.OPEN },
  { key: 'NEGOCIACAO', label: 'Negociação', color: 'bg-yellow-50 border-yellow-300', position: 2, type: StageType.OPEN },
  { key: 'FECHADO_GANHO', label: 'Ganho', color: 'bg-green-50 border-green-300', position: 3, type: StageType.WON },
  { key: 'FECHADO_PERDIDO', label: 'Perdido', color: 'bg-red-50 border-red-300', position: 4, type: StageType.LOST },
];

async function seedStages() {
  const count = await prisma.stage.count();
  if (count > 0) return;
  await prisma.stage.createMany({ data: defaultStages });
  console.log(`Etapas iniciais criadas: ${defaultStages.length}`);
}

async function seedAdmin() {
  const existingAdmin = await prisma.user.findFirst({ where: { role: Role.ADMIN } });
  if (existingAdmin) return;

  const passwordHash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      name: 'Administrador',
      email: 'admin@crm.com',
      passwordHash,
      role: Role.ADMIN,
    },
  });
  console.log(`Admin criado: ${admin.email}`);
}

async function seedOrigins() {
  for (const name of defaultOrigins) {
    await prisma.leadOrigin.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log(`Origens de lead verificadas: ${defaultOrigins.length}`);
}

async function main() {
  await seedStages();
  await seedAdmin();
  await seedOrigins();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
