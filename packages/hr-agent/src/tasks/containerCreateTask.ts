import { BaseTask, type TaskResult, type TaskContext } from './baseTask.js';
import { TASK_EVENTS } from '../config/taskEvents.js';
import { TASK_TAGS } from '../config/taskTags.js';
import { getPrismaClient, getCurrentTimestamp } from '../utils/database.js';
import { createContainer } from '../utils/docker/createContainer.js';

export class ContainerCreateTask extends BaseTask {
  readonly name = 'container_create';
  readonly dependencies: string[] = [];
  readonly tags = [TASK_TAGS.MANAGES_CA];

  async execute(params: Record<string, unknown>, context: TaskContext): Promise<TaskResult> {
    await this.validateParams(params, ['caId', 'caName']);

    const { caId, caName } = params as { caId: number; caName: string };
    const prisma = getPrismaClient();
    const now = getCurrentTimestamp();

    await this.logger.info(context.taskId, this.name, '开始创建容器', { caId, caName });

    await this.emitTaskEvent(TASK_EVENTS.CONTAINER_CREATING, { caId, caName });

    try {
      const caRecord = await prisma.codingAgent.findUnique({
        where: { id: caId }
      });

      if (!caRecord) {
        throw new Error(`CA 记录不存在: ${caId}`);
      }

      if (caRecord.status !== 'pending_create') {
        await this.logger.warn(context.taskId, this.name, 'CA 状态不是 pending_create，跳过创建', {
          caId,
          currentStatus: caRecord.status
        });
        return {
          success: true,
          data: { caId, caName, skipped: true, reason: 'status_not_pending_create' }
        };
      }

      await prisma.codingAgent.update({
        where: { id: caId },
        data: { status: 'creating', updatedAt: now }
      });

      const dockerConfig = caRecord.dockerConfig as { repoUrl?: string } | null;
      const repoUrl = dockerConfig?.repoUrl;

      const containerId = await createContainer(caName, repoUrl);

      await prisma.codingAgent.update({
        where: { id: caId },
        data: {
          containerId,
          status: 'idle',
          updatedAt: getCurrentTimestamp()
        }
      });

      await this.logger.info(context.taskId, this.name, '容器创建成功', {
        caId,
        caName,
        containerId
      });

      await this.emitTaskEvent(TASK_EVENTS.CONTAINER_CREATED, { caId, caName, containerId });

      return {
        success: true,
        data: { caId, caName, containerId }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.logger.error(context.taskId, this.name, `容器创建失败: ${errorMessage}`, {
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
        operation: 'create',
        error: errorMessage
      });

      return {
        success: false,
        error: errorMessage
      };
    }
  }
}
