import { BaseTask, type TaskResult, type TaskContext } from './baseTask.js';
import { TASK_EVENTS } from '../config/taskEvents.js';
import { TASK_STATUS } from '../config/taskStatus.js';
import { getPrismaClient } from '../utils/database.js';
import { createGitHubClient } from '../utils/github.js';
import type { EventBus } from '../services/eventBus.js';
import type { TaskLogger } from '../utils/taskLogger.js';

interface ErrorEventData {
  taskId: number;
  taskName: string;
  error: string;
  issueId?: number;
  prId?: number;
  caId?: number;
  retryCount?: number;
}

export class ErrorHandlerTask extends BaseTask {
  readonly name = 'error_handler';
  readonly dependencies: string[] = [];

  constructor(eventBus: EventBus, logger: TaskLogger) {
    super(eventBus, logger);
    this.registerErrorListeners();
  }

  private registerErrorListeners(): void {
    this.eventBus.register(TASK_EVENTS.TASK_FAILED, async (_data) => {
      await this.handleError(_data as ErrorEventData);
    });

    this.eventBus.register(TASK_EVENTS.CA_ERROR, async (_data) => {
      await this.handleCAError(_data as { caId: number; error: string; issueNumber?: number });
    });

    this.eventBus.register(TASK_EVENTS.AI_CODING_ERROR, async (_data) => {
      await this.handleError(_data as ErrorEventData);
    });
  }

  private async handleError(data: ErrorEventData): Promise<void> {
    const { taskId, taskName, error, issueId, prId, retryCount } = data;

    await this.logger.error(taskId, taskName, `处理错误: ${error}`);

    const comment = `❌ 任务执行失败

- 任务 ID: ${taskId}
- 任务名称: ${taskName}
- 错误信息: ${error}
- 重试次数: ${retryCount ?? 0}`;

    if (issueId) {
      await this.postIssueComment(issueId, comment);
    }

    if (prId) {
      await this.postPRComment(prId, comment);
    }

    await this.eventBus.emit(TASK_EVENTS.ERROR_COMMENT_POSTED, {
      taskId,
      taskName,
      comment,
      issueId,
      prId
    });
  }

  private async handleCAError(data: {
    caId: number;
    error: string;
    issueNumber?: number;
  }): Promise<void> {
    const { caId, error, issueNumber } = data;

    await this.logger.error(caId, 'CA', `CA 错误: ${error}`);

    const comment = `❌ CA 错误

- CA ID: ${caId}
- 错误信息: ${error}`;

    if (issueNumber) {
      const prisma = getPrismaClient();
      const issue = await prisma.issue.findUnique({
        where: { issueId: issueNumber }
      });

      if (issue) {
        await this.postIssueComment(issue.id, comment);
      }
    }
  }

  private async postIssueComment(issueId: number, comment: string): Promise<void> {
    try {
      const prisma = getPrismaClient();
      const issue = await prisma.issue.findUnique({
        where: { id: issueId }
      });

      if (!issue) {
        await this.logger.warn(issueId, 'ErrorHandler', `Issue #${issueId} not found`);
        return;
      }

      const githubClient = createGitHubClient();
      await githubClient.createIssueComment(issue.issueId, comment);

      await this.logger.info(issueId, 'ErrorHandler', `已在 Issue #${issue.issueId} 创建评论`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.logger.error(issueId, 'ErrorHandler', `创建 Issue 评论失败: ${errorMessage}`);
    }
  }

  private async postPRComment(prId: number, comment: string): Promise<void> {
    try {
      const prisma = getPrismaClient();
      const pullRequest = await prisma.pullRequest.findUnique({
        where: { id: prId }
      });

      if (!pullRequest) {
        await this.logger.warn(prId, 'ErrorHandler', `PR #${prId} not found`);
        return;
      }

      const githubClient = createGitHubClient();
      await githubClient.createPRComment(pullRequest.prId, comment);

      await this.logger.info(prId, 'ErrorHandler', `已在 PR #${pullRequest.prId} 创建评论`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.logger.error(prId, 'ErrorHandler', `创建 PR 评论失败: ${errorMessage}`);
    }
  }

  async execute(_params: Record<string, unknown>, _context: TaskContext): Promise<TaskResult> {
    return {
      success: true,
      finalStatus: TASK_STATUS.COMPLETED
    };
  }
}
