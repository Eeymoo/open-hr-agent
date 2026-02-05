import { Request, Response, NextFunction } from 'express';
import { encode } from '@toon-format/toon';

const TOON_BASE_PATH = '/toon';

function toonMiddleware(req: Request, res: Response, next: NextFunction): void {
  const path = req.url || req.path;

  if (path.startsWith(TOON_BASE_PATH)) {
    const modifiedPath = path.replace(TOON_BASE_PATH, '').replace(/\/+/g, '/') || '/';
    req.url = modifiedPath;

    const originalSend = res.send.bind(res);

    res.json = function (this: Response, body: unknown): Response {
      const toonString = encode(body);
      this.set('Content-Type', 'text/plain; charset=utf-8');
      return originalSend.call(this, toonString);
    };
  }

  next();
}

export default toonMiddleware;
