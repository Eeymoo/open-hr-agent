import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createIssueFromWebhook } from './webhookHandler.js';
import { getPrismaClient } from './database.js';

vi.mock('./database.js', async (importOriginal) => {
  const mod = await importOriginal<typeof import('./database.js')>();
  return {
    ...mod,
    getPrismaClient: vi.fn(),
    getCurrentTimestamp: vi.fn(() => 1234567890)
  };
});

vi.mock('@opencode-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    sendMessage: vi.fn().mockResolvedValue(undefined)
  }))
}));

describe('webhookHandler 测试', () => {
  const prismaMock = {
    task: {
      findFirst: vi.fn(),
      create: vi.fn()
    },
    codingAgent: {
      findFirst: vi.fn(),
      create: vi.fn()
    },
    issue: {
      findUnique: vi.fn(),
      create: vi.fn()
    }
  } as unknown as ReturnType<typeof getPrismaClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPrismaClient).mockReturnValue(prismaMock);
    console.log = vi.fn();
    console.error = vi.fn();
  });

  describe('createIssueFromWebhook', () => {
    it('应该创建新 issue', async () => {
      (prismaMock.issue.findUnique as never).mockResolvedValue(null);
      (prismaMock.issue.create as never).mockResolvedValue({
        id: 1,
        issueId: 42,
        issueTitle: 'Test Issue'
      });

      const result = await createIssueFromWebhook(
        42,
        'https://github.com/test/repo/issues/42',
        'Test Issue',
        'Test content'
      );

      expect(result.success).toBe(true);
      expect(prismaMock.issue.create).toHaveBeenCalled();
    });

    it('当 issue 已存在时应返回错误', async () => {
      (prismaMock.issue.findUnique as never).mockResolvedValue({
        id: 1,
        issueId: 42
      });

      const result = await createIssueFromWebhook(
        42,
        'https://github.com/test/repo/issues/42',
        'Test Issue',
        'Test content'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });
  });
});
