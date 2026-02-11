import type { Request, Response } from 'express';
import Result from '../../../../utils/Result.js';
import { getPrismaClient, setTimestamps } from '../../../../utils/database.js';

const HTTP = {
  BAD_REQUEST: 400,
  INTERNAL_SERVER_ERROR: 500,
  NOT_FOUND: 404
};

interface AssignTaskBody {
  caId: number;
}

export default async function assignTaskRoute(req: Request, res: Response): Promise<void> {
  const prisma = getPrismaClient();
  const { id } = req.params;
  const body = req.body as AssignTaskBody;

  if (!body.caId) {
    res.json(new Result().error(HTTP.BAD_REQUEST, 'caId is required'));
    return;
  }

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

    const task = await prisma.task.update({
      where: { id: idValue },
      data: setTimestamps({ caId: body.caId, updatedAt: 0 } as { updatedAt: number }, true)
    });

    res.json(new Result(task));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.json(
      new Result().error(HTTP.INTERNAL_SERVER_ERROR, `Failed to assign task: ${errorMessage}`)
    );
  }
}
