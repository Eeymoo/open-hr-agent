import { BaseTask, type TaskResult, type TaskContext } from './baseTask.js';
import { TASK_TAGS } from '../config/taskTags.js';
import { getContainerByName } from '../utils/docker/getContainer.js';

export class CheckCaTask extends BaseTask {
  readonly name = 'check_ca';
  readonly dependencies: string[] = [];
  readonly tags = [TASK_TAGS.MANAGES_CA];

  async execute(params: Record<string, unknown>, context: TaskContext): Promise<TaskResult> {
    await this.validateParams(params, ['caName']);

    const { caName } = params as { caName: string };

    await this.logger.info(context.taskId, this.name, '检查 CA 健康状态', { caName });

    try {
      const container = await getContainerByName(caName);

      if (!container) {
        throw new Error(`CA 容器 ${caName} 不存在`);
      }

      const isHealthy = container.state && container.status.includes('healthy');

      if (!isHealthy) {
        await this.logger.warn(context.taskId, this.name, 'CA 健康状态检查失败', {
          caName,
          status: container.status,
          state: container.state
        });

        return {
          success: false,
          error: `CA 健康状态异常: ${container.status}`
        };
      }

      await this.logger.info(context.taskId, this.name, 'CA 健康状态正常', { caName });

      return {
        success: true,
        data: {
          caName,
          status: container.status,
          state: container.state
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.logger.error(context.taskId, this.name, `CA 健康检查失败: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage
      };
    }
  }
}
