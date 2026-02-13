import { BaseTask, type TaskResult, type TaskContext } from './baseTask.js';
import { TASK_TAGS } from '../config/taskTags.js';
import { TASK_STATUS } from '../config/taskStatus.js';
import { getContainerByName } from '../utils/docker/getContainer.js';
import { deleteContainer } from '../utils/docker/deleteContainer.js';

export class DestroyCaTask extends BaseTask {
  readonly name = 'destroy_ca';
  readonly dependencies: string[] = ['create_pr'];
  readonly tags = [TASK_TAGS.MANAGES_CA, TASK_TAGS.SUBTASK];

  async execute(params: Record<string, unknown>, context: TaskContext): Promise<TaskResult> {
    await this.validateParams(params, ['caName']);

    const { parentTaskId, caName } = params as { parentTaskId?: number; caName: string };

    await this.logger.info(context.taskId, this.name, '开始销毁 CA 容器', { caName });

    try {
      const container = await getContainerByName(caName);

      if (container?.name) {
        await deleteContainer(container.name);
        await this.logger.info(context.taskId, this.name, 'CA 容器销毁成功', { caName });
      } else {
        await this.logger.warn(context.taskId, this.name, 'CA 容器不存在，跳过销毁', { caName });
      }

      if (parentTaskId) {
        await this.updateParentTaskStatus(parentTaskId, TASK_STATUS.COMPLETED);
      }

      return {
        success: true,
        finalStatus: TASK_STATUS.COMPLETED,
        data: { caName }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.logger.error(context.taskId, this.name, `CA 容器销毁失败: ${errorMessage}`);

      if (parentTaskId) {
        await this.updateParentTaskStatus(parentTaskId, TASK_STATUS.COMPLETED);
      }

      return {
        success: true,
        finalStatus: TASK_STATUS.COMPLETED,
        data: { caName, warning: errorMessage }
      };
    }
  }
}
