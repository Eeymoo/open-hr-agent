import type { Request, Response } from 'express';
import Result from '../../../../utils/Result.js';
import { getPrismaClient } from '../../../../utils/database.js';
import { CONTAINER_TASK_PRIORITIES } from '../../../../config/taskPriorities.js';

declare global {
  var taskManager: import('../../../../services/taskManager.js').TaskManager;
}

const HTTP = {
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
};

export default async function syncCARoute(req: Request, res: Response): Promise<void> {
  const prisma = getPrismaClient();
  const { id } = req.params;

  try {
    const idValue = parseInt(Array.isArray(id) ? id[0] : id, 10);

    if (isNaN(idValue)) {
      res.json(new Result().error(HTTP.BAD_REQUEST, 'Invalid ID'));
      return;
    }

    const existingCA = await prisma.codingAgent.findFirst({
      where: {
        id: idValue,
        deletedAt: -2
      }
    });

    if (!existingCA) {
      res.json(new Result().error(HTTP.NOT_FOUND, 'Coding agent not found'));
      return;
    }

    const manager = global.taskManager;
    if (!manager) {
      res.json(new Result().error(HTTP.INTERNAL_SERVER_ERROR, 'TaskManager 未初始化'));
      return;
    }

    const taskId = await manager.run(
      'container_sync',
      {
        caId: existingCA.id,
        caName: existingCA.caName
      },
      CONTAINER_TASK_PRIORITIES.SYNC
    );

    res.json(
      new Result({
        caId: existingCA.id,
        caName: existingCA.caName,
        taskId,
        message: 'Container sync task queued'
      })
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.json(
      new Result().error(HTTP.INTERNAL_SERVER_ERROR, `Failed to sync container: ${errorMessage}`)
    );
  }
}
