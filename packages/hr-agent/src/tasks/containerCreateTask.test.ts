import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContainerCreateTask } from './containerCreateTask.js';
import { EventBus } from '../services/eventBus.js';
import { TaskLogger } from '../utils/taskLogger.js';
import { TASK_TAGS } from '../config/taskTags.js';

vi.mock('../utils/docker/createContainer.js', () => ({
  createContainer: vi.fn()
}));

vi.mock('../utils/database.js', () => ({
  getPrismaClient: vi.fn(() => ({
    codingAgent: {
      findUnique: vi.fn(),
      update: vi.fn()
    }
  })),
  getCurrentTimestamp: vi.fn(() => Date.now())
}));

type MockPrismaClient = {
  codingAgent: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

describe('ContainerCreateTask', () => {
  let task: ContainerCreateTask;
  let eventBus: EventBus;
  let logger: TaskLogger;
  let mockCreateContainer: ReturnType<typeof vi.fn>;
  let mockPrisma: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    eventBus = new EventBus();
    logger = new TaskLogger();
    vi.spyOn(logger, 'info').mockResolvedValue(undefined);
    vi.spyOn(logger, 'warn').mockResolvedValue(undefined);
    vi.spyOn(logger, 'error').mockResolvedValue(undefined);

    task = new ContainerCreateTask(eventBus, logger);

    const { createContainer } = await import('../utils/docker/createContainer.js');
    mockCreateContainer = vi.mocked(createContainer);
    mockCreateContainer.mockClear();

    const { getPrismaClient } = await import('../utils/database.js');
    mockPrisma = vi.mocked(getPrismaClient);
    mockPrisma.mockClear();
  });

  describe('execute', () => {
    it('应该从 dockerConfig 中读取 repoUrl 并传递给 createContainer', async () => {
      const repoUrl = 'git@github.com:owner/repo.git';
      const mockCARecord = {
        id: 1,
        caName: 'test-ca',
        status: 'pending_create',
        dockerConfig: {
          image: 'test-image',
          network: 'test-network',
          repoUrl
        }
      };

      mockPrisma.mockReturnValue({
        codingAgent: {
          findUnique: vi.fn().mockResolvedValue(mockCARecord),
          update: vi.fn().mockResolvedValue({})
        }
      } as unknown as MockPrismaClient);

      mockCreateContainer.mockResolvedValue('container-id-123');

      const result = await task.execute(
        { caId: 1, caName: 'test-ca' },
        { taskId: 1, taskName: 'container_create', retryCount: 0 }
      );

      expect(mockCreateContainer).toHaveBeenCalledWith('test-ca', repoUrl);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        caId: 1,
        caName: 'test-ca',
        containerId: 'container-id-123'
      });
    });

    it('当没有 repoUrl 时应该传递 undefined 给 createContainer', async () => {
      const mockCARecord = {
        id: 1,
        caName: 'test-ca',
        status: 'pending_create',
        dockerConfig: {
          image: 'test-image',
          network: 'test-network'
        }
      };

      mockPrisma.mockReturnValue({
        codingAgent: {
          findUnique: vi.fn().mockResolvedValue(mockCARecord),
          update: vi.fn().mockResolvedValue({})
        }
      } as unknown as MockPrismaClient);

      mockCreateContainer.mockResolvedValue('container-id-123');

      const result = await task.execute(
        { caId: 1, caName: 'test-ca' },
        { taskId: 1, taskName: 'container_create', retryCount: 0 }
      );

      expect(mockCreateContainer).toHaveBeenCalledWith('test-ca', undefined);
      expect(result.success).toBe(true);
    });

    it('当 dockerConfig 为 null 时应该传递 undefined 给 createContainer', async () => {
      const mockCARecord = {
        id: 1,
        caName: 'test-ca',
        status: 'pending_create',
        dockerConfig: null
      };

      mockPrisma.mockReturnValue({
        codingAgent: {
          findUnique: vi.fn().mockResolvedValue(mockCARecord),
          update: vi.fn().mockResolvedValue({})
        }
      } as unknown as MockPrismaClient);

      mockCreateContainer.mockResolvedValue('container-id-123');

      const result = await task.execute(
        { caId: 1, caName: 'test-ca' },
        { taskId: 1, taskName: 'container_create', retryCount: 0 }
      );

      expect(mockCreateContainer).toHaveBeenCalledWith('test-ca', undefined);
      expect(result.success).toBe(true);
    });

    it('当 CA 状态不是 pending_create 时应该跳过创建', async () => {
      const mockCARecord = {
        id: 1,
        caName: 'test-ca',
        status: 'idle',
        dockerConfig: {}
      };

      mockPrisma.mockReturnValue({
        codingAgent: {
          findUnique: vi.fn().mockResolvedValue(mockCARecord),
          update: vi.fn().mockResolvedValue({})
        }
      } as unknown as MockPrismaClient);

      const result = await task.execute(
        { caId: 1, caName: 'test-ca' },
        { taskId: 1, taskName: 'container_create', retryCount: 0 }
      );

      expect(mockCreateContainer).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        caId: 1,
        caName: 'test-ca',
        skipped: true,
        reason: 'status_not_pending_create'
      });
    });

    it('当 CA 记录不存在时应该返回错误', async () => {
      mockPrisma.mockReturnValue({
        codingAgent: {
          findUnique: vi.fn().mockResolvedValue(null),
          update: vi.fn().mockResolvedValue({})
        }
      } as unknown as MockPrismaClient);

      const result = await task.execute(
        { caId: 999, caName: 'non-existent-ca' },
        { taskId: 1, taskName: 'container_create', retryCount: 0 }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('CA 记录不存在');
    });
  });

  describe('任务属性', () => {
    it('应该有正确的 name 属性', () => {
      expect(task.name).toBe('container_create');
    });

    it('应该有空的 dependencies', () => {
      expect(task.dependencies).toEqual([]);
    });

    it('应该有 MANAGES_CA tag', () => {
      expect(task.tags).toContain(TASK_TAGS.MANAGES_CA);
    });
  });
});
