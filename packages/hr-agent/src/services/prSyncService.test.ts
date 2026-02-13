import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  syncPullRequestFromWebhook,
  linkPRToIssue,
  updatePullRequestState,
  completeTasksForPR,
  completeLinkedIssue,
  extractIssueNumberFromTitle
} from './prSyncService.js';

const mockPullRequestFindUnique = vi.fn();
const mockPullRequestCreate = vi.fn();
const mockPullRequestUpdate = vi.fn();
const mockIssueFindUnique = vi.fn();
const mockIssueUpdate = vi.fn();
const mockIssuePRFindUnique = vi.fn();
const mockIssuePRCreate = vi.fn();
const mockTaskUpdateMany = vi.fn();
const mockTransaction = vi.fn();

vi.mock('../utils/database.js', () => ({
  getPrismaClient: () => ({
    pullRequest: {
      findUnique: mockPullRequestFindUnique,
      create: mockPullRequestCreate,
      update: mockPullRequestUpdate
    },
    issue: {
      findUnique: mockIssueFindUnique,
      update: mockIssueUpdate
    },
    issuePR: {
      findUnique: mockIssuePRFindUnique,
      create: mockIssuePRCreate
    },
    task: {
      updateMany: mockTaskUpdateMany
    },
    $transaction: mockTransaction
  }),
  getCurrentTimestamp: () => 1000000,
  INACTIVE_TIMESTAMP: 0
}));

describe('PrSyncService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('syncPullRequestFromWebhook', () => {
    it('应该创建新 PR', async () => {
      mockPullRequestFindUnique.mockResolvedValue(null);
      mockPullRequestCreate.mockResolvedValue({ id: 1, prId: 456 });

      const result = await syncPullRequestFromWebhook({
        prId: 456,
        prTitle: 'Test PR',
        prContent: 'Test content',
        prUrl: 'https://github.com/test/test/pull/456',
        state: 'open'
      });

      expect(result.success).toBe(true);
      expect(result.pullRequest?.isNew).toBe(true);
      expect(result.pullRequest?.prId).toBe(456);
    });

    it('应该更新已存在的 PR', async () => {
      mockPullRequestFindUnique.mockResolvedValue({ id: 1, prId: 456, completedAt: 0 });
      mockPullRequestUpdate.mockResolvedValue({ id: 1 });

      const result = await syncPullRequestFromWebhook({
        prId: 456,
        prTitle: 'Updated Title',
        prContent: 'Updated content',
        prUrl: 'https://github.com/test/test/pull/456',
        state: 'open'
      });

      expect(result.success).toBe(true);
      expect(result.pullRequest?.isNew).toBe(false);
      expect(mockPullRequestUpdate).toHaveBeenCalled();
    });

    it('应该设置 merged PR 的 completedAt', async () => {
      mockPullRequestFindUnique.mockResolvedValue({ id: 1, prId: 456, completedAt: 0 });
      mockPullRequestUpdate.mockResolvedValue({ id: 1 });

      await syncPullRequestFromWebhook({
        prId: 456,
        prTitle: 'Test',
        prContent: 'Content',
        prUrl: 'https://github.com/test/test/pull/456',
        state: 'closed',
        merged: true
      });

      expect(mockPullRequestUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ completedAt: 1000000 })
        })
      );
    });

    it('应该处理数据库错误', async () => {
      mockPullRequestFindUnique.mockRejectedValue(new Error('Database error'));

      const result = await syncPullRequestFromWebhook({
        prId: 456,
        prTitle: 'Test',
        prUrl: 'https://github.com/test/test/pull/456',
        state: 'open'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('linkPRToIssue', () => {
    it('应该成功关联 PR 和 Issue', async () => {
      mockPullRequestFindUnique.mockResolvedValue({ id: 1, prId: 456 });
      mockIssueFindUnique.mockResolvedValue({ id: 10, issueId: 123 });
      mockIssuePRFindUnique.mockResolvedValue(null);
      mockTransaction.mockResolvedValue(undefined);

      const result = await linkPRToIssue(456, 123);

      expect(result.success).toBe(true);
      expect(result.linked).toBe(true);
    });

    it('应该返回已存在当关联已存在', async () => {
      mockPullRequestFindUnique.mockResolvedValue({ id: 1, prId: 456 });
      mockIssueFindUnique.mockResolvedValue({ id: 10, issueId: 123 });
      mockIssuePRFindUnique.mockResolvedValue({ issueId: 10, prId: 1 });

      const result = await linkPRToIssue(456, 123);

      expect(result.success).toBe(true);
      expect(result.linked).toBe(true);
    });

    it('应该返回错误当 PR 不存在', async () => {
      mockPullRequestFindUnique.mockResolvedValue(null);

      const result = await linkPRToIssue(999, 123);

      expect(result.success).toBe(false);
      expect(result.error).toBe('PR #999 not found');
    });

    it('应该返回错误当 Issue 不存在', async () => {
      mockPullRequestFindUnique.mockResolvedValue({ id: 1, prId: 456 });
      mockIssueFindUnique.mockResolvedValue(null);

      const result = await linkPRToIssue(456, 999);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Issue #999 not found');
    });
  });

  describe('updatePullRequestState', () => {
    it('应该更新 PR 状态为 closed', async () => {
      mockPullRequestFindUnique.mockResolvedValue({ id: 1, prId: 456 });
      mockPullRequestUpdate.mockResolvedValue({ id: 1 });

      const result = await updatePullRequestState(456, 'closed');

      expect(result.success).toBe(true);
      expect(mockPullRequestUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ completedAt: 1000000 })
        })
      );
    });

    it('应该更新 PR 状态为 merged', async () => {
      mockPullRequestFindUnique.mockResolvedValue({ id: 1, prId: 456 });
      mockPullRequestUpdate.mockResolvedValue({ id: 1 });

      const result = await updatePullRequestState(456, 'closed', true);

      expect(result.success).toBe(true);
      expect(mockPullRequestUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ completedAt: 1000000 })
        })
      );
    });

    it('应该更新 PR 状态为 open', async () => {
      mockPullRequestFindUnique.mockResolvedValue({ id: 1, prId: 456 });
      mockPullRequestUpdate.mockResolvedValue({ id: 1 });

      const result = await updatePullRequestState(456, 'open');

      expect(result.success).toBe(true);
      expect(mockPullRequestUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ completedAt: 0 })
        })
      );
    });

    it('应该返回错误当 PR 不存在', async () => {
      mockPullRequestFindUnique.mockResolvedValue(null);

      const result = await updatePullRequestState(999, 'open');

      expect(result.success).toBe(false);
      expect(result.error).toBe('PR #999 not found');
    });
  });

  describe('completeTasksForPR', () => {
    it('应该完成活跃的任务', async () => {
      mockPullRequestFindUnique.mockResolvedValue({
        id: 1,
        prId: 456,
        tasks: [{ id: 10 }, { id: 11 }]
      });
      mockTaskUpdateMany.mockResolvedValue({ count: 2 });

      const result = await completeTasksForPR(456);

      expect(result.success).toBe(true);
      expect(result.completedCount).toBe(2);
    });

    it('应该返回 0 当没有活跃任务', async () => {
      mockPullRequestFindUnique.mockResolvedValue({
        id: 1,
        prId: 456,
        tasks: []
      });

      const result = await completeTasksForPR(456);

      expect(result.success).toBe(true);
      expect(result.completedCount).toBe(0);
    });

    it('应该返回错误当 PR 不存在', async () => {
      mockPullRequestFindUnique.mockResolvedValue(null);

      const result = await completeTasksForPR(999);

      expect(result.success).toBe(false);
      expect(result.error).toBe('PR #999 not found');
    });
  });

  describe('completeLinkedIssue', () => {
    it('应该完成关联的 Issue', async () => {
      mockPullRequestFindUnique.mockResolvedValue({
        id: 1,
        prId: 456,
        issuePrs: [{ issueId: 10 }, { issueId: 11 }]
      });
      mockIssueUpdate.mockResolvedValue({ id: 10 });
      mockTaskUpdateMany.mockResolvedValue({ count: 2 });

      const result = await completeLinkedIssue(456);

      expect(result.success).toBe(true);
      expect(result.issueId).toBe(10);
    });

    it('应该返回成功当没有关联的 Issue', async () => {
      mockPullRequestFindUnique.mockResolvedValue({
        id: 1,
        prId: 456,
        issuePrs: []
      });

      const result = await completeLinkedIssue(456);

      expect(result.success).toBe(true);
    });

    it('应该返回错误当 PR 不存在', async () => {
      mockPullRequestFindUnique.mockResolvedValue(null);

      const result = await completeLinkedIssue(999);

      expect(result.success).toBe(false);
      expect(result.error).toBe('PR #999 not found');
    });
  });

  describe('extractIssueNumberFromTitle', () => {
    it('应该从标题中提取 Issue 编号', () => {
      expect(extractIssueNumberFromTitle('Fix bug #123')).toBe(123);
      expect(extractIssueNumberFromTitle('#456 feature')).toBe(456);
      expect(extractIssueNumberFromTitle('Issue #789: test')).toBe(789);
    });

    it('应该返回 null 当没有 Issue 编号', () => {
      expect(extractIssueNumberFromTitle('No issue number')).toBe(null);
      expect(extractIssueNumberFromTitle('')).toBe(null);
    });
  });
});
