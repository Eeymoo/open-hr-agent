import { BaseTask, type TaskResult, type TaskContext } from './baseTask.js';
import { TASK_EVENTS } from '../config/taskEvents.js';
import { getPrismaClient, getCurrentTimestamp } from '../utils/database.js';
import { getContainerByName } from '../utils/docker/getContainer.js';
import Docker from 'dockerode';

const docker = new Docker();

export class ContainerStopTask extends BaseTask {
  readonly name = 'container_stop';
  readonly dependencies: string[] = [];
  readonly needsCA = false;

  async execute(params: Record<string, unknown>, context: TaskContext): Promise<TaskResult> {
    await this.validateParams(params, ['caId', 'caName']);

    const { caId, caName } = params as { caId: number; caName: string };
    const prisma = getPrismaClient();

    await this.logger.info(context.taskId, this.name, '开始停止容器', { caId, caName });

    await this.emitTaskEvent(TASK_EVENTS.CONTAINER_STOPPING, { caId, caName });

    try {
      const caRecord = await prisma.codingAgent.findUnique({
        where: { id: caId }
      });

      if (!caRecord) {
        throw new Error(`CA 记录不存在: ${caId}`);
      }

      if (caRecord.status !== 'pending_stop') {
        await this.logger.warn(context.taskId, this.name, 'CA 状态不是 pending_stop，跳过停止', {
          caId,
          currentStatus: caRecord.status
        });
        return {
          success: true,
          data: { caId, caName, skipped: true, reason: 'status_not_pending_stop' }
        };
      }

      const container = await getContainerByName(caName);

      if (!container) {
        await this.logger.warn(context.taskId, this.name, '容器不存在，直接更新状态', { caName });
        await prisma.codingAgent.update({
          where: { id: caId },
          data: {
            status: 'not_found',
            containerId: null,
            updatedAt: getCurrentTimestamp()
          }
        });
        return {
          success: true,
          data: { caId, caName, containerNotFound: true }
        };
      }

      const dockerContainer = docker.getContainer(container.id);
      await dockerContainer.stop();

      await prisma.codingAgent.update({
        where: { id: caId },
        data: {
          status: 'idle',
          updatedAt: getCurrentTimestamp()
        }
      });

      await this.logger.info(context.taskId, this.name, '容器停止成功', { caId, caName });

      await this.emitTaskEvent(TASK_EVENTS.CONTAINER_STOPPED, { caId, caName });

      return {
        success: true,
        data: { caId, caName, containerId: container.id }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.logger.error(context.taskId, this.name, `容器停止失败: ${errorMessage}`, {
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
        operation: 'stop',
        error: errorMessage
      });

      return {
        success: false,
        error: errorMessage
      };
    }
  }
}
