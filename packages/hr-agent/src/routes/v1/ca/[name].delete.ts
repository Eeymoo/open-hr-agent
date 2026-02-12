import type { Request, Response } from 'express';
import Result from '../../../utils/Result.js';
import { getDockerCASecret } from '../../../utils/secretManager.js';
import { getPrismaClient, getCurrentTimestamp } from '../../../utils/database.js';
import { CONTAINER_TASK_PRIORITIES } from '../../../config/taskPriorities.js';

declare global {
  var taskManager: import('../../../services/taskManager.js').TaskManager;
}

const HTTP = {
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
  UNAUTHORIZED: 401
};

export default async function deleteCARoute(req: Request, res: Response): Promise<void> {
  const { name } = req.params;

  const authHeader = req.headers['x-ca-secret'];
  if (!authHeader || authHeader !== getDockerCASecret()) {
    res.json(new Result().error(HTTP.UNAUTHORIZED, 'Unauthorized: invalid or missing secret'));
    return;
  }

  if (!name || typeof name !== 'string') {
    res.json(new Result().error(HTTP.BAD_REQUEST, 'name is required and must be a string'));
    return;
  }

  const containerName = name;
  const prisma = getPrismaClient();
  const now = getCurrentTimestamp();

  try {
    const caRecord = await prisma.codingAgent.findFirst({
      where: {
        caName: containerName,
        deletedAt: -2
      }
    });

    if (!caRecord) {
      res.json(new Result().error(HTTP.NOT_FOUND, `Coding agent ${containerName} not found`));
      return;
    }

    if (caRecord.status === 'pending_delete' || caRecord.status === 'destroying') {
      res.json(
        new Result().error(HTTP.BAD_REQUEST, 'Coding agent is already pending deletion')
      );
      return;
    }

    await prisma.codingAgent.update({
      where: { id: caRecord.id },
      data: {
        status: 'pending_delete',
        updatedAt: now
      }
    });

    const manager = global.taskManager;
    if (!manager) {
      res.json(new Result().error(HTTP.INTERNAL_SERVER_ERROR, 'TaskManager 未初始化'));
      return;
    }

    const taskId = await manager.run(
      'container_delete',
      {
        caId: caRecord.id,
        caName: containerName,
        containerId: caRecord.containerId
      },
      CONTAINER_TASK_PRIORITIES.DELETE
    );

    res.json(
      new Result({
        name,
        containerName,
        taskId,
        status: 'pending_delete',
        message: 'Container deletion task queued'
      })
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.json(
      new Result().error(
        HTTP.INTERNAL_SERVER_ERROR,
        `Failed to delete Docker container: ${errorMessage}`
      )
    );
  }
}
