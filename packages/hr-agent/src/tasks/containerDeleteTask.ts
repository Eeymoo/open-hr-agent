import { BaseTask, type TaskResult, type TaskContext } from './baseTask.js';
import { TASK_EVENTS } from '../config/taskEvents.js';
import { TASK_TAGS } from '../config/taskTags.js';
import { getPrismaClient, getCurrentTimestamp } from '../utils/database.js';
import { deleteContainer } from '../utils/docker/deleteContainer.js';

export class ContainerDeleteTask extends BaseTask {
  readonly name = 'container_delete';
  readonly dependencies: string[] = [];
  readonly tags = [TASK_TAGS.MANAGES_CA];

  async execute(params: Record<string, unknown>, context: TaskContext): Promise<TaskResult> {
    await this.validateParams(params, ['caId', 'caName']);

    const { caId, caName, containerId } = params as {
      caId: number;
      caName: string;
      containerId?: string;
    };
    const prisma = getPrismaClient();
    const now = getCurrentTimestamp();

    await this.logger.info(context.taskId, this.name, '开始删除容器', {
      caId,
      caName,
      containerId
    });

    await this.emitTaskEvent(TASK_EVENTS.CONTAINER_DELETING, { caId, caName, containerId });

    try {
      const caRecord = await prisma.codingAgent.findUnique({
        where: { id: caId }
      });

      if (!caRecord) {
        throw new Error(`CA 记录不存在: ${caId}`);
      }

      if (caRecord.status !== 'pending_delete') {
        await this.logger.warn(context.taskId, this.name, 'CA 状态不是 pending_delete，跳过删除', {
          caId,
          currentStatus: caRecord.status
        });
        return {
          success: true,
          data: { caId, caName, skipped: true, reason: 'status_not_pending_delete' }
        };
      }

      await prisma.codingAgent.update({
        where: { id: caId },
        data: { status: 'destroying', updatedAt: now }
      });

      if (caRecord.containerId) {
        try {
          await deleteContainer(caRecord.containerId, true);
          await this.logger.info(context.taskId, this.name, 'Docker 容器删除成功', {
            containerId: caRecord.containerId
          });
        } catch (deleteError) {
          const deleteErrorMessage =
            deleteError instanceof Error ? deleteError.message : 'Unknown error';
          await this.logger.warn(context.taskId, this.name, 'Docker 容器删除失败，继续清理数据库', {
            containerId: caRecord.containerId,
            error: deleteErrorMessage
          });
        }
      }

      await prisma.codingAgent.update({
        where: { id: caId },
        data: {
          status: 'destroyed',
          containerId: null,
          deletedAt: now,
          updatedAt: now
        }
      });

      await this.logger.info(context.taskId, this.name, '容器删除完成', { caId, caName });

      await this.emitTaskEvent(TASK_EVENTS.CONTAINER_DELETED, { caId, caName });

      return {
        success: true,
        data: { caId, caName }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.logger.error(context.taskId, this.name, `容器删除失败: ${errorMessage}`, {
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
        operation: 'delete',
        error: errorMessage
      });

      return {
        success: false,
        error: errorMessage
      };
    }
  }
}
