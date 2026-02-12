import type { Request, Response } from 'express';
import Result from '../../../utils/Result.js';
import { getPrismaClient, getCurrentTimestamp } from '../../../utils/database.js';
import { createCALog } from '../../../services/caLogger.js';
import { CONTAINER_TASK_PRIORITIES } from '../../../config/taskPriorities.js';

declare global {
  var taskManager: import('../../../services/taskManager.js').TaskManager;
}

const HTTP = {
  INTERNAL_SERVER_ERROR: 500,
  NOT_FOUND: 404,
  BAD_REQUEST: 400
};

export default async function deleteCodingAgentRoute(req: Request, res: Response): Promise<void> {
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

    if (existingCA.status === 'pending_delete' || existingCA.status === 'destroying') {
      res.json(new Result().error(HTTP.BAD_REQUEST, 'Coding agent is already pending deletion'));
      return;
    }

    const now = getCurrentTimestamp();
    const ca = await prisma.codingAgent.update({
      where: { id: idValue },
      data: {
        status: 'pending_delete',
        updatedAt: now
      }
    });

    await createCALog(
      ca.id,
      'DELETE_REQUEST',
      JSON.stringify({
        caName: ca.caName,
        previousStatus: existingCA.status,
        newStatus: 'pending_delete'
      }),
      null
    );

    const manager = global.taskManager;
    if (!manager) {
      res.json(new Result().error(HTTP.INTERNAL_SERVER_ERROR, 'TaskManager 未初始化'));
      return;
    }

    const taskId = await manager.run(
      'container_delete',
      {
        caId: ca.id,
        caName: ca.caName,
        containerId: ca.containerId
      },
      CONTAINER_TASK_PRIORITIES.DELETE
    );

    res.json(
      new Result({
        ...ca,
        taskId,
        message: 'Coding agent deletion task queued'
      })
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.json(
      new Result().error(
        HTTP.INTERNAL_SERVER_ERROR,
        `Failed to delete coding agent: ${errorMessage}`
      )
    );
  }
}
