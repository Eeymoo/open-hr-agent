import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreatePrTask } from './createPrTask.js';
import { EventBus } from '../services/eventBus.js';
import { TaskLogger } from '../utils/taskLogger.js';
import { TASK_TAGS } from '../config/taskTags.js';

vi.mock('../utils/database.js', () => ({
  getPrismaClient: vi.fn(() => ({
    issue: {
      findUnique: vi.fn()
    },
    pullRequest: {
      findFirst: vi.fn(),
      create: vi.fn()
    },
    task: {
      update: vi.fn().mockResolvedValue({})
    }
  })),
  getCurrentTimestamp: vi.fn(() => Date.now()),
  INACTIVE_TIMESTAMP: -2
}));

vi.mock('../utils/github.js', () => ({
  createGitHubClient: vi.fn(() => ({
    createPullRequest: vi.fn()
  }))
}));

vi.mock('../utils/secretManager.js', () => ({
  getGitHubOwner: vi.fn(() => 'test-owner'),
  getGitHubRepo: vi.fn(() => 'test-repo')
}));

describe('CreatePrTask', () => {
  let task: CreatePrTask;
  let eventBus: EventBus;
  let logger: TaskLogger;

  beforeEach(async () => {
    eventBus = new EventBus();
    logger = new TaskLogger();
    vi.spyOn(logger, 'info').mockResolvedValue(undefined);
    vi.spyOn(logger, 'error').mockResolvedValue(undefined);

    task = new CreatePrTask(eventBus, logger);
  });

  describe('execute', () => {
    it('应该处理 Issue 未找到', async () => {
      const { getPrismaClient } = await import('../utils/database.js');
      const prisma = getPrismaClient();
      vi.mocked(prisma.issue.findUnique).mockResolvedValue(null);

      const result = await task.execute(
        { caName: 'hra_123', issueNumber: 123, taskId: 1 },
        { taskId: 1, taskName: 'create_pr', retryCount: 0 }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Issue #123 未找到');
    });
  });

  describe('任务属性', () => {
    it('应该有正确的 name 属性', () => {
      expect(task.name).toBe('create_pr');
    });

    it('应该有正确的 dependencies', () => {
      expect(task.dependencies).toEqual(['ai_coding']);
    });

    it('应该有 SUBTASK tag', () => {
      expect(task.tags).toContain(TASK_TAGS.SUBTASK);
    });
  });
});
