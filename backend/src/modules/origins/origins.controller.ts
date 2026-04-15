import { Request, Response, NextFunction } from 'express';
import { createOriginSchema } from './origins.schema';
import * as originsService from './origins.service';

export async function list(_req: Request, res: Response, next: NextFunction) {
  try {
    const origins = await originsService.listOrigins();
    res.json(origins);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createOriginSchema.parse(req.body);
    const origin = await originsService.createOrigin(data);
    res.status(201).json(origin);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await originsService.deleteOrigin(req.params.id);
    res.json({ message: 'Origem removida' });
  } catch (err) {
    next(err);
  }
}
