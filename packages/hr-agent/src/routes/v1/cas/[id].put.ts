import type { Request, Response } from 'express';
import Result from '../../../utils/Result.js';
import { getPrismaClient, setTimestamps, getCurrentTimestamp } from '../../../utils/database.js';
import { createCALog } from '../../../services/caLogger.js';
import { CONTAINER_TASK_PRIORITIES } from '../../../config/taskPriorities.js';

declare global {
  var taskManager: import('../../../services/taskManager.js').TaskManager;
}

const HTTP = {
  BAD_REQUEST: 400,
  INTERNAL_SERVER_ERROR: 500,
  NOT_FOUND: 404
};

interface UpdateCABody {
  containerId?: string;
  status?: string;
  dockerConfig?: unknown;
}

export default async function updateCodingAgentRoute(req: Request, res: Response): Promise<void> {
  const prisma = getPrismaClient();
  const { id } = req.params;
  const body = req.body as UpdateCABody;

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

    const updateData: Record<string, unknown> = {};
    const logEntries: Array<{ action: string; oldValue?: string; newValue?: string }> = [];
    let needsContainerUpdate = false;
    const dockerConfig = body.dockerConfig as Record<string, unknown> | undefined;

    if (body.containerId !== undefined) {
      if (existingCA.containerId !== body.containerId) {
        logEntries.push({
          action: 'UPDATE_CONTAINER_ID',
          oldValue: existingCA.containerId ?? undefined,
          newValue: body.containerId
        });
      }
      updateData.containerId = body.containerId;
    }

    if (body.status !== undefined) {
      if (existingCA.status !== body.status) {
        logEntries.push({
          action: 'UPDATE_STATUS',
          oldValue: existingCA.status,
          newValue: body.status
        });
      }
      updateData.status = body.status;
    }

    if (dockerConfig !== undefined) {
      const configChanged =
        JSON.stringify(existingCA.dockerConfig) !== JSON.stringify(dockerConfig);
      if (configChanged && existingCA.containerId) {
        needsContainerUpdate = true;
        logEntries.push({
          action: 'UPDATE_DOCKER_CONFIG',
          oldValue: JSON.stringify(existingCA.dockerConfig),
          newValue: JSON.stringify(dockerConfig)
        });
      }
      updateData.dockerConfig = dockerConfig;
    }

    if (Object.keys(updateData).length === 0) {
      res.json(new Result().error(HTTP.BAD_REQUEST, 'No fields to update'));
      return;
    }

    if (needsContainerUpdate) {
      const now = getCurrentTimestamp();
      updateData.status = 'pending_update';
      updateData.updatedAt = now;
    } else {
      setTimestamps(updateData as { updatedAt: number }, true);
    }

    const ca = await prisma.codingAgent.update({
      where: { id: idValue },
      data: updateData
    });

    for (const logEntry of logEntries) {
      await createCALog(ca.id, logEntry.action, logEntry.oldValue, logEntry.newValue);
    }

    if (needsContainerUpdate) {
      const manager = global.taskManager;
      if (!manager) {
        res.json(new Result().error(HTTP.INTERNAL_SERVER_ERROR, 'TaskManager 未初始化'));
        return;
      }

      const taskId = await manager.run(
        'container_update',
        {
          caId: ca.id,
          caName: ca.caName,
          dockerConfig
        },
        CONTAINER_TASK_PRIORITIES.UPDATE
      );

      res.json(
        new Result({
          ...ca,
          taskId,
          message: 'Container update task queued'
        })
      );
      return;
    }

    res.json(new Result(ca));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.json(
      new Result().error(
        HTTP.INTERNAL_SERVER_ERROR,
        `Failed to update coding agent: ${errorMessage}`
      )
    );
  }
}
