import { describe, it, expect, beforeEach, vi } from 'vitest';
import { caExistsForIssue, createCAForIssue, createIssueFromWebhook } from './webhookHandler.js';
import { getPrismaClient } from './database.js';
import { createContainer } from './docker/createContainer.js';
import { getContainerByName } from './docker/getContainer.js';

vi.mock('./database.js', async (importOriginal) => {
  const mod = await importOriginal<typeof import('./database.js')>();
  return {
    ...mod,
    getPrismaClient: vi.fn(),
    getCurrentTimestamp: vi.fn(() => 1234567890)
  };
});

vi.mock('./docker/createContainer.js', () => ({
  createContainer: vi.fn()
}));

vi.mock('./docker/getContainer.js', () => ({
  getContainerByName: vi.fn()
}));

vi.mock('@opencode-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    sendMessage: vi.fn().mockResolvedValue(undefined)
  }))
}));

/* eslint-disable @typescript-eslint/no-explicit-any */

describe('webhookHandler CA 功能测试', () => {
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

  describe('caExistsForIssue', () => {
    it('当 CA 存在时应该返回 true', async () => {
      const mockTask = {
        id: 1,
        caId: 123,
        codingAgent: { id: 123, caName: 'test-ca' }
      };
      (prismaMock.task.findFirst as any).mockResolvedValue(mockTask);

      const result = await caExistsForIssue(42);
      expect(result).toBe(true);
      expect(prismaMock.task.findFirst).toHaveBeenCalledWith({
        where: {
          issue: { issueId: 42 },
          caId: { not: null }
        },
        include: {
          codingAgent: true
        }
      });
    });

    it('当 CA 不存在时应该返回 false', async () => {
      (prismaMock.task.findFirst as any).mockResolvedValue(null);

      const result = await caExistsForIssue(42);
      expect(result).toBe(false);
    });

    it('当 task 存在但没有关联 CA 时应该返回 false', async () => {
      const mockTask = {
        id: 1,
        caId: null,
        codingAgent: null
      };
      (prismaMock.task.findFirst as any).mockResolvedValue(mockTask);

      const result = await caExistsForIssue(42);
      expect(result).toBe(false);
    });
  });

  describe('createCAForIssue', () => {
    const mockMetadata = {
      repository: 'test/repo',
      sender: 'testuser',
      action: 'opened'
    };

    it('当容器已存在时应记录现有的 CA', async () => {
      (prismaMock.codingAgent.findFirst as any).mockResolvedValue(null);
      (prismaMock.codingAgent.create as any).mockResolvedValue({ id: 123 });
      vi.mocked(getContainerByName).mockResolvedValue({
        id: 'existing-container-id',
        name: 'ca-hra_42',
        status: 'running',
        state: true,
        created: '2024-01-01T00:00:00Z'
      });

      const result = await createCAForIssue(42, mockMetadata);

      expect(result.success).toBe(true);
      expect(createContainer).not.toHaveBeenCalled();
      expect(prismaMock.codingAgent.create).toHaveBeenCalled();
    });

    it('当容器已存在且 CA 记录已存在时应返回错误', async () => {
      (prismaMock.codingAgent.findFirst as any).mockResolvedValue({
        id: 123,
        caName: 'hra_42'
      });
      vi.mocked(getContainerByName).mockResolvedValue({
        id: 'existing-container-id',
        name: 'ca-hra_42',
        status: 'running',
        state: true,
        created: '2024-01-01T00:00:00Z'
      });

      const result = await createCAForIssue(42, mockMetadata);

      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });

    it('当容器不存在时应创建新容器', async () => {
      (prismaMock.codingAgent.findFirst as any).mockResolvedValue(null);
      vi.mocked(getContainerByName).mockResolvedValue(null);
      vi.mocked(createContainer).mockResolvedValue('new-container-id');
      (prismaMock.codingAgent.create as any).mockResolvedValue({ id: 123 });
      (prismaMock.issue.findUnique as any).mockResolvedValue({
        id: 1,
        issueId: 42
      });
      (prismaMock.task.create as any).mockResolvedValue({ id: 1 });

      const result = await createCAForIssue(42, mockMetadata);

      expect(result.success).toBe(true);
      expect(createContainer).toHaveBeenCalledWith('hra_42', 'https://github.com/test/repo.git');
      expect(prismaMock.codingAgent.create).toHaveBeenCalled();
      expect(prismaMock.task.create).toHaveBeenCalled();
    });

    it('当 issue 不存在时应返回错误', async () => {
      (prismaMock.codingAgent.findFirst as any).mockResolvedValue(null);
      vi.mocked(getContainerByName).mockResolvedValue(null);
      vi.mocked(createContainer).mockResolvedValue('new-container-id');
      (prismaMock.codingAgent.create as any).mockResolvedValue({ id: 123 });
      (prismaMock.issue.findUnique as any).mockResolvedValue(null);

      const result = await createCAForIssue(42, mockMetadata);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('当创建容器失败时应处理错误', async () => {
      (prismaMock.codingAgent.findFirst as any).mockResolvedValue(null);
      vi.mocked(getContainerByName).mockResolvedValue(null);
      vi.mocked(createContainer).mockRejectedValue(new Error('Docker error'));

      const result = await createCAForIssue(42, mockMetadata);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Docker error');
    });
  });

  describe('集成测试', () => {
    it('应该完整处理 issue opened 事件创建 CA', async () => {
      (prismaMock.task.findFirst as any).mockResolvedValue(null);
      (prismaMock.codingAgent.findFirst as any).mockResolvedValue(null);
      (prismaMock.issue.create as any).mockResolvedValue({ id: 1, issueId: 42 });
      (prismaMock.issue.findUnique as any).mockResolvedValue({ id: 1, issueId: 42 });
      vi.mocked(getContainerByName).mockResolvedValue(null);
      vi.mocked(createContainer).mockResolvedValue('test-container-id');
      (prismaMock.codingAgent.create as any).mockResolvedValue({
        id: 123,
        caName: 'hra_42'
      });
      (prismaMock.task.create as any).mockResolvedValue({ id: 1 });

      await createIssueFromWebhook(
        42,
        'https://github.com/test/repo/issues/42',
        'Test Issue',
        'Test content'
      );

      const caResult = await createCAForIssue(42, {
        repository: 'test/repo',
        sender: 'testuser',
        action: 'opened'
      });

      expect(caResult.success).toBe(true);
      expect(createContainer).toHaveBeenCalledWith('hra_42', 'https://github.com/test/repo.git');
    });
  });
});
