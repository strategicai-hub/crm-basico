import { Request, Response, NextFunction } from 'express';

export function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const key = req.headers['x-api-key'];
  if (!key || key !== process.env.INTEGRATION_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}
