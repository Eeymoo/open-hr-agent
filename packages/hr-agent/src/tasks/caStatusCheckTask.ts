import { BaseTask, type TaskResult, type TaskContext } from './baseTask.js';
import { createOpencodeClient } from '@opencode-ai/sdk';
import { DOCKER_CONFIG } from '../config/docker.js';

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
    await client.session.prompt({
      path: { id: sessionId },
      body: {
        parts: [{ type: 'text', text: '继续' }]
      }
    });
  }

  private async runCodeCheck(
    client: ReturnType<typeof createOpencodeClient>,
    sessionId: string
  ): Promise<unknown> {
    const result = await client.session.shell({
      path: { id: sessionId },
      body: {
        agent: 'agent',
        command: 'pnpm run check'
      }
    });
    return result.data;
  }
}
