import type { Request, Response } from 'express';
import Result from '../../../utils/Result.js';
import { TASK_CONFIG } from '../../../config/taskConfig.js';

const HTTP = {
  INTERNAL_SERVER_ERROR: 500
};

declare global {
  var taskManager: import('../../../services/taskManager.js').TaskManager;
}

export default async function caStatusRoute(_req: Request, res: Response): Promise<void> {
  try {
    const manager = global.taskManager;

    if (!manager) {
      res.json(new Result().error(HTTP.INTERNAL_SERVER_ERROR, 'TaskManager 未初始化'));
      return;
    }

    const scheduler = await manager.getStatus();
    const prisma = await import('@prisma/client').then((m) => new m.PrismaClient());

    const caList = await prisma.codingAgent.findMany({
      where: {
        deletedAt: -2
      },
      include: {
        tasks: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const caDetails = caList.map((ca) => ({
      id: ca.id,
      caName: ca.caName,
      containerId: ca.containerId,
      status: ca.status,
      createdAt: ca.createdAt,
      updatedAt: ca.updatedAt,
      currentTaskId: ca.tasks[0]?.id,
      currentTaskType: ca.tasks[0]?.type,
      issueNumber: ca.caName.replace(TASK_CONFIG.CA_NAME_PREFIX, '')
        ? parseInt(ca.caName.replace(TASK_CONFIG.CA_NAME_PREFIX, ''), 10)
        : undefined
    }));

    res.json(
      new Result({
        caPool: scheduler.caPool,
        caList: caDetails
      })
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.json(
      new Result().error(HTTP.INTERNAL_SERVER_ERROR, `Failed to get CA status: ${errorMessage}`)
    );
  }
}
