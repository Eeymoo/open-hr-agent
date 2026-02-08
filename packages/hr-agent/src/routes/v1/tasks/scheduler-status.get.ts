import type { Request, Response } from 'express';
import Result from '../../../utils/Result.js';

const HTTP = {
  INTERNAL_SERVER_ERROR: 500
};

declare global {
  var taskManager: import('../../../services/taskManager.js').TaskManager;
}

export default async function schedulerStatusRoute(_req: Request, res: Response): Promise<void> {
  try {
    const manager = global.taskManager;

    if (!manager) {
      res.json(new Result().error(HTTP.INTERNAL_SERVER_ERROR, 'TaskManager 未初始化'));
      return;
    }

    const status = await manager.getStatus();

    res.json(new Result(status));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.json(
      new Result().error(
        HTTP.INTERNAL_SERVER_ERROR,
        `Failed to get scheduler status: ${errorMessage}`
      )
    );
  }
}
