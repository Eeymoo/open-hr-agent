import type { Request, Response } from 'express';
import Result from '../../../../utils/Result.js';
import { getPrismaClient, setTimestamps } from '../../../../utils/database.js';

const HTTP = {
  BAD_REQUEST: 400,
  INTERNAL_SERVER_ERROR: 500,
  NOT_FOUND: 404
};

/**
 * 更新任务请求体接口
 */
interface UpdateTaskBody {
  /** 任务状态 */
  status?: string;
  /** 任务优先级 */
  priority?: number;
  /** 元数据 */
  metadata?: Record<string, unknown>;
}

/**
 * PUT /v1/tasks/:id - 更新任务路由
 * @param req - Express 请求对象
 * @param res - Express 响应对象
 */
export default async function updateTaskRoute(req: Request, res: Response): Promise<void> {
  const prisma = getPrismaClient();
  const { id } = req.params;
  const body = req.body as UpdateTaskBody;

  const idValue = parseInt(Array.isArray(id) ? id[0] : id, 10);

  if (isNaN(idValue)) {
    res.json(new Result().error(HTTP.BAD_REQUEST, 'Invalid task ID'));
    return;
  }

  try {
    const existingTask = await prisma.task.findFirst({
      where: {
        id: idValue,
        deletedAt: -2
      }
    });

    if (!existingTask) {
      res.json(new Result().error(HTTP.NOT_FOUND, 'Task not found'));
      return;
    }

    const updateData: Record<string, unknown> = {};
    if (body.status !== undefined) {
      updateData.status = body.status;
    }
    if (body.priority !== undefined) {
      updateData.priority = body.priority;
    }
    if (body.metadata !== undefined) {
      updateData.metadata = body.metadata as unknown;
    }

    if (Object.keys(updateData).length === 0) {
      res.json(new Result().error(HTTP.BAD_REQUEST, 'No fields to update'));
      return;
    }

    const task = await prisma.task.update({
      where: { id: idValue },
      data: setTimestamps({ ...updateData, updatedAt: 0 } as { updatedAt: number }, true)
    });

    res.json(new Result(task));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.json(
      new Result().error(HTTP.INTERNAL_SERVER_ERROR, `Failed to update task: ${errorMessage}`)
    );
  }
}
