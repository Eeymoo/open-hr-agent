import type { Request, Response } from 'express';
import Result from '../../../utils/Result.js';
import { getPrismaClient } from '../../../utils/database.js';

declare global {
  var taskManager: import('../../../services/taskManager.js').TaskManager;
}

const HTTP = {
  BAD_REQUEST: 400,
  INTERNAL_SERVER_ERROR: 500
};

interface CreateTaskBody {
  type: string;
  status?: string;
  priority?: number;
  tags?: string[];
  issueId?: number;
  prId?: number;
  caId?: number;
  metadata?: Record<string, unknown>;
}

export default async function createTaskRoute(req: Request, res: Response): Promise<void> {
  const prisma = getPrismaClient();
  const body = req.body as CreateTaskBody;

  if (!body.type) {
    res.json(new Result().error(HTTP.BAD_REQUEST, 'type is required'));
    return;
  }

  try {
    const manager = global.taskManager;

    if (!manager) {
      res.json(new Result().error(HTTP.INTERNAL_SERVER_ERROR, 'TaskManager 未初始化'));
      return;
    }

    const params = body.metadata ?? {};
    const taskId = await manager.run(
      body.type,
      params,
      body.priority ?? 0,
      body.issueId,
      body.prId
    );

    const task = await prisma.task.findUnique({
      where: { id: taskId }
    });

    res.json(new Result(task));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.json(
      new Result().error(HTTP.INTERNAL_SERVER_ERROR, `Failed to create task: ${errorMessage}`)
    );
  }
}
