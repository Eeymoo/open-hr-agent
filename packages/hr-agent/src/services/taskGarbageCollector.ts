import { getPrismaClient, getCurrentTimestamp } from '../utils/database.js';
import { TASK_STATUS } from '../config/taskStatus.js';
import { TASK_CONFIG } from '../config/taskConfig.js';
import { TaskLogger } from '../utils/taskLogger.js';

export interface GarbageCollectionStats {
  caCreationFailed: number;
  caLost: number;
  longRunningError: number;
  timeoutTasks: number;
  cancelledTasks: number;
  totalCleaned: number;
}

export class TaskGarbageCollector {
  private logger: TaskLogger;
  private readonly LONG_RUNNING_ERROR_THRESHOLD = 86400000;

  constructor() {
    this.logger = new TaskLogger();
  }

  async collect(): Promise<GarbageCollectionStats> {
    const stats: GarbageCollectionStats = {
      caCreationFailed: 0,
      caLost: 0,
      longRunningError: 0,
      timeoutTasks: 0,
      cancelledTasks: 0,
      totalCleaned: 0
    };

    const prisma = getPrismaClient();
    const now = getCurrentTimestamp();

    const caCreationFailedCount = await this.cleanupCACreationFailed(prisma, now);
    stats.caCreationFailed = caCreationFailedCount;

    const caLostCount = await this.cleanupCALostTasks(prisma, now);
    stats.caLost = caLostCount;

    const longRunningErrorCount = await this.cleanupLongRunningErrorTasks(prisma, now);
    stats.longRunningError = longRunningErrorCount;

    const timeoutTaskCount = await this.cleanupTimeoutTasks(prisma, now);
    stats.timeoutTasks = timeoutTaskCount;

    const cancelledTaskCount = await this.cleanupCancelledTasks(prisma, now);
    stats.cancelledTasks = cancelledTaskCount;

    stats.totalCleaned =
      stats.caCreationFailed +
      stats.caLost +
      stats.longRunningError +
      stats.timeoutTasks +
      stats.cancelledTasks;

    if (stats.totalCleaned > 0) {
      await this.logger.info(0, 'GarbageCollector', `垃圾回收完成`, stats as unknown as Record<string, unknown>);
    }

    return stats;
  }

  private async cleanupCACreationFailed(prisma: unknown, now: number): Promise<number> {
    const errorCA = await (
      prisma as { codingAgent: { findMany: (args: unknown) => Promise<unknown[]> } }
    ).codingAgent.findMany({
      where: {
        status: 'error',
        deletedAt: -2
      }
    });

    const caIds = errorCA.map((ca) => (ca as { id: number }).id);

    if (caIds.length === 0) {
      return 0;
    }

    const tasks = await (
      prisma as { task: { findMany: (args: unknown) => Promise<unknown[]> } }
    ).task.findMany({
      where: {
        caId: { in: caIds },
        status: { in: [TASK_STATUS.ERROR, TASK_STATUS.RUNNING, TASK_STATUS.RETRYING] },
        deletedAt: -2
      }
    });

    let cleaned = 0;

    for (const task of tasks) {
      const taskId = (task as { id: number }).id;
      const taskType = (task as { type: string }).type;

      const existingMetadata = (task as { metadata: Record<string, unknown> | unknown }).metadata;
      const metadataObj = typeof existingMetadata === 'object' && existingMetadata !== null ? existingMetadata : {};

      await (prisma as { task: { update: (args: unknown) => Promise<unknown> } }).task.update({
        where: { id: taskId },
        data: {
          status: TASK_STATUS.ERROR,
          metadata: {
            ...metadataObj,
            garbageCollected: true,
            reason: 'CA创建失败'
          },
          completedAt: now,
          deletedAt: now,
          updatedAt: now
        }
      });

      await this.logger.warn(taskId, taskType, '任务被垃圾回收: CA创建失败');

      cleaned++;
    }

    return cleaned;
  }

  private async cleanupCALostTasks(prisma: unknown, now: number): Promise<number> {
    const allCA = await (
      prisma as { codingAgent: { findMany: (args: unknown) => Promise<unknown[]> } }
    ).codingAgent.findMany({
      where: {
        deletedAt: -2
      }
    });

    const lostCAIds: number[] = [];

    for (const ca of allCA) {
      const caRecord = ca as {
        id: number;
        status: string;
        containerId: string | null;
        createdAt: number;
      };

      const isOldAndCreating =
        caRecord.status === 'creating' && now - caRecord.createdAt > TASK_CONFIG.TASK_TIMEOUT;

      const isIdleWithoutContainer = caRecord.status === 'idle' && !caRecord.containerId;

      if (isOldAndCreating || isIdleWithoutContainer) {
        lostCAIds.push(caRecord.id);
      }
    }

    if (lostCAIds.length === 0) {
      return 0;
    }

    const tasks = await (
      prisma as { task: { findMany: (args: unknown) => Promise<unknown[]> } }
    ).task.findMany({
      where: {
        caId: { in: lostCAIds },
        status: { in: [TASK_STATUS.QUEUED, TASK_STATUS.RUNNING, TASK_STATUS.RETRYING] },
        deletedAt: -2
      }
    });

    let cleaned = 0;

    for (const task of tasks) {
      const taskId = (task as { id: number }).id;
      const taskType = (task as { type: string }).type;
      const taskCAId = (task as { caId?: number }).caId;

      const existingMetadata = (task as { metadata: Record<string, unknown> | unknown }).metadata;
      const metadataObj = typeof existingMetadata === 'object' && existingMetadata !== null ? existingMetadata : {};

      await (prisma as { task: { update: (args: unknown) => Promise<unknown> } }).task.update({
        where: { id: taskId },
        data: {
          status: TASK_STATUS.ERROR,
          metadata: {
            ...metadataObj,
            garbageCollected: true,
            reason: 'CA丢失'
          },
          completedAt: now,
          deletedAt: now,
          updatedAt: now
        }
      });

      if (taskCAId) {
        await (
          prisma as { codingAgent: { update: (args: unknown) => Promise<unknown> } }
        ).codingAgent.update({
          where: { id: taskCAId },
          data: {
            status: 'error',
            updatedAt: now
          }
        });
      }

      await this.logger.warn(taskId, taskType, '任务被垃圾回收: CA丢失');

      cleaned++;
    }

    return cleaned;
  }

  private async cleanupLongRunningErrorTasks(prisma: unknown, now: number): Promise<number> {
    const errorTasks = await (
      prisma as { task: { findMany: (args: unknown) => Promise<unknown[]> } }
    ).task.findMany({
      where: {
        status: TASK_STATUS.ERROR,
        deletedAt: -2,
        createdAt: {
          lt: now - this.LONG_RUNNING_ERROR_THRESHOLD / 1000
        }
      },
      orderBy: {
        createdAt: 'asc'
      },
      take: 10
    });

    if (errorTasks.length === 0) {
      return 0;
    }

    let cleaned = 0;

    for (const task of errorTasks) {
      const taskId = (task as { id: number }).id;
      const taskType = (task as { type: string }).type;

      await (prisma as { task: { update: (args: unknown) => Promise<unknown> } }).task.update({
        where: { id: taskId },
        data: {
          deletedAt: now,
          updatedAt: now
        }
      });

      await this.logger.warn(taskId, taskType, '任务被垃圾回收: 长期处于错误状态');

      cleaned++;
    }

    return cleaned;
  }

  private async cleanupTimeoutTasks(prisma: unknown, now: number): Promise<number> {
    const timeoutTasks = await (
      prisma as { task: { findMany: (args: unknown) => Promise<unknown[]> } }
    ).task.findMany({
      where: {
        status: TASK_STATUS.TIMEOUT,
        deletedAt: -2
      }
    });

    if (timeoutTasks.length === 0) {
      return 0;
    }

    let cleaned = 0;

    for (const task of timeoutTasks) {
      const taskId = (task as { id: number }).id;
      const taskType = (task as { type: string }).type;

      const existingMetadata = (task as { metadata: Record<string, unknown> | unknown }).metadata;
      const metadataObj = typeof existingMetadata === 'object' && existingMetadata !== null ? existingMetadata : {};

      await (prisma as { task: { update: (args: unknown) => Promise<unknown> } }).task.update({
        where: { id: taskId },
        data: {
          status: TASK_STATUS.ERROR,
          metadata: {
            ...metadataObj,
            garbageCollected: true,
            reason: '任务超时'
          },
          completedAt: now,
          deletedAt: now,
          updatedAt: now
        }
      });

      await this.logger.warn(taskId, taskType, '任务被垃圾回收: 任务超时');

      cleaned++;
    }

    return cleaned;
  }

  private async cleanupCancelledTasks(prisma: unknown, now: number): Promise<number> {
    const cancelledTasks = await (
      prisma as { task: { findMany: (args: unknown) => Promise<unknown[]> } }
    ).task.findMany({
      where: {
        status: TASK_STATUS.CANCELLED,
        deletedAt: -2
      }
    });

    if (cancelledTasks.length === 0) {
      return 0;
    }

    let cleaned = 0;

    for (const task of cancelledTasks) {
      const taskId = (task as { id: number }).id;
      const taskType = (task as { type: string }).type;

      await (prisma as { task: { update: (args: unknown) => Promise<unknown> } }).task.update({
        where: { id: taskId },
        data: {
          completedAt: now,
          deletedAt: now,
          updatedAt: now
        }
      });

      await this.logger.info(taskId, taskType, '任务被垃圾回收: 已取消');

      cleaned++;
    }

    return cleaned;
  }
}
