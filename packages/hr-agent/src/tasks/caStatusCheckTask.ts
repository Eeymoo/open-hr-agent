import { BaseTask, type TaskResult, type TaskContext } from './baseTask.js';
import { createOpencodeClient } from '@opencode-ai/sdk';
import { DOCKER_CONFIG } from '../config/docker.js';
import { readPrompt } from '../utils/promptReader.js';
import { TASK_CONFIG } from '../config/taskConfig.js';
import { getPrismaClient, getCurrentTimestamp } from '../utils/database.js';

interface MessagePart {
  type: string;
  text?: string;
}

interface Message {
  parts?: MessagePart[];
}

interface Session {
  id: string;
}

export class CaStatusCheckTask extends BaseTask {
  readonly name = 'ca_status_check';
  readonly dependencies: string[] = [];
  readonly needsCA = false;

  async execute(params: Record<string, unknown>, context: TaskContext): Promise<TaskResult> {
    await this.validateParams(params, ['caId', 'caName']);

    const { caId, caName } = params as { caId: number; caName: string };

    await this.logger.info(context.taskId, this.name, '开始 CA 状态检查', { caId, caName });

    try {
      const client = this.createClient(caName);

      const sessions = await this.fetchSessions(client);

      if (sessions.length === 0) {
        await this.logger.warn(context.taskId, this.name, '未找到任何 session', { caId, caName });
        return {
          success: false,
          error: 'No session found'
        };
      }

      const [session] = sessions;
      await this.logger.info(context.taskId, this.name, '找到 session', {
        caId,
        caName,
        sessionId: session.id
      });

      await this.checkAICodingTimeout(context.taskId, session.id);

      const messages = await this.fetchMessages(client, session.id);

      if (messages.length === 0) {
        await this.logger.warn(context.taskId, this.name, 'session 中没有消息', {
          caId,
          caName,
          sessionId: session.id
        });
        return {
          success: true,
          data: {
            caId,
            sessionId: session.id,
            messageCount: 0,
            hasXMLError: false,
            action: 'no_messages'
          }
        };
      }

      const latestMessage = messages[messages.length - 1];
      const containsXML = this.checkForXML(latestMessage);

      await this.logger.info(context.taskId, this.name, 'XML 检测结果', {
        caId,
        caName,
        sessionId: session.id,
        messageCount: messages.length,
        containsXML
      });

      if (containsXML) {
        await this.sendContinue(client, session.id);
        await this.logger.info(context.taskId, this.name, '已发送"继续"消息', {
          caId,
          caName,
          sessionId: session.id
        });

        return {
          success: true,
          data: {
            caId,
            sessionId: session.id,
            messageCount: messages.length,
            hasXMLError: true,
            action: 'sent_continue',
            lastMessageContent: this.getMessageContent(latestMessage)
          }
        };
      }

      const checkResult = await this.runCodeCheck(client, session.id);
      await this.logger.info(context.taskId, this.name, '已执行代码检查', {
        caId,
        caName,
        sessionId: session.id,
        checkResult
      });

      return {
        success: true,
        data: {
          caId,
          sessionId: session.id,
          messageCount: messages.length,
          hasXMLError: false,
          action: 'run_code_check',
          checkResult,
          lastMessageContent: this.getMessageContent(latestMessage)
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.logger.error(context.taskId, this.name, `CA 状态检查失败: ${errorMessage}`, {
        caId,
        caName
      });

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  private async checkAICodingTimeout(taskId: number, sessionId: string): Promise<void> {
    const prisma = getPrismaClient();

    try {
      const task = await prisma.task.findFirst({
        where: {
          type: 'ai_coding',
          status: 'running',
          deletedAt: -2
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (!task || !task.metadata) {
        return;
      }

      const metadata = task.metadata as Record<string, unknown>;
      const timeoutAt = metadata.timeoutAt as number | undefined;
      const issueNumber = metadata.issueNumber as number | undefined;

      if (timeoutAt && issueNumber) {
        const now = getCurrentTimestamp();
        const elapsedSeconds = now - timeoutAt;
        const elapsedMs = elapsedSeconds * 1000;

        if (elapsedMs > TASK_CONFIG.AI_CODING_TIMEOUT) {
          await this.logger.warn(taskId, this.name, 'AI 编码任务超时', {
            taskId: task.id,
            issueNumber,
            sessionId,
            elapsedMs,
            timeoutMs: TASK_CONFIG.AI_CODING_TIMEOUT
          });

          await prisma.task.update({
            where: { id: task.id },
            data: {
              status: 'timeout',
              completedAt: now,
              updatedAt: now,
              metadata: {
                ...metadata,
                timeoutError: `AI coding task exceeded timeout of ${TASK_CONFIG.AI_CODING_TIMEOUT}ms`,
                timedOutAt: now
              }
            }
          });
        } else {
          const remainingMs = TASK_CONFIG.AI_CODING_TIMEOUT - elapsedMs;
          await this.logger.info(taskId, this.name, 'AI 编码进度检查', {
            taskId: task.id,
            issueNumber,
            sessionId,
            elapsedMs,
            remainingMs
          });
        }
      }
    } catch (error) {
      await this.logger.error(taskId, this.name, `检查 AI 编码超时失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private createClient(caName: string): ReturnType<typeof createOpencodeClient> {
    return createOpencodeClient({
      baseUrl: `http://${caName}:${DOCKER_CONFIG.PORT}`
    });
  }

  private async fetchSessions(client: ReturnType<typeof createOpencodeClient>): Promise<Session[]> {
    const result = await client.session.list();
    return (result.data as Session[]) ?? [];
  }

  private async fetchMessages(
    client: ReturnType<typeof createOpencodeClient>,
    sessionId: string
  ): Promise<Message[]> {
    const result = await client.session.messages({
      path: { id: sessionId }
    });
    return (result.data as Message[]) ?? [];
  }

  private checkForXML(message: Message | undefined): boolean {
    if (!message?.parts) {
      return false;
    }

    const XML_TAG_PATTERN = /<[a-zA-Z][^>]+>.*?<\/[a-zA-Z][^>]+>/s;

    for (const part of message.parts) {
      if (part.type === 'text' && part.text) {
        if (XML_TAG_PATTERN.test(part.text)) {
          return true;
        }
      }
    }

    return false;
  }

  private getMessageContent(message: Message | undefined): string | null {
    if (!message?.parts) {
      return null;
    }

    for (const part of message.parts) {
      if (part.type === 'text' && part.text) {
        return part.text;
      }
    }

    return null;
  }

  private async sendContinue(
    client: ReturnType<typeof createOpencodeClient>,
    sessionId: string
  ): Promise<void> {
    const continuePrompt = readPrompt('next');
    await client.session.prompt({
      path: { id: sessionId },
      body: {
        parts: [{ type: 'text', text: continuePrompt }]
      }
    });
  }

  private async runCodeCheck(
    client: ReturnType<typeof createOpencodeClient>,
    sessionId: string
  ): Promise<unknown> {
    const checkCommand = readPrompt('check');
    const result = await client.session.shell({
      path: { id: sessionId },
      body: {
        agent: 'agent',
        command: checkCommand
      }
    });
    return result.data;
  }
}
