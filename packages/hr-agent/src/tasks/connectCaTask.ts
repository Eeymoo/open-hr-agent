import { BaseTask, type TaskResult, type TaskContext } from './baseTask.js';
import { TASK_EVENTS } from '../config/taskEvents.js';
import { TASK_TAGS } from '../config/taskTags.js';
import { TASK_STATUS } from '../config/taskStatus.js';
import { getContainerByName } from '../utils/docker/getContainer.js';

export class ConnectCaTask extends BaseTask {
  readonly name = 'connect_ca';
  readonly dependencies: string[] = ['create_ca'];
  readonly tags = [TASK_TAGS.MANAGES_CA, TASK_TAGS.SUBTASK];

  async execute(params: Record<string, unknown>, context: TaskContext): Promise<TaskResult> {
    await this.validateParams(params, ['caName', 'issueNumber']);

    const { parentTaskId, caName, issueNumber } = params as {
      parentTaskId?: number;
      caName: string;
      issueNumber: number;
    };

    await this.logger.info(context.taskId, this.name, '连接到 CA', { caName });

    if (parentTaskId) {
      await this.updateParentTaskStatus(parentTaskId, TASK_STATUS.CONNECTING_CA);
    }

    try {
      await this.waitForContainerReady(caName);

      await this.logger.info(context.taskId, this.name, 'CA 已准备就绪', { caName });

      await this.updateTaskMetadata(context.taskId, {
        caName,
        issueNumber,
        readyAt: Date.now()
      });

      return {
        success: true,
        finalStatus: TASK_STATUS.COMPLETED,
        data: { caName, issueNumber },
        nextEvent: TASK_EVENTS.CA_CONNECTED,
        nextTask: 'ai_coding',
        nextParams: {
          parentTaskId,
          caName,
          issueNumber,
          taskId: context.taskId
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.logger.error(context.taskId, this.name, `CA 连接失败: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  private async waitForContainerReady(containerName: string): Promise<void> {
    const MAX_WAIT_MS = 60000;
    const CHECK_INTERVAL_MS = 1000;
    const startTime = Date.now();

    while (Date.now() - startTime < MAX_WAIT_MS) {
      const container = await getContainerByName(containerName);

      if (container?.state) {
        return;
      }

      if (container && !container.state) {
        throw new Error(`CA 容器 ${containerName} 状态异常: ${container.status}`);
      }

      await new Promise((resolve) => setTimeout(resolve, CHECK_INTERVAL_MS));
    }

    throw new Error(`CA 容器 ${containerName} 启动超时`);
  }
}
