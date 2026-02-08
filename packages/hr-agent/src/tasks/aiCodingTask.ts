import { BaseTask, type TaskResult, type TaskContext } from './baseTask.js';
import { TASK_EVENTS } from '../config/taskEvents.js';
import { getPrismaClient } from '../utils/database.js';
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
      const prisma = getPrismaClient();
      const issue = await prisma.issue.findUnique({
        where: { issueId: issueNumber }
      });

      if (!issue) {
        throw new Error(`Issue #${issueNumber} 未找到`);
      }

      await this.logger.info(context.taskId, this.name, '连接到 OpenCode SDK', {
        caName,
        baseUrl: `http://${caName}:${DOCKER_CONFIG.PORT}`
      });

      const client = createOpencodeClient({
        baseUrl: `http://${caName}:${DOCKER_CONFIG.PORT}`
      });

      await this.logger.info(context.taskId, this.name, '创建会话', { caName, issueNumber });

      const session = await client.session.create({
        body: {
          title: `Issue #${issueNumber}: ${issue.issueTitle}`
        }
      });

      if (!session.data) {
        throw new Error('Session creation failed: no data returned');
      }

      const sessionId = session.data.id;

      await this.logger.info(context.taskId, this.name, '会话创建成功', {
        sessionId
      });

      await this.updateTaskMetadata(context.taskId, {
        caName,
        issueNumber,
        sessionId,
        triggeredAt: Date.now()
      });

      const promptText = this.buildCodingPrompt(issue);

      await this.logger.info(context.taskId, this.name, '发送 AI 编码提示词', {
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

      await this.logger.info(context.taskId, this.name, 'AI 编码提示词已发送', {
        sessionId,
        messageId
      });

      return {
        success: true,
        data: {
          caName,
          issueNumber,
          sessionId,
          messageId
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
