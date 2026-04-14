import { Request, Response, NextFunction } from 'express';
import { createClientSchema, updateClientSchema, addActivitySchema, bulkDeleteClientsSchema } from './clients.schema';
import * as clientsService from './clients.service';
import { getPagination, paginatedResponse } from '../../utils/pagination';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const params = getPagination(req.query as any);
    const search = req.query.search as string | undefined;
    const { clients, total } = await clientsService.listClients(
      req.ownerFilter!,
      search,
      params.page,
      params.limit,
      params.skip
    );
    res.json(paginatedResponse(clients, total, params));
  } catch (err) {
    next(err);
  }
}

export async function get(req: Request, res: Response, next: NextFunction) {
  try {
    const client = await clientsService.getClient(req.params.id, req.ownerFilter!);
    res.json(client);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createClientSchema.parse(req.body);
    const client = await clientsService.createClient(data, req.user!.userId);
    res.status(201).json(client);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const data = updateClientSchema.parse(req.body);
    const client = await clientsService.updateClient(req.params.id, data, req.ownerFilter!);
    res.json(client);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await clientsService.deleteClient(req.params.id, req.ownerFilter!);
    res.json({ message: 'Cliente removido' });
  } catch (err) {
    next(err);
  }
}

export async function bulkRemove(req: Request, res: Response, next: NextFunction) {
  try {
    const { ids } = bulkDeleteClientsSchema.parse(req.body);
    const result = await clientsService.bulkDeleteClients(ids, req.ownerFilter!);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getActivities(req: Request, res: Response, next: NextFunction) {
  try {
    const activities = await clientsService.getClientActivities(req.params.id, req.ownerFilter!);
    res.json(activities);
  } catch (err) {
    next(err);
  }
}

export async function addActivity(req: Request, res: Response, next: NextFunction) {
  try {
    const data = addActivitySchema.parse(req.body);
    const activity = await clientsService.addClientActivity(
      req.params.id,
      data,
      req.user!.userId,
      req.ownerFilter!
    );
    res.status(201).json(activity);
  } catch (err) {
    next(err);
  }
}
