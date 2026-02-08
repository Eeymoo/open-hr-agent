import type { Request, Response } from 'express';
import Result from '../../../utils/Result.js';

const HTTP = {
  BAD_REQUEST: 400,
  INTERNAL_SERVER_ERROR: 500
};

interface ExecuteTaskBody {
  taskName?: string;
  uri?: string;
  params: Record<string, unknown>;
  priority?: number;
  issueId?: number;
  prId?: number;
}

declare global {
  var taskManager: import('../../../services/taskManager.js').TaskManager;
}

export default async function executeTaskRoute(req: Request, res: Response): Promise<void> {
  const body = req.body as ExecuteTaskBody;

  if (!body.taskName && !body.uri) {
    res.json(new Result().error(HTTP.BAD_REQUEST, 'taskName 或 uri 必须提供一个'));
    return;
  }

  if (!body.params) {
    res.json(new Result().error(HTTP.BAD_REQUEST, 'params 是必需的'));
    return;
  }

  try {
    const manager = global.taskManager;

    if (!manager) {
      res.json(new Result().error(HTTP.INTERNAL_SERVER_ERROR, 'TaskManager 未初始化'));
      return;
    }

    let taskId: number;

    if (body.taskName) {
      taskId = await manager.run(
        body.taskName,
        body.params,
        body.priority,
        body.issueId,
        body.prId
      );
    } else if (body.uri) {
      taskId = await manager.apiRun(body.uri, body.params);
    } else {
      res.json(new Result().error(HTTP.BAD_REQUEST, 'taskName 或 uri 必须提供一个'));
      return;
    }

    res.json(
      new Result({
        taskId,
        message: '任务已加入队列'
      })
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.json(
      new Result().error(HTTP.INTERNAL_SERVER_ERROR, `Failed to execute task: ${errorMessage}`)
    );
  }
}
