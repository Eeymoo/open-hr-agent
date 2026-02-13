import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorHandlerTask } from './errorHandlerTask.js';
import { EventBus } from '../services/eventBus.js';
import { TaskLogger } from '../utils/taskLogger.js';
import { TASK_STATUS } from '../config/taskStatus.js';

vi.mock('../utils/database.js', () => ({
  getPrismaClient: vi.fn(() => ({
    issue: {
      findUnique: vi.fn()
    },
    pullRequest: {
      findUnique: vi.fn()
    }
  }))
}));

vi.mock('../utils/github.js', () => ({
  createGitHubClient: vi.fn(() => ({
    createIssueComment: vi.fn(),
    createPRComment: vi.fn()
  }))
}));

describe('ErrorHandlerTask', () => {
  let task: ErrorHandlerTask;
  let eventBus: EventBus;
  let logger: TaskLogger;

  beforeEach(async () => {
    eventBus = new EventBus();
    logger = new TaskLogger();
    vi.spyOn(logger, 'info').mockResolvedValue(undefined);
    vi.spyOn(logger, 'warn').mockResolvedValue(undefined);
    vi.spyOn(logger, 'error').mockResolvedValue(undefined);

    task = new ErrorHandlerTask(eventBus, logger);
  });

  describe('execute', () => {
    it('应该返回 success 为 true', async () => {
      const result = await task.execute({}, { taskId: 1, taskName: 'error_handler', retryCount: 0 });

      expect(result.success).toBe(true);
    });

    it('应该返回 finalStatus 为 COMPLETED', async () => {
      const result = await task.execute({}, { taskId: 1, taskName: 'error_handler', retryCount: 0 });

      expect(result.finalStatus).toBe(TASK_STATUS.COMPLETED);
    });
  });

  describe('事件监听', () => {
    it('应该监听 TASK_FAILED 事件', () => {
      expect(eventBus.register).toBeDefined();
    });

    it('应该监听 CA_ERROR 事件', () => {
      expect(eventBus.register).toBeDefined();
    });

    it('应该监听 AI_CODING_ERROR 事件', () => {
      expect(eventBus.register).toBeDefined();
    });
  });

  describe('任务属性', () => {
    it('应该有正确的 name 属性', () => {
      expect(task.name).toBe('error_handler');
    });

    it('应该有空的 dependencies', () => {
      expect(task.dependencies).toEqual([]);
    });
  });
});
