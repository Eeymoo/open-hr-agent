import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AiCodingTask } from './aiCodingTask.js';
import { EventBus } from '../services/eventBus.js';
import { TaskLogger } from '../utils/taskLogger.js';
import { TASK_TAGS } from '../config/taskTags.js';

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
});
