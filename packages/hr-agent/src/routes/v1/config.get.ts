import type { Request, Response } from 'express';
import Result from '../../utils/Result.js';
import { TASK_CONFIG } from '../../config/taskConfig.js';

export default function configRoute(_req: Request, res: Response): void {
  res.json(
    new Result({
      caNamePrefix: TASK_CONFIG.CA_NAME_PREFIX
    })
  );
}
