import { BaseTask, type TaskResult, type TaskContext } from './baseTask.js';
import { TASK_EVENTS } from '../config/taskEvents.js';
import { getPrismaClient } from '../utils/database.js';

export class AiCodingTask extends BaseTask {
  readonly name = 'ai_coding';
  readonly dependencies: string[] = ['connect_ca'];
  readonly needsCA = true;

  async execute(params: Record<string, unknown>, context: TaskContext): Promise<TaskResult> {
    await this.validateParams(params, ['caName', 'issueNumber', 'taskId']);

    const { caName, issueNumber } = params as {
      caName: string;
      issueNumber: number;
    };

    await this.logger.info(context.taskId, this.name, '开始 AI 编码任务', { caName, issueNumber });

    try {
      const prisma = getPrismaClient();
      const issue = await prisma.issue.findUnique({
        where: { issueId: issueNumber }
      });

      if (!issue) {
        throw new Error(`Issue #${issueNumber} 未找到`);
      }

      await this.logger.info(context.taskId, this.name, 'AI 编码任务已触发', {
        caName,
        issueNumber
      });

      await this.updateTaskMetadata(context.taskId, {
        caName,
        issueNumber,
        triggeredAt: Date.now()
      });

      return {
        success: true,
        data: { caName, issueNumber },
        nextEvent: TASK_EVENTS.AI_CODING_COMPLETE,
        nextTask: 'create_pr',
        nextParams: {
          caName,
          issueNumber,
          taskId: context.taskId
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.logger.error(context.taskId, this.name, `AI 编码任务失败: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage
      };
    }
  }
}
