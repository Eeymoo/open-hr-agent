import type { Request, Response } from 'express';
import Result from '../../../utils/Result.js';
import { getPrismaClient } from '../../../utils/database.js';

const HTTP = {
  BAD_REQUEST: 400,
  INTERNAL_SERVER_ERROR: 500
};

interface TaskOrder {
  taskId: number;
  priority: number;
}

interface ReorderTasksBody {
  taskOrders: TaskOrder[];
}

export default async function reorderTasksRoute(req: Request, res: Response): Promise<void> {
  const prisma = getPrismaClient();
  const body = req.body as ReorderTasksBody;

  if (!body.taskOrders || !Array.isArray(body.taskOrders) || body.taskOrders.length === 0) {
    res.json(
      new Result().error(HTTP.BAD_REQUEST, 'taskOrders is required and must be a non-empty array')
    );
    return;
  }

  for (const item of body.taskOrders) {
    if (typeof item.taskId !== 'number' || typeof item.priority !== 'number') {
      res.json(
        new Result().error(
          HTTP.BAD_REQUEST,
          'Each item must have taskId (number) and priority (number)'
        )
      );
      return;
    }
  }

  try {
    const timestamp = Math.floor(Date.now() / 1000);
    await prisma.$transaction(
      body.taskOrders.map((item) =>
        prisma.task.update({
          where: { id: item.taskId },
          data: {
            priority: item.priority,
            updatedAt: timestamp
          }
        })
      )
    );

    res.json(new Result(null));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.json(
      new Result().error(HTTP.INTERNAL_SERVER_ERROR, `Failed to reorder tasks: ${errorMessage}`)
    );
  }
}
