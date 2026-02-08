import { BaseTask, type TaskResult, type TaskContext } from './baseTask.js';
import { TASK_EVENTS } from '../config/taskEvents.js';
import { getPrismaClient, getCurrentTimestamp, INACTIVE_TIMESTAMP } from '../utils/database.js';

export class CreatePrTask extends BaseTask {
  readonly name = 'create_pr';
  readonly dependencies: string[] = ['ai_coding'];
  readonly needsCA = false;

  async execute(params: Record<string, unknown>, context: TaskContext): Promise<TaskResult> {
    await this.validateParams(params, ['caName', 'issueNumber', 'taskId']);

    const { caName, issueNumber } = params as {
      caName: string;
      issueNumber: number;
    };

    await this.logger.info(context.taskId, this.name, '开始创建 PR', { caName, issueNumber });

    try {
      const prisma = getPrismaClient();
      const now = getCurrentTimestamp();

      const issue = await prisma.issue.findUnique({
        where: { issueId: issueNumber }
      });

      if (!issue) {
        throw new Error(`Issue #${issueNumber} 未找到`);
      }

      const existingPR = await prisma.pullRequest.findFirst({
        where: { issueId: issue.id }
      });

      if (existingPR) {
        await this.logger.info(context.taskId, this.name, 'PR 已存在', { prId: existingPR.id });

        return {
          success: true,
          data: { prId: existingPR.id, existing: true },
          nextEvent: TASK_EVENTS.PR_CREATED,
          nextTask: 'destroy_ca',
          nextParams: {
            caName,
            issueNumber,
            prId: existingPR.id
          }
        };
      }

      const prRecord = await prisma.pullRequest.create({
        data: {
          prId: 0,
          prTitle: `Fix #${issueNumber}: ${issue.issueTitle}`,
          prContent: 'Automated PR created by HR Agent',
          issueId: issue.id,
          completedAt: INACTIVE_TIMESTAMP,
          deletedAt: INACTIVE_TIMESTAMP,
          createdAt: now,
          updatedAt: now
        }
      });

      await this.logger.info(context.taskId, this.name, 'PR 创建成功', { prId: prRecord.id });

      await this.updateTaskMetadata(context.taskId, {
        prId: prRecord.id,
        issueNumber,
        prCreatedAt: now
      });

      await prisma.task.update({
        where: { id: context.taskId },
        data: {
          pullRequest: { connect: { id: prRecord.id } },
          status: 'pr_submitted',
          updatedAt: now
        }
      });

      return {
        success: true,
        data: { prId: prRecord.id, existing: false },
        nextEvent: TASK_EVENTS.PR_CREATED,
        nextTask: 'destroy_ca',
        nextParams: {
          caName,
          issueNumber,
          prId: prRecord.id
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.logger.error(context.taskId, this.name, `PR 创建失败: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage
      };
    }
  }
}
