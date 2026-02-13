/* eslint-disable max-nested-callbacks */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DestroyCaTask } from './destroyCaTask.js';
import { EventBus } from '../services/eventBus.js';
import { TaskLogger } from '../utils/taskLogger.js';
import { TASK_STATUS } from '../config/taskStatus.js';
import { TASK_TAGS } from '../config/taskTags.js';

vi.mock('../utils/docker/getContainer.js', () => ({
  getContainerByName: vi.fn()
}));

vi.mock('../utils/docker/deleteContainer.js', () => ({
  deleteContainer: vi.fn()
}));

vi.mock('../utils/database.js', () => ({
  getPrismaClient: vi.fn(() => ({
    task: {
      update: vi.fn().mockResolvedValue({})
    }
  })),
  getCurrentTimestamp: vi.fn(() => Date.now())
}));

describe('DestroyCaTask', () => {
  let task: DestroyCaTask;
  let eventBus: EventBus;
  let logger: TaskLogger;
  let mockGetContainerByName: ReturnType<typeof vi.fn>;
  let mockDeleteContainer: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    eventBus = new EventBus();
    logger = new TaskLogger();
    vi.spyOn(logger, 'info').mockResolvedValue(undefined);
    vi.spyOn(logger, 'warn').mockResolvedValue(undefined);
    vi.spyOn(logger, 'error').mockResolvedValue(undefined);

    task = new DestroyCaTask(eventBus, logger);

    const { getContainerByName } = await import('../utils/docker/getContainer.js');
    const { deleteContainer } = await import('../utils/docker/deleteContainer.js');
    mockGetContainerByName = vi.mocked(getContainerByName);
    mockDeleteContainer = vi.mocked(deleteContainer);
  });

  describe('execute', () => {
    describe('有 parentTaskId 的情况', () => {
      it('应该更新主任务状态为 COMPLETED', async () => {
        mockGetContainerByName.mockResolvedValue({
          id: 'container-123',
          name: 'hra_123',
          state: 'running',
          status: 'Up 1 hour'
        });
        mockDeleteContainer.mockResolvedValue(undefined);

        const result = await task.execute(
          { parentTaskId: 99, caName: 'hra_123' },
          { taskId: 1, taskName: 'destroy_ca', retryCount: 0 }
        );

        expect(result.success).toBe(true);
        expect(result.finalStatus).toBe(TASK_STATUS.COMPLETED);
      });
    });

    describe('容器销毁', () => {
      it('应该正常销毁容器', async () => {
        mockGetContainerByName.mockResolvedValue({
          id: 'container-123',
          name: 'hra_123',
          state: 'running',
          status: 'Up 1 hour'
        });
        mockDeleteContainer.mockResolvedValue(undefined);

        const result = await task.execute(
          { caName: 'hra_123' },
          { taskId: 1, taskName: 'destroy_ca', retryCount: 0 }
        );

        expect(result.success).toBe(true);
        expect(mockDeleteContainer).toHaveBeenCalledWith('hra_123');
      });

      it('应该处理容器不存在', async () => {
        mockGetContainerByName.mockResolvedValue(null);

        const result = await task.execute(
          { caName: 'hra_123' },
          { taskId: 1, taskName: 'destroy_ca', retryCount: 0 }
        );

        expect(result.success).toBe(true);
        expect(logger.warn).toHaveBeenCalledWith(
          1,
          'destroy_ca',
          'CA 容器不存在，跳过销毁',
          { caName: 'hra_123' }
        );
      });
    });

    describe('错误处理', () => {
      it('应该捕获删除错误但仍然返回成功', async () => {
        mockGetContainerByName.mockResolvedValue({
          id: 'container-123',
          name: 'hra_123',
          state: 'running',
          status: 'Up 1 hour'
        });
        mockDeleteContainer.mockRejectedValue(new Error('Docker error'));

        const result = await task.execute(
          { caName: 'hra_123' },
          { taskId: 1, taskName: 'destroy_ca', retryCount: 0 }
        );

        expect(result.success).toBe(true);
        expect(result.finalStatus).toBe(TASK_STATUS.COMPLETED);
      });

      it('应该在返回数据中包含警告信息', async () => {
        mockGetContainerByName.mockResolvedValue({
          id: 'container-123',
          name: 'hra_123',
          state: 'running',
          status: 'Up 1 hour'
        });
        mockDeleteContainer.mockRejectedValue(new Error('Docker error'));

        const result = await task.execute(
          { caName: 'hra_123' },
          { taskId: 1, taskName: 'destroy_ca', retryCount: 0 }
        );

        expect(result.data?.warning).toContain('Docker error');
      });
    });

    describe('返回值', () => {
      it('应该返回 finalStatus 为 COMPLETED', async () => {
        mockGetContainerByName.mockResolvedValue({
          id: 'container-123',
          name: 'hra_123',
          state: 'running',
          status: 'Up 1 hour'
        });
        mockDeleteContainer.mockResolvedValue(undefined);

        const result = await task.execute(
          { caName: 'hra_123' },
          { taskId: 1, taskName: 'destroy_ca', retryCount: 0 }
        );

        expect(result.finalStatus).toBe(TASK_STATUS.COMPLETED);
      });
    });
  });

  describe('任务属性', () => {
    it('应该有正确的 name 属性', () => {
      expect(task.name).toBe('destroy_ca');
    });

    it('应该有正确的 dependencies', () => {
      expect(task.dependencies).toEqual(['create_pr']);
    });

    it('应该有正确的 tags', () => {
      expect(task.tags).toContain(TASK_TAGS.MANAGES_CA);
      expect(task.tags).toContain(TASK_TAGS.SUBTASK);
    });
  });
});
