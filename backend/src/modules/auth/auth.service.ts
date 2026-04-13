import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { comparePassword, hashPassword } from '../../utils/password';
import { generateAccessToken } from '../../utils/jwt';
import { UpdateProfileInput } from './auth.schema';
import { env } from '../../config/env';

const prisma = new PrismaClient();

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.active) {
    throw { status: 401, message: 'Email ou senha incorretos' };
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    throw { status: 401, message: 'Email ou senha incorretos' };
  }

  const accessToken = generateAccessToken({ userId: user.id, role: user.role });
  const refreshToken = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + env.REFRESH_TOKEN_EXPIRES_IN_DAYS);

  await prisma.refreshToken.create({
    data: { token: refreshToken, userId: user.id, expiresAt },
  });

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
}

export async function refresh(refreshTokenValue: string) {
  const stored = await prisma.refreshToken.findUnique({
    where: { token: refreshTokenValue },
    include: { user: true },
  });

  if (!stored || stored.expiresAt < new Date() || !stored.user.active) {
    if (stored) await prisma.refreshToken.delete({ where: { id: stored.id } });
    throw { status: 401, message: 'Refresh token inválido ou expirado' };
  }

  // Rotate: delete old, create new
  await prisma.refreshToken.delete({ where: { id: stored.id } });

  const accessToken = generateAccessToken({ userId: stored.user.id, role: stored.user.role });
  const newRefreshToken = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + env.REFRESH_TOKEN_EXPIRES_IN_DAYS);

  await prisma.refreshToken.create({
    data: { token: newRefreshToken, userId: stored.user.id, expiresAt },
  });

  return {
    accessToken,
    refreshToken: newRefreshToken,
    user: {
      id: stored.user.id,
      name: stored.user.name,
      email: stored.user.email,
      role: stored.user.role,
    },
  };
}

export async function logout(refreshTokenValue: string) {
  await prisma.refreshToken.deleteMany({ where: { token: refreshTokenValue } });
}

export async function updateProfile(userId: string, data: UpdateProfileInput) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw { status: 404, message: 'Usuário não encontrado' };

  const updateData: any = {};

  if (data.name) updateData.name = data.name;

  if (data.email && data.email !== user.email) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw { status: 409, message: 'Email já cadastrado' };
    updateData.email = data.email;
  }

  if (data.newPassword) {
    if (!data.currentPassword) throw { status: 400, message: 'Senha atual é obrigatória' };
    const valid = await comparePassword(data.currentPassword, user.passwordHash);
    if (!valid) throw { status: 400, message: 'Senha atual incorreta' };
    updateData.passwordHash = await hashPassword(data.newPassword);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: { id: true, name: true, email: true, role: true },
  });

  return updated;
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  if (!user) throw { status: 404, message: 'Usuário não encontrado' };
  return user;
}
