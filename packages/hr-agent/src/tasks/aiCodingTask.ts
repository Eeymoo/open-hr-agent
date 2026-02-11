import { BaseTask, type TaskResult, type TaskContext } from './baseTask.js';
import { TASK_EVENTS } from '../config/taskEvents.js';
import { TASK_CONFIG } from '../config/taskConfig.js';
import { getPrismaClient, getCurrentTimestamp } from '../utils/database.js';
import { createOpencodeClient } from '@opencode-ai/sdk';
import { DOCKER_CONFIG } from '../config/docker.js';

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
      const issue = await this.fetchIssue(issueNumber);
      const client = this.createClient(caName);
      const sessionId = await this.createOpenCodeSession(
        client,
        issue,
        context.taskId,
        issueNumber
      );

      const now = getCurrentTimestamp();
      const timeoutMs = TASK_CONFIG.AI_CODING_TIMEOUT;
      const timeoutAt = now + Math.floor(timeoutMs / 1000);

      await this.updateTaskMetadata(context.taskId, {
        caName,
        issueNumber,
        sessionId,
        triggeredAt: Date.now(),
        timeoutAt,
        timeoutMs
      });

      await this.logger.info(context.taskId, this.name, '设置 AI 编码超时', {
        sessionId,
        timeoutMs,
        timeoutAt
      });

      const messageId = await this.sendPromptToAI(client, sessionId, issue, context.taskId);

      await this.updateTaskMetadata(context.taskId, {
        messageId,
        promptSentAt: Date.now()
      });

      return {
        success: true,
        data: {
          caName,
          issueNumber,
          sessionId,
          messageId,
          timeoutAt
        },
        nextEvent: TASK_EVENTS.AI_CODING_COMPLETE,
        nextTask: 'create_pr',
        nextParams: {
          caName,
          issueNumber,
          sessionId,
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

  private async fetchIssue(issueNumber: number): Promise<{
    issueId: number;
    issueTitle: string;
    issueContent: string | null;
  }> {
    const prisma = getPrismaClient();
    const issue = await prisma.issue.findUnique({
      where: { issueId: issueNumber }
    });

    if (!issue) {
      throw new Error(`Issue #${issueNumber} 未找到`);
    }

    return issue;
  }

  private createClient(caName: string): ReturnType<typeof createOpencodeClient> {
    return createOpencodeClient({
      baseUrl: `http://${caName}:${DOCKER_CONFIG.PORT}`
    });
  }

  private async createOpenCodeSession(
    client: ReturnType<typeof createOpencodeClient>,
    issue: { issueId: number; issueTitle: string },
    taskId: number,
    issueNumber: number
  ): Promise<string> {
    await this.logger.info(taskId, this.name, '创建会话', { issueNumber });

    const session = await client.session.create({
      body: {
        title: `Issue #${issueNumber}: ${issue.issueTitle}`
      }
    });

    if (!session.data) {
      throw new Error('Session creation failed: no data returned');
    }

    const sessionId = session.data.id;

    await this.logger.info(taskId, this.name, '会话创建成功', {
      sessionId
    });

    return sessionId;
  }

  private async sendPromptToAI(
    client: ReturnType<typeof createOpencodeClient>,
    sessionId: string,
    issue: { issueId: number; issueTitle: string; issueContent: string | null },
    taskId: number
  ): Promise<string | undefined> {
    const promptText = this.buildCodingPrompt(issue);

    await this.logger.info(taskId, this.name, '发送 AI 编码提示词', {
      sessionId,
      promptLength: promptText.length
    });

    const result = await client.session.prompt({
      path: { id: sessionId },
      body: {
        model: {
          providerID: 'anthropic',
          modelID: 'claude-3-5-sonnet-20241022'
        },
        parts: [
          {
            type: 'text',
            text: promptText
          }
        ]
      }
    });

    const messageId = result.data?.info?.id;

    await this.logger.info(taskId, this.name, 'AI 编码提示词已发送', {
      sessionId,
      messageId
    });

    return messageId;
  }

  private buildCodingPrompt(issue: {
    issueId: number;
    issueTitle: string;
    issueContent: string | null;
  }): string {
    const issueContent = issue.issueContent ?? 'No description provided';

    return `请根据以下 GitHub Issue，完成代码修改任务：

## Issue #${issue.issueId}: ${issue.issueTitle}

### Issue 内容：
${issueContent}

### 任务要求：
1. 打开工作目录：/home/workspace/repo
2. 分析需求并实现功能
3. 编写测试用例（如果有新的 API）
4. 运行测试确保通过
5. 提交代码

请开始执行任务。`;
  }
}
