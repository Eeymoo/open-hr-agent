import { BaseTask, type TaskResult, type TaskContext } from './baseTask.js';
import { getContainerByName } from '../utils/docker/getContainer.js';
import { deleteContainer } from '../utils/docker/deleteContainer.js';

export class DestroyCaTask extends BaseTask {
  readonly name = 'destroy_ca';
  readonly dependencies: string[] = ['create_pr'];
  readonly needsCA = false;

  async execute(params: Record<string, unknown>, context: TaskContext): Promise<TaskResult> {
    await this.validateParams(params, ['caName']);

    const { caName } = params as { caName: string };

    await this.logger.info(context.taskId, this.name, '开始销毁 CA 容器', { caName });

    try {
      const container = await getContainerByName(caName);

      if (container?.id) {
        await deleteContainer(container.id);
        await this.logger.info(context.taskId, this.name, 'CA 容器销毁成功', { caName });
      } else {
        await this.logger.warn(context.taskId, this.name, 'CA 容器不存在，跳过销毁', { caName });
      }

      return {
        success: true,
        data: { caName }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.logger.error(context.taskId, this.name, `CA 容器销毁失败: ${errorMessage}`);

      return {
        success: true,
        data: { caName, warning: errorMessage }
      };
    }
  }
}
