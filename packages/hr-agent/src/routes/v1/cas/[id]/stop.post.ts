import type { Request, Response } from 'express';
import Result from '../../../../utils/Result.js';
import { getPrismaClient, getCurrentTimestamp } from '../../../../utils/database.js';
import { CONTAINER_TASK_PRIORITIES } from '../../../../config/taskPriorities.js';

declare global {
  var taskManager: import('../../../../services/taskManager.js').TaskManager;
}

const HTTP = {
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
};

export default async function stopCARoute(req: Request, res: Response): Promise<void> {
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

    if (!existingCA.containerId) {
      res.json(new Result().error(HTTP.BAD_REQUEST, 'No container associated with this CA'));
      return;
    }

    const now = getCurrentTimestamp();
    await prisma.codingAgent.update({
      where: { id: idValue },
      data: {
        status: 'pending_stop',
        updatedAt: now
      }
    });

    const manager = global.taskManager;
    if (!manager) {
      res.json(new Result().error(HTTP.INTERNAL_SERVER_ERROR, 'TaskManager 未初始化'));
      return;
    }

    const taskId = await manager.run(
      'container_stop',
      {
        caId: existingCA.id,
        caName: existingCA.caName
      },
      CONTAINER_TASK_PRIORITIES.STOP
    );

    res.json(
      new Result({
        ...existingCA,
        status: 'pending_stop',
        taskId,
        message: 'Container stop task queued'
      })
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.json(
      new Result().error(HTTP.INTERNAL_SERVER_ERROR, `Failed to stop container: ${errorMessage}`)
    );
  }
}
