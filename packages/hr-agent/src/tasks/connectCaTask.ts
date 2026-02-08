import { BaseTask, type TaskResult, type TaskContext } from './baseTask.js';
import { TASK_EVENTS } from '../config/taskEvents.js';
import { getContainerByName } from '../utils/docker/getContainer.js';

export class ConnectCaTask extends BaseTask {
  readonly name = 'connect_ca';
  readonly dependencies: string[] = ['create_ca'];
  readonly needsCA = true;

  async execute(params: Record<string, unknown>, context: TaskContext): Promise<TaskResult> {
    await this.validateParams(params, ['caName', 'issueNumber']);

    const { caName, issueNumber } = params as { caName: string; issueNumber: number };

    await this.logger.info(context.taskId, this.name, '连接到 CA', { caName });

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
        data: { caName, issueNumber },
        nextEvent: TASK_EVENTS.CA_CONNECTED,
        nextTask: 'ai_coding',
        nextParams: {
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
