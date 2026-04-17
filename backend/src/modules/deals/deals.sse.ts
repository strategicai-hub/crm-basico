import { Request, Response } from 'express';
import { verifyAccessToken } from '../../utils/jwt';
import { dealsBus, DealsEvent } from '../../events/dealsBus';

export function dealsStream(req: Request, res: Response) {
  const token =
    (typeof req.query.token === 'string' && req.query.token) ||
    (req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1]
      : '');

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  try {
    verifyAccessToken(token);
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  res.write(`event: ready\ndata: {}\n\n`);

  const onChange = (payload: DealsEvent) => {
    res.write(`event: deals:changed\ndata: ${JSON.stringify(payload)}\n\n`);
  };

  const heartbeat = setInterval(() => {
    res.write(`: ping\n\n`);
  }, 25000);

  dealsBus.on('changed', onChange);

  req.on('close', () => {
    clearInterval(heartbeat);
    dealsBus.off('changed', onChange);
    res.end();
  });
}
