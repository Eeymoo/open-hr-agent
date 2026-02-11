import type { Request, Response } from 'express';
import Result from '../../../utils/Result.js';
import { getPrismaClient, setTimestamps } from '../../../utils/database.js';
import { createCALog } from '../../../services/caLogger.js';

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
    if (body.dockerConfig !== undefined) {
      logEntries.push({
        action: 'UPDATE_DOCKER_CONFIG',
        oldValue: JSON.stringify(existingCA.dockerConfig),
        newValue: JSON.stringify(body.dockerConfig)
      });
      updateData.dockerConfig = body.dockerConfig;
    }

    if (Object.keys(updateData).length === 0) {
      res.json(new Result().error(HTTP.BAD_REQUEST, 'No fields to update'));
      return;
    }

    const ca = await prisma.codingAgent.update({
      where: { id: idValue },
      data: setTimestamps(updateData as { updatedAt: number }, true)
    });

    for (const logEntry of logEntries) {
      await createCALog(ca.id, logEntry.action, logEntry.oldValue, logEntry.newValue);
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
