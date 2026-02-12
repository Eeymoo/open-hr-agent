import { BaseTask, type TaskResult, type TaskContext } from './baseTask.js';
import { TASK_EVENTS } from '../config/taskEvents.js';
import { getPrismaClient, getCurrentTimestamp } from '../utils/database.js';
import { getContainerByName } from '../utils/docker/getContainer.js';
import { updateContainer } from '../utils/docker/updateContainer.js';
import type { Prisma } from '@prisma/client';

export class ContainerUpdateTask extends BaseTask {
  readonly name = 'container_update';
  readonly dependencies: string[] = [];
  readonly needsCA = false;

  async execute(params: Record<string, unknown>, context: TaskContext): Promise<TaskResult> {
    await this.validateParams(params, ['caId', 'caName']);

    const { caId, caName, dockerConfig } = params as {
      caId: number;
      caName: string;
      dockerConfig?: Record<string, unknown>;
    };
    const prisma = getPrismaClient();

    await this.logger.info(context.taskId, this.name, '开始更新容器配置', {
      caId,
      caName,
      dockerConfig
    });

    await this.emitTaskEvent(TASK_EVENTS.CONTAINER_UPDATING, { caId, caName, dockerConfig });

    try {
      const caRecord = await prisma.codingAgent.findUnique({
        where: { id: caId }
      });

      if (!caRecord) {
        throw new Error(`CA 记录不存在: ${caId}`);
      }

      if (caRecord.status !== 'pending_update') {
        await this.logger.warn(context.taskId, this.name, 'CA 状态不是 pending_update，跳过更新', {
          caId,
          currentStatus: caRecord.status
        });
        return {
          success: true,
          data: { caId, caName, skipped: true, reason: 'status_not_pending_update' }
        };
      }

      const container = await getContainerByName(caName);

      if (!container) {
        throw new Error(`容器不存在: ${caName}`);
      }

      if (dockerConfig) {
        await updateContainer(caName, dockerConfig);
      }

      await prisma.codingAgent.update({
        where: { id: caId },
        data: {
          status: 'idle',
          dockerConfig: (dockerConfig ?? caRecord.dockerConfig) as Prisma.InputJsonValue,
          updatedAt: getCurrentTimestamp()
        }
      });

      await this.logger.info(context.taskId, this.name, '容器配置更新成功', { caId, caName });

      await this.emitTaskEvent(TASK_EVENTS.CONTAINER_UPDATED, { caId, caName, dockerConfig });

      return {
        success: true,
        data: { caId, caName, containerId: container.id }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.logger.error(context.taskId, this.name, `容器配置更新失败: ${errorMessage}`, {
        caId,
        caName
      });

      await prisma.codingAgent.update({
        where: { id: caId },
        data: {
          status: 'error',
          updatedAt: getCurrentTimestamp()
        }
      });

      await this.emitTaskEvent(TASK_EVENTS.CONTAINER_ERROR, {
        caId,
        caName,
        operation: 'update',
        error: errorMessage
      });

      return {
        success: false,
        error: errorMessage
      };
    }
  }
}
