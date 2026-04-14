import { Request, Response, NextFunction } from 'express';
import { createDealSchema, updateDealSchema, moveDealSchema, bulkDeleteDealsSchema } from './deals.schema';
import * as dealsService from './deals.service';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const stages = await dealsService.listDeals(req.ownerFilter!);
    res.json(stages);
  } catch (err) {
    next(err);
  }
}

export async function get(req: Request, res: Response, next: NextFunction) {
  try {
    const deal = await dealsService.getDeal(req.params.id, req.ownerFilter!);
    res.json(deal);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createDealSchema.parse(req.body);
    const deal = await dealsService.createDeal(data, req.user!.userId);
    res.status(201).json(deal);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const data = updateDealSchema.parse(req.body);
    const deal = await dealsService.updateDeal(req.params.id, data, req.ownerFilter!);
    res.json(deal);
  } catch (err) {
    next(err);
  }
}

export async function move(req: Request, res: Response, next: NextFunction) {
  try {
    const data = moveDealSchema.parse(req.body);
    const deal = await dealsService.moveDeal(req.params.id, data, req.user!.userId, req.ownerFilter!);
    res.json(deal);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await dealsService.deleteDeal(req.params.id, req.ownerFilter!);
    res.json({ message: 'Negócio removido' });
  } catch (err) {
    next(err);
  }
}

export async function bulkRemove(req: Request, res: Response, next: NextFunction) {
  try {
    const { ids } = bulkDeleteDealsSchema.parse(req.body);
    const result = await dealsService.bulkDeleteDeals(ids, req.ownerFilter!);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
