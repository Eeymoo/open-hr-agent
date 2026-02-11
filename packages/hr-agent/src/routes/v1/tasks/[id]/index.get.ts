import type { Request, Response } from 'express';
import Result from '../../../../utils/Result.js';
import { getPrismaClient } from '../../../../utils/database.js';

const HTTP = {
  BAD_REQUEST: 400,
  INTERNAL_SERVER_ERROR: 500,
  NOT_FOUND: 404
};

/**
 * GET /v1/tasks/:id - 根据ID获取任务路由
 * @param req - Express 请求对象
 * @param res - Express 响应对象
 */
export default async function getTaskByIdRoute(req: Request, res: Response): Promise<void> {
  const prisma = getPrismaClient();
  const { id } = req.params;

  const idValue = parseInt(Array.isArray(id) ? id[0] : id, 10);

  if (isNaN(idValue)) {
    res.json(new Result().error(HTTP.BAD_REQUEST, 'Invalid task ID'));
    return;
  }

  try {
    const task = await prisma.task.findFirst({
      where: {
        id: idValue,
        deletedAt: -2
      },
      include: {
        issue: true,
        pullRequest: true,
        codingAgent: true
      }
    });

    if (!task) {
      res.json(new Result().error(HTTP.NOT_FOUND, 'Task not found'));
      return;
    }

    res.json(new Result(task));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.json(
      new Result().error(HTTP.INTERNAL_SERVER_ERROR, `Failed to fetch task: ${errorMessage}`)
    );
  }
}
