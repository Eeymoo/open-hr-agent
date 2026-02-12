import { BaseTask, type TaskResult, type TaskContext } from './baseTask.js';
import { TASK_EVENTS } from '../config/taskEvents.js';
import { TASK_TAGS } from '../config/taskTags.js';
import { getPrismaClient, getCurrentTimestamp } from '../utils/database.js';
import { getContainerByName } from '../utils/docker/getContainer.js';
import { restartContainer } from '../utils/docker/updateContainer.js';

export class ContainerRestartTask extends BaseTask {
  readonly name = 'container_restart';
  readonly dependencies: string[] = [];
  readonly tags = [TASK_TAGS.MANAGES_CA];

  async execute(params: Record<string, unknown>, context: TaskContext): Promise<TaskResult> {
    await this.validateParams(params, ['caId', 'caName']);

    const { caId, caName } = params as { caId: number; caName: string };
    const prisma = getPrismaClient();

    await this.logger.info(context.taskId, this.name, '开始重启容器', { caId, caName });

    await this.emitTaskEvent(TASK_EVENTS.CONTAINER_RESTARTING, { caId, caName });

    try {
      const caRecord = await prisma.codingAgent.findUnique({
        where: { id: caId }
      });

      if (!caRecord) {
        throw new Error(`CA 记录不存在: ${caId}`);
      }

      if (caRecord.status !== 'pending_restart') {
        await this.logger.warn(context.taskId, this.name, 'CA 状态不是 pending_restart，跳过重启', {
          caId,
          currentStatus: caRecord.status
        });
        return {
          success: true,
          data: { caId, caName, skipped: true, reason: 'status_not_pending_restart' }
        };
      }

      const container = await getContainerByName(caName);

      if (!container) {
        throw new Error(`容器不存在: ${caName}`);
      }

      await restartContainer(caName);

      await prisma.codingAgent.update({
        where: { id: caId },
        data: {
          status: 'idle',
          updatedAt: getCurrentTimestamp()
        }
      });

      await this.logger.info(context.taskId, this.name, '容器重启成功', { caId, caName });

      await this.emitTaskEvent(TASK_EVENTS.CONTAINER_RESTARTED, { caId, caName });

      return {
        success: true,
        data: { caId, caName, containerId: container.id }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.logger.error(context.taskId, this.name, `容器重启失败: ${errorMessage}`, {
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
        operation: 'restart',
        error: errorMessage
      });

      return {
        success: false,
        error: errorMessage
      };
    }
  }
}
