import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorHandlerTask } from './errorHandlerTask.js';
import { EventBus } from '../services/eventBus.js';
import { TaskLogger } from '../utils/taskLogger.js';
import { TASK_STATUS } from '../config/taskStatus.js';
import { TASK_EVENTS } from '../config/taskEvents.js';

const mockIssueFindUnique = vi.fn();
const mockPullRequestFindUnique = vi.fn();
const mockCreateIssueComment = vi.fn();
const mockCreatePRComment = vi.fn();

vi.mock('../utils/database.js', () => ({
  getPrismaClient: () => ({
    issue: {
      findUnique: mockIssueFindUnique
    },
    pullRequest: {
      findUnique: mockPullRequestFindUnique
    }
  })
}));

vi.mock('../utils/github.js', () => ({
  createGitHubClient: () => ({
    createIssueComment: mockCreateIssueComment,
    createPRComment: mockCreatePRComment
  })
}));

const waitForEvent = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('ErrorHandlerTask', () => {
  let task: ErrorHandlerTask;
  let eventBus: EventBus;
  let logger: TaskLogger;

  beforeEach(() => {
    eventBus = new EventBus();
    logger = new TaskLogger();
    vi.spyOn(logger, 'info').mockResolvedValue(undefined);
    vi.spyOn(logger, 'warn').mockResolvedValue(undefined);
    vi.spyOn(logger, 'error').mockResolvedValue(undefined);

    mockIssueFindUnique.mockReset();
    mockPullRequestFindUnique.mockReset();
    mockCreateIssueComment.mockReset();
    mockCreatePRComment.mockReset();

    task = new ErrorHandlerTask(eventBus, logger);
  });

  describe('execute', () => {
    it('应该返回 success 为 true', async () => {
      const result = await task.execute(
        {},
        { taskId: 1, taskName: 'error_handler', retryCount: 0 }
      );

      expect(result.success).toBe(true);
    });

    it('应该返回 finalStatus 为 COMPLETED', async () => {
      const result = await task.execute(
        {},
        { taskId: 1, taskName: 'error_handler', retryCount: 0 }
      );

      expect(result.finalStatus).toBe(TASK_STATUS.COMPLETED);
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

  describe('TASK_FAILED 事件处理', () => {
    it('应该处理 Task 失败事件并在 Issue 上创建评论', async () => {
      mockIssueFindUnique.mockResolvedValue({ id: 1, issueId: 123 });
      mockCreateIssueComment.mockResolvedValue(undefined);

      eventBus.emit(TASK_EVENTS.TASK_FAILED, {
        taskId: 1,
        taskName: 'test_task',
        error: 'Test error',
        issueId: 1,
        retryCount: 2
      });

      await waitForEvent(100);

      expect(logger.error).toHaveBeenCalledWith(1, 'test_task', '处理错误: Test error');
      expect(mockCreateIssueComment).toHaveBeenCalledWith(123, expect.stringContaining('Test error'));
    });

    it('应该处理 Task 失败事件并在 PR 上创建评论', async () => {
      mockPullRequestFindUnique.mockResolvedValue({ id: 1, prId: 456 });
      mockCreatePRComment.mockResolvedValue(undefined);

      eventBus.emit(TASK_EVENTS.TASK_FAILED, {
        taskId: 1,
        taskName: 'test_task',
        error: 'PR error',
        prId: 1
      });

      await waitForEvent(100);

      expect(mockCreatePRComment).toHaveBeenCalledWith(456, expect.stringContaining('PR error'));
    });

    it('应该处理 Task 失败事件同时在 Issue 和 PR 上创建评论', async () => {
      mockIssueFindUnique.mockResolvedValue({ id: 1, issueId: 123 });
      mockPullRequestFindUnique.mockResolvedValue({ id: 1, prId: 456 });
      mockCreateIssueComment.mockResolvedValue(undefined);
      mockCreatePRComment.mockResolvedValue(undefined);

      eventBus.emit(TASK_EVENTS.TASK_FAILED, {
        taskId: 1,
        taskName: 'test_task',
        error: 'Both error',
        issueId: 1,
        prId: 1
      });

      await waitForEvent(100);

      expect(mockCreateIssueComment).toHaveBeenCalled();
      expect(mockCreatePRComment).toHaveBeenCalled();
    });

    it('应该处理 Issue 不存在的情况', async () => {
      mockIssueFindUnique.mockResolvedValue(null);

      eventBus.emit(TASK_EVENTS.TASK_FAILED, {
        taskId: 1,
        taskName: 'test_task',
        error: 'Error',
        issueId: 999
      });

      await waitForEvent(100);

      expect(logger.warn).toHaveBeenCalledWith(999, 'ErrorHandler', 'Issue #999 not found');
    });

    it('应该处理 PR 不存在的情况', async () => {
      mockPullRequestFindUnique.mockResolvedValue(null);

      eventBus.emit(TASK_EVENTS.TASK_FAILED, {
        taskId: 1,
        taskName: 'test_task',
        error: 'Error',
        prId: 999
      });

      await waitForEvent(100);

      expect(logger.warn).toHaveBeenCalledWith(999, 'ErrorHandler', 'PR #999 not found');
    });

    it('应该处理创建 Issue 评论失败的情况', async () => {
      mockIssueFindUnique.mockResolvedValue({ id: 1, issueId: 123 });
      mockCreateIssueComment.mockRejectedValue(new Error('GitHub API error'));

      eventBus.emit(TASK_EVENTS.TASK_FAILED, {
        taskId: 1,
        taskName: 'test_task',
        error: 'Error',
        issueId: 1
      });

      await waitForEvent(100);

      expect(logger.error).toHaveBeenCalledWith(1, 'ErrorHandler', '创建 Issue 评论失败: GitHub API error');
    });

    it('应该处理创建 PR 评论失败的情况', async () => {
      mockPullRequestFindUnique.mockResolvedValue({ id: 1, prId: 456 });
      mockCreatePRComment.mockRejectedValue(new Error('GitHub API error'));

      eventBus.emit(TASK_EVENTS.TASK_FAILED, {
        taskId: 1,
        taskName: 'test_task',
        error: 'Error',
        prId: 1
      });

      await waitForEvent(100);

      expect(logger.error).toHaveBeenCalledWith(1, 'ErrorHandler', '创建 PR 评论失败: GitHub API error');
    });
  });

  describe('CA_ERROR 事件处理', () => {
    it('应该处理 CA 错误事件并在 Issue 上创建评论', async () => {
      mockIssueFindUnique.mockResolvedValue({ id: 1, issueId: 123 });
      mockCreateIssueComment.mockResolvedValue(undefined);

      eventBus.emit(TASK_EVENTS.CA_ERROR, {
        caId: 1,
        error: 'CA error',
        issueNumber: 123
      });

      await waitForEvent(100);

      expect(logger.error).toHaveBeenCalledWith(1, 'CA', 'CA 错误: CA error');
      expect(mockCreateIssueComment).toHaveBeenCalledWith(123, expect.stringContaining('CA 错误'));
    });

    it('应该处理 CA 错误事件但 Issue 不存在', async () => {
      mockIssueFindUnique.mockResolvedValue(null);

      eventBus.emit(TASK_EVENTS.CA_ERROR, {
        caId: 1,
        error: 'CA error',
        issueNumber: 999
      });

      await waitForEvent(100);

      expect(logger.error).toHaveBeenCalledWith(1, 'CA', 'CA 错误: CA error');
      expect(mockCreateIssueComment).not.toHaveBeenCalled();
    });

    it('应该处理 CA 错误事件但没有 IssueNumber', async () => {
      eventBus.emit(TASK_EVENTS.CA_ERROR, {
        caId: 1,
        error: 'CA error'
      });

      await waitForEvent(100);

      expect(logger.error).toHaveBeenCalledWith(1, 'CA', 'CA 错误: CA error');
      expect(mockCreateIssueComment).not.toHaveBeenCalled();
    });
  });

  describe('AI_CODING_ERROR 事件处理', () => {
    it('应该处理 AI Coding 错误事件', async () => {
      mockIssueFindUnique.mockResolvedValue({ id: 1, issueId: 123 });
      mockCreateIssueComment.mockResolvedValue(undefined);

      eventBus.emit(TASK_EVENTS.AI_CODING_ERROR, {
        taskId: 1,
        taskName: 'ai_coding',
        error: 'AI coding error',
        issueId: 1
      });

      await waitForEvent(100);

      expect(logger.error).toHaveBeenCalledWith(1, 'ai_coding', '处理错误: AI coding error');
    });
  });
});
