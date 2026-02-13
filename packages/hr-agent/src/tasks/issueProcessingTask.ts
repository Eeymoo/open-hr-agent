import { BaseTask, type TaskResult, type TaskContext } from './baseTask.js';
import { TASK_EVENTS } from '../config/taskEvents.js';
import { TASK_STATUS } from '../config/taskStatus.js';

export class IssueProcessingTask extends BaseTask {
  readonly name = 'issue_processing';
  readonly dependencies: string[] = [];

  async execute(params: Record<string, unknown>, context: TaskContext): Promise<TaskResult> {
    const { issueNumber, caName } = params as { issueNumber: number; caName: string };

    await this.logger.info(context.taskId, this.name, '开始处理 Issue', { issueNumber, caName });

    return {
      success: true,
      finalStatus: TASK_STATUS.QUEUED,
      nextEvent: TASK_EVENTS.ISSUE_PROCESSING_STARTED,
      nextTask: 'create_ca',
      nextParams: {
        parentTaskId: context.taskId,
        issueNumber,
        caName
      }
    };
  }
}
