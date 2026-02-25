import { BaseTask, type TaskResult, type TaskContext } from './baseTask.js';
import { TASK_EVENTS } from '../config/taskEvents.js';
import { TASK_TAGS } from '../config/taskTags.js';
import { TASK_STATUS } from '../config/taskStatus.js';
import { TASK_CONFIG } from '../config/taskConfig.js';
import { getPrismaClient, getCurrentTimestamp } from '../utils/database.js';
import { createOpencodeClient } from '@opencode-ai/sdk';
import { DOCKER_CONFIG } from '../config/docker.js';
import { readPrompt } from '../utils/promptReader.js';
import { Buffer } from 'node:buffer';

export class AiCodingTask extends BaseTask {
  readonly name = 'ai_coding';
  readonly dependencies: string[] = ['connect_ca'];
  readonly tags = [TASK_TAGS.REQUIRES_CA, TASK_TAGS.AGENT_CODING, TASK_TAGS.SUBTASK];

  async execute(params: Record<string, unknown>, context: TaskContext): Promise<TaskResult> {
    await this.validateParams(params, ['caName', 'issueNumber', 'taskId']);

    const { parentTaskId, caName, issueNumber } = params as {
      parentTaskId?: number;
      caName: string;
      issueNumber: number;
    };

    await this.logger.info(context.taskId, this.name, '开始 AI 编码任务', { caName, issueNumber });

    if (parentTaskId) {
      await this.updateParentTaskStatus(parentTaskId, TASK_STATUS.AI_CODING);
    }

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
        finalStatus: TASK_STATUS.COMPLETED,
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
          parentTaskId,
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
    sessionId: string | null;
  }> {
    const prisma = getPrismaClient();
    const issue = await prisma.issue.findUnique({
      where: { issueId: issueNumber },
      select: {
        issueId: true,
        issueTitle: true,
        issueContent: true,
        sessionId: true
      }
    });

    if (!issue) {
      throw new Error(`Issue #${issueNumber} 未找到`);
    }

    return issue;
  }

  private createClient(caName: string): ReturnType<typeof createOpencodeClient> {
    const credentials = `opencode:${DOCKER_CONFIG.SECRET}`;
    const auth = Buffer.from(credentials).toString('base64');
    const host = DOCKER_CONFIG.CA_HOST ?? caName;
    return createOpencodeClient({
      baseUrl: `http://${host}:${DOCKER_CONFIG.PORT}`,
      headers: {
        Authorization: `Basic ${auth}`
      }
    });
  }

  private async createOpenCodeSession(
    client: ReturnType<typeof createOpencodeClient>,
    issue: { issueId: number; issueTitle: string; sessionId: string | null },
    taskId: number,
    issueNumber: number
  ): Promise<string> {
    if (issue.sessionId) {
      await this.logger.info(taskId, this.name, '复用现有会话', {
        sessionId: issue.sessionId,
        issueNumber
      });
      return issue.sessionId;
    }

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

    const prisma = getPrismaClient();
    await prisma.issue.update({
      where: { issueId: issueNumber },
      data: { sessionId }
    });

    await this.logger.info(taskId, this.name, '会话创建成功并关联到 Issue', {
      sessionId,
      issueNumber
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
    const template = readPrompt('task');
    const taskContent = `#${issue.issueId}: ${issue.issueTitle}\n${issueContent}`;

    return template.replace('<Task></Task>', `<Task>\n${taskContent}\n</Task>`);
  }
}
