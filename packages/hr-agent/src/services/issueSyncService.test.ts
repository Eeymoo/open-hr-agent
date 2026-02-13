import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  syncIssueFromWebhook,
  updateIssueState,
  cancelTasksForIssue,
  reopenTasksForIssue,
  completeTasksForIssue
} from './issueSyncService.js';

const mockIssueFindUnique = vi.fn();
const mockIssueCreate = vi.fn();
const mockIssueUpdate = vi.fn();
const mockTaskUpdateMany = vi.fn();

vi.mock('../utils/database.js', () => ({
  getPrismaClient: () => ({
    issue: {
      findUnique: mockIssueFindUnique,
      create: mockIssueCreate,
      update: mockIssueUpdate
    },
    task: {
      updateMany: mockTaskUpdateMany
    }
  }),
  getCurrentTimestamp: () => 1000000,
  INACTIVE_TIMESTAMP: 0
}));

describe('IssueSyncService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('syncIssueFromWebhook', () => {
    it('应该创建新 Issue', async () => {
      mockIssueFindUnique.mockResolvedValue(null);
      mockIssueCreate.mockResolvedValue({ id: 1, issueId: 123 });

      const result = await syncIssueFromWebhook({
        issueId: 123,
        issueUrl: 'https://github.com/test/test/issues/123',
        issueTitle: 'Test Issue',
        issueContent: 'Test content',
        state: 'open'
      });

      expect(result.success).toBe(true);
      expect(result.issue?.isNew).toBe(true);
      expect(result.issue?.issueId).toBe(123);
    });

    it('应该更新已存在的 Issue', async () => {
      mockIssueFindUnique.mockResolvedValue({ id: 1, issueId: 123, completedAt: 0 });
      mockIssueUpdate.mockResolvedValue({ id: 1 });

      const result = await syncIssueFromWebhook({
        issueId: 123,
        issueUrl: 'https://github.com/test/test/issues/123',
        issueTitle: 'Updated Title',
        issueContent: 'Updated content',
        state: 'open'
      });

      expect(result.success).toBe(true);
      expect(result.issue?.isNew).toBe(false);
      expect(mockIssueUpdate).toHaveBeenCalled();
    });

    it('应该设置 closed 状态的 completedAt', async () => {
      mockIssueFindUnique.mockResolvedValue({ id: 1, issueId: 123, completedAt: 0 });
      mockIssueUpdate.mockResolvedValue({ id: 1 });

      await syncIssueFromWebhook({
        issueId: 123,
        issueUrl: 'https://github.com/test/test/issues/123',
        issueTitle: 'Test',
        issueContent: 'Content',
        state: 'closed'
      });

      expect(mockIssueUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ completedAt: 1000000 })
        })
      );
    });

    it('应该处理数据库错误', async () => {
      mockIssueFindUnique.mockRejectedValue(new Error('Database error'));

      const result = await syncIssueFromWebhook({
        issueId: 123,
        issueUrl: 'https://github.com/test/test/issues/123',
        issueTitle: 'Test',
        state: 'open'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('updateIssueState', () => {
    it('应该更新 Issue 状态为 closed', async () => {
      mockIssueFindUnique.mockResolvedValue({ id: 1, issueId: 123 });
      mockIssueUpdate.mockResolvedValue({ id: 1 });

      const result = await updateIssueState(123, 'closed');

      expect(result.success).toBe(true);
      expect(mockIssueUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ completedAt: 1000000 })
        })
      );
    });

    it('应该更新 Issue 状态为 open', async () => {
      mockIssueFindUnique.mockResolvedValue({ id: 1, issueId: 123 });
      mockIssueUpdate.mockResolvedValue({ id: 1 });

      const result = await updateIssueState(123, 'open');

      expect(result.success).toBe(true);
      expect(mockIssueUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ completedAt: 0 })
        })
      );
    });

    it('应该返回错误当 Issue 不存在', async () => {
      mockIssueFindUnique.mockResolvedValue(null);

      const result = await updateIssueState(999, 'open');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Issue #999 not found');
    });
  });

  describe('cancelTasksForIssue', () => {
    it('应该取消活跃的任务', async () => {
      mockIssueFindUnique.mockResolvedValue({
        id: 1,
        issueId: 123,
        tasks: [{ id: 10 }, { id: 11 }]
      });
      mockTaskUpdateMany.mockResolvedValue({ count: 2 });

      const result = await cancelTasksForIssue(123);

      expect(result.success).toBe(true);
      expect(result.cancelledCount).toBe(2);
    });

    it('应该返回 0 当没有活跃任务', async () => {
      mockIssueFindUnique.mockResolvedValue({
        id: 1,
        issueId: 123,
        tasks: []
      });

      const result = await cancelTasksForIssue(123);

      expect(result.success).toBe(true);
      expect(result.cancelledCount).toBe(0);
    });

    it('应该返回错误当 Issue 不存在', async () => {
      mockIssueFindUnique.mockResolvedValue(null);

      const result = await cancelTasksForIssue(999);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Issue #999 not found');
    });
  });

  describe('reopenTasksForIssue', () => {
    it('应该重新打开已完成的任务', async () => {
      mockIssueFindUnique.mockResolvedValue({
        id: 1,
        issueId: 123,
        tasks: [{ id: 10 }, { id: 11 }]
      });
      mockTaskUpdateMany.mockResolvedValue({ count: 2 });

      const result = await reopenTasksForIssue(123);

      expect(result.success).toBe(true);
      expect(result.reopenedCount).toBe(2);
    });

    it('应该返回 0 当没有已完成任务', async () => {
      mockIssueFindUnique.mockResolvedValue({
        id: 1,
        issueId: 123,
        tasks: []
      });

      const result = await reopenTasksForIssue(123);

      expect(result.success).toBe(true);
      expect(result.reopenedCount).toBe(0);
    });

    it('应该返回错误当 Issue 不存在', async () => {
      mockIssueFindUnique.mockResolvedValue(null);

      const result = await reopenTasksForIssue(999);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Issue #999 not found');
    });
  });

  describe('completeTasksForIssue', () => {
    it('应该完成活跃的任务', async () => {
      mockIssueFindUnique.mockResolvedValue({
        id: 1,
        issueId: 123,
        tasks: [{ id: 10 }, { id: 11 }]
      });
      mockTaskUpdateMany.mockResolvedValue({ count: 2 });

      const result = await completeTasksForIssue(123);

      expect(result.success).toBe(true);
      expect(result.completedCount).toBe(2);
    });

    it('应该返回 0 当没有活跃任务', async () => {
      mockIssueFindUnique.mockResolvedValue({
        id: 1,
        issueId: 123,
        tasks: []
      });

      const result = await completeTasksForIssue(123);

      expect(result.success).toBe(true);
      expect(result.completedCount).toBe(0);
    });

    it('应该返回错误当 Issue 不存在', async () => {
      mockIssueFindUnique.mockResolvedValue(null);

      const result = await completeTasksForIssue(999);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Issue #999 not found');
    });
  });
});
