import type { Request, Response } from 'express';
import Result from '../../../utils/Result.js';

export default function idRoute(req: Request, res: Response): void {
  res.json(new Result({ id: req.params.id }));
}
