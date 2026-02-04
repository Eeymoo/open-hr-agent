import type { Request, Response } from 'express';
import Result from '../../utils/Result.js';

export default function errorRoute(_req: Request, res: Response): void {
  const BAD_REQUEST_CODE = 400;
  res.json(new Result().error(BAD_REQUEST_CODE, 'Bad Request'));
}
