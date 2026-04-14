import { Request, Response, NextFunction } from 'express';
import { createUserSchema, updateUserSchema, bulkDeleteUsersSchema } from './users.schema';
import * as usersService from './users.service';
import { getPagination, paginatedResponse } from '../../utils/pagination';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const params = getPagination(req.query as any);
    const { users, total } = await usersService.listUsers(params.page, params.limit, params.skip);
    res.json(paginatedResponse(users, total, params));
  } catch (err) {
    next(err);
  }
}

export async function listMinimal(req: Request, res: Response, next: NextFunction) {
  try {
    const users = await usersService.listMinimalUsers();
    res.json(users);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createUserSchema.parse(req.body);
    const user = await usersService.createUser(data);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const data = updateUserSchema.parse(req.body);
    const user = await usersService.updateUser(req.params.id, data);
    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await usersService.deleteUser(req.params.id);
    res.json({ message: 'Usuário desativado' });
  } catch (err) {
    next(err);
  }
}

export async function bulkRemove(req: Request, res: Response, next: NextFunction) {
  try {
    const { ids } = bulkDeleteUsersSchema.parse(req.body);
    const result = await usersService.bulkDeactivateUsers(ids, req.user!.userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
