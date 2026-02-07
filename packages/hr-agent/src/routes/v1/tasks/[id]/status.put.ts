import type { Request, Response } from 'express';
import Result from '../../../../utils/Result.js';
import { getPrismaClient, setTimestamps, getCurrentTimestamp } from '../../../../utils/database.js';
import { VALID_TASK_STATUSES } from '../../../../config/taskStatus.js';

const HTTP = {
  BAD_REQUEST: 400,
  INTERNAL_SERVER_ERROR: 500,
  NOT_FOUND: 404
};

interface UpdateTaskStatusBody {
  status: string;
}

export default async function updateTaskStatusRoute(req: Request, res: Response): Promise<void> {
  const prisma = getPrismaClient();
  const { id } = req.params;
  const body = req.body as UpdateTaskStatusBody;

  if (!body.status) {
    res.json(new Result().error(HTTP.BAD_REQUEST, 'status is required'));
    return;
  }

  if (!VALID_TASK_STATUSES.includes(body.status as (typeof VALID_TASK_STATUSES)[number])) {
    res.json(
      new Result().error(
        HTTP.BAD_REQUEST,
        `Invalid status. Valid statuses are: ${VALID_TASK_STATUSES.join(', ')}`
      )
    );
    return;
  }

  try {
    const idValue = parseInt(Array.isArray(id) ? id[0] : id, 10);
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

    const updateData: Record<string, unknown> = { status: body.status };

    if (body.status === 'pr_merged') {
      updateData.completedAt = getCurrentTimestamp();
    }

    const task = await prisma.task.update({
      where: { id: idValue },
      data: setTimestamps(updateData as { updatedAt: number }, true)
    });

    res.json(new Result(task));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.json(
      new Result().error(
        HTTP.INTERNAL_SERVER_ERROR,
        `Failed to update task status: ${errorMessage}`
      )
    );
  }
}
