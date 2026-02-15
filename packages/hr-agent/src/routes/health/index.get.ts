import type { Request, Response } from 'express';
import Result from '../../utils/Result.js';

export default function healthRoute(_req: Request, res: Response): void {
  res.json(new Result({ status: 'ok' }));
}
