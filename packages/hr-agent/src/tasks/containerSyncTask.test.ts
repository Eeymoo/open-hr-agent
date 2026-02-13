import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContainerSyncTask } from './containerSyncTask.js';
import { EventBus } from '../services/eventBus.js';
import { TaskLogger } from '../utils/taskLogger.js';
import { TASK_TAGS } from '../config/taskTags.js';

vi.mock('../utils/docker/listContainers.js', () => ({
  listContainers: vi.fn()
}));

vi.mock('../utils/database.js', () => ({
  getPrismaClient: vi.fn(() => ({
    codingAgent: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn()
    }
  })),
  getCurrentTimestamp: vi.fn(() => Date.now())
}));

describe('ContainerSyncTask', () => {
  let task: ContainerSyncTask;
  let eventBus: EventBus;
  let logger: TaskLogger;
  let mockListContainers: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    eventBus = new EventBus();
    logger = new TaskLogger();
    vi.spyOn(logger, 'info').mockResolvedValue(undefined);
    vi.spyOn(logger, 'error').mockResolvedValue(undefined);

    task = new ContainerSyncTask(eventBus, logger);

    const { listContainers } = await import('../utils/docker/listContainers.js');
    mockListContainers = vi.mocked(listContainers);
  });

  describe('execute', () => {
    it('应该处理 Docker API 错误', async () => {
      mockListContainers.mockRejectedValue(new Error('Docker error'));

      const result = await task.execute(
        {},
        { taskId: 1, taskName: 'container_sync', retryCount: 0 }
      );

      expect(result.success).toBe(false);
    });
  });

  describe('任务属性', () => {
    it('应该有正确的 name 属性', () => {
      expect(task.name).toBe('container_sync');
    });

    it('应该有空的 dependencies', () => {
      expect(task.dependencies).toEqual([]);
    });

    it('应该有 MANAGES_CA tag', () => {
      expect(task.tags).toContain(TASK_TAGS.MANAGES_CA);
    });
  });
});
