import { BaseTask, type TaskResult, type TaskContext } from './baseTask.js';
import { TASK_EVENTS } from '../config/taskEvents.js';
import { createContainer } from '../utils/docker/createContainer.js';
import { DOCKER_CONFIG } from '../config/docker.js';

export class CreateCaTask extends BaseTask {
  readonly name = 'create_ca';
  readonly dependencies: string[] = [];
  readonly needsCA = false;

  async execute(params: Record<string, unknown>, context: TaskContext): Promise<TaskResult> {
    await this.validateParams(params, ['issueNumber']);

    const { issueNumber } = params as { issueNumber: number };

    await this.logger.info(context.taskId, this.name, '开始创建 CA 容器', { issueNumber });

    const containerName = `${DOCKER_CONFIG.NAME_PREFIX}${issueNumber}`;

    try {
      const containerId = await createContainer(containerName);

      await this.logger.info(context.taskId, this.name, 'CA 容器创建成功', {
        containerId,
        containerName
      });

      await this.updateTaskMetadata(context.taskId, {
        containerId,
        containerName
      });

      return {
        success: true,
        data: { containerId, containerName },
        nextEvent: TASK_EVENTS.CA_CREATED,
        nextTask: 'connect_ca',
        nextParams: {
          caName: containerName,
          issueNumber
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.logger.error(context.taskId, this.name, `CA 容器创建失败: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage
      };
    }
  }
}
