import type { Request, Response } from 'express';
import Result from '../../../../utils/Result.js';
import { getPrismaClient, setDeletedAt } from '../../../../utils/database.js';

const HTTP = {
  BAD_REQUEST: 400,
  INTERNAL_SERVER_ERROR: 500,
  NOT_FOUND: 404
};

export default async function deleteTaskRoute(req: Request, res: Response): Promise<void> {
  const prisma = getPrismaClient();
  const { id } = req.params;

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
      data: setDeletedAt({ deletedAt: 0 })
    });

    res.json(new Result(task));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.json(
      new Result().error(HTTP.INTERNAL_SERVER_ERROR, `Failed to delete task: ${errorMessage}`)
    );
  }
}
