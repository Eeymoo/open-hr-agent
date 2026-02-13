import { BaseTask, type TaskResult, type TaskContext } from './baseTask.js';
import { TASK_EVENTS } from '../config/taskEvents.js';
import { TASK_TAGS } from '../config/taskTags.js';
import { TASK_STATUS } from '../config/taskStatus.js';
import { getContainerByName } from '../utils/docker/getContainer.js';

export class CreateCaTask extends BaseTask {
  readonly name = 'create_ca';
  readonly dependencies: string[] = [];
  readonly tags = [TASK_TAGS.MANAGES_CA, TASK_TAGS.SUBTASK];

  async execute(params: Record<string, unknown>, context: TaskContext): Promise<TaskResult> {
    await this.validateParams(params, ['issueNumber', 'caName']);

    const { parentTaskId, issueNumber, caName } = params as {
      parentTaskId?: number;
      issueNumber: number;
      caName: string;
    };

    await this.logger.info(context.taskId, this.name, '确认 CA 容器状态', { issueNumber, caName });

    if (parentTaskId) {
      await this.updateParentTaskStatus(parentTaskId, TASK_STATUS.CREATING_CA);
    }

    try {
      const container = await getContainerByName(caName);

      if (!container) {
        throw new Error(`CA 容器 ${caName} 不存在`);
      }

      if (!container.state) {
        throw new Error(`CA 容器 ${caName} 未运行`);
      }

      await this.logger.info(context.taskId, this.name, 'CA 容器状态确认成功', {
        containerId: container.id,
        containerName: caName
      });

      await this.updateTaskMetadata(context.taskId, {
        containerId: container.id,
        containerName: caName
      });

      return {
        success: true,
        finalStatus: TASK_STATUS.COMPLETED,
        data: { containerId: container.id, containerName: caName },
        nextEvent: TASK_EVENTS.CA_CREATED,
        nextTask: 'connect_ca',
        nextParams: {
          parentTaskId,
          caName,
          issueNumber
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.logger.error(context.taskId, this.name, `CA 容器状态确认失败: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage
      };
    }
  }
}
