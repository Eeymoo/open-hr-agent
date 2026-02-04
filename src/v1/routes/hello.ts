import type { Request, Response } from 'express';
import Result from '../../utils/Result.js';

export default function helloRoute(_req: Request, res: Response): void {
  res.json(new Result({ message: 'Hello from API' }));
}
