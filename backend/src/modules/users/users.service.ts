import { PrismaClient, Role } from '@prisma/client';
import { hashPassword } from '../../utils/password';
import { CreateUserInput, UpdateUserInput } from './users.schema';

const prisma = new PrismaClient();

export async function listUsers(page: number, limit: number, skip: number) {
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      skip,
      take: limit,
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count(),
  ]);
  return { users, total };
}

export async function listMinimalUsers() {
  const users = await prisma.user.findMany({
    where: { active: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });
  return users;
}

export async function createUser(data: CreateUserInput) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw { status: 409, message: 'Email já cadastrado' };

  const passwordHash = await hashPassword(data.password);
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role as Role,
    },
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
  });
  return user;
}

export async function updateUser(id: string, data: UpdateUserInput) {
  const updateData: any = { ...data };
  if (data.password) {
    updateData.passwordHash = await hashPassword(data.password);
    delete updateData.password;
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
  });
  return user;
}

export async function deleteUser(id: string) {
  await prisma.user.update({ where: { id }, data: { active: false } });
}

export async function bulkDeactivateUsers(ids: string[], currentUserId: string) {
  if (ids.includes(currentUserId)) {
    throw { status: 400, message: 'Você não pode desativar seu próprio usuário' };
  }

  const remainingAdmins = await prisma.user.count({
    where: { role: 'ADMIN', active: true, id: { notIn: ids } },
  });
  if (remainingAdmins === 0) {
    throw { status: 400, message: 'Não é possível desativar o último administrador ativo' };
  }

  const result = await prisma.user.updateMany({
    where: { id: { in: ids }, active: true },
    data: { active: false },
  });
  return { count: result.count };
}
