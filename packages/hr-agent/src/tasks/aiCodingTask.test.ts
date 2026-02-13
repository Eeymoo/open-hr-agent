import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AiCodingTask } from './aiCodingTask.js';
import { EventBus } from '../services/eventBus.js';
import { TaskLogger } from '../utils/taskLogger.js';
import { TASK_TAGS } from '../config/taskTags.js';

type BuildCodingPromptFn = (issue: {
  issueId: number;
  issueTitle: string;
  issueContent: string | null;
}) => string;

vi.mock('../utils/database.js', () => ({
  getPrismaClient: vi.fn(() => ({
    issue: {
      findUnique: vi.fn()
    },
    task: {
      update: vi.fn().mockResolvedValue({})
    }
  })),
  getCurrentTimestamp: vi.fn(() => Date.now())
}));

vi.mock('@opencode-ai/sdk', () => ({
  createOpencodeClient: vi.fn()
}));

vi.mock('../config/docker.js', () => ({
  DOCKER_CONFIG: {
    PORT: 3000
  }
}));

vi.mock('../config/taskConfig.js', () => ({
  TASK_CONFIG: {
    AI_CODING_TIMEOUT: 3600000
  }
}));

describe('AiCodingTask', () => {
  let task: AiCodingTask;
  let eventBus: EventBus;
  let logger: TaskLogger;

  beforeEach(async () => {
    eventBus = new EventBus();
    logger = new TaskLogger();
    vi.spyOn(logger, 'info').mockResolvedValue(undefined);
    vi.spyOn(logger, 'error').mockResolvedValue(undefined);

    task = new AiCodingTask(eventBus, logger);
  });

  describe('execute', () => {
    it('应该处理 Issue 未找到', async () => {
      const { getPrismaClient } = await import('../utils/database.js');
      const prisma = getPrismaClient();
      vi.mocked(prisma.issue.findUnique).mockResolvedValue(null);

      const result = await task.execute(
        { caName: 'hra_123', issueNumber: 123, taskId: 1 },
        { taskId: 1, taskName: 'ai_coding', retryCount: 0 }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Issue #123 未找到');
    });
  });

  describe('任务属性', () => {
    it('应该有正确的 name 属性', () => {
      expect(task.name).toBe('ai_coding');
    });

    it('应该有正确的 dependencies', () => {
      expect(task.dependencies).toEqual(['connect_ca']);
    });

    it('应该有正确的 tags', () => {
      expect(task.tags).toContain(TASK_TAGS.REQUIRES_CA);
      expect(task.tags).toContain(TASK_TAGS.AGENT_CODING);
      expect(task.tags).toContain(TASK_TAGS.SUBTASK);
    });
  });

  describe('buildCodingPrompt', () => {
    it('应该正确生成包含 Issue 信息的提示词', async () => {
      const issue = {
        issueId: 123,
        issueTitle: '修复登录 Bug',
        issueContent: '登录时密码验证失败'
      };

      const prompt = (task as unknown as { buildCodingPrompt: BuildCodingPromptFn }).buildCodingPrompt(issue);

      expect(prompt).toContain('#123: 修复登录 Bug');
      expect(prompt).toContain('登录时密码验证失败');
      expect(prompt).toContain('## 1. 任务定义');
      expect(prompt).toContain('## 2. 执行流程与规范');
      expect(prompt).toContain('## 3. 注意事项');
      expect(prompt).toContain('<Task>');
      expect(prompt).toContain('</Task>');
    });

    it('应该处理 Issue 内容为 null 的情况', async () => {
      const issue = {
        issueId: 456,
        issueTitle: '添加新功能',
        issueContent: null
      };

      const prompt = (task as unknown as { buildCodingPrompt: BuildCodingPromptFn }).buildCodingPrompt(issue);

      expect(prompt).toContain('#456: 添加新功能');
      expect(prompt).toContain('No description provided');
    });

    it('应该保留模板中的所有章节', async () => {
      const issue = {
        issueId: 789,
        issueTitle: '测试任务',
        issueContent: '测试内容'
      };

      const prompt = (task as unknown as { buildCodingPrompt: BuildCodingPromptFn }).buildCodingPrompt(issue);

      expect(prompt).toContain('### 第一阶段：环境准备与任务拆解');
      expect(prompt).toContain('### 第二阶段：原子化开发与测试闭环');
      expect(prompt).toContain('### 第三阶段：PR 创建与 CI 监听');
      expect(prompt).toContain('### 第四阶段：最终交付');
      expect(prompt).toContain('git fetch origin main');
      expect(prompt).toContain('git rebase origin/main');
      expect(prompt).toContain('pnpm check');
      expect(prompt).toContain('gh pr create --draft');
      expect(prompt).toContain('gh pr ready');
    });
  });
});
