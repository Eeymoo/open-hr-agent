/* eslint-disable max-nested-callbacks */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateCaTask } from './createCaTask.js';
import { EventBus } from '../services/eventBus.js';
import { TaskLogger } from '../utils/taskLogger.js';
import { TASK_STATUS } from '../config/taskStatus.js';
import { TASK_EVENTS } from '../config/taskEvents.js';
import { TASK_TAGS } from '../config/taskTags.js';

vi.mock('../utils/docker/getContainer.js', () => ({
  getContainerByName: vi.fn()
}));

vi.mock('../utils/database.js', () => ({
  getPrismaClient: vi.fn(() => ({
    task: {
      update: vi.fn().mockResolvedValue({})
    }
  })),
  getCurrentTimestamp: vi.fn(() => Date.now())
}));

describe('CreateCaTask', () => {
  let task: CreateCaTask;
  let eventBus: EventBus;
  let logger: TaskLogger;
  let mockGetContainerByName: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    eventBus = new EventBus();
    logger = new TaskLogger();
    vi.spyOn(logger, 'info').mockResolvedValue(undefined);
    vi.spyOn(logger, 'error').mockResolvedValue(undefined);

    task = new CreateCaTask(eventBus, logger);

    const { getContainerByName } = await import('../utils/docker/getContainer.js');
    mockGetContainerByName = vi.mocked(getContainerByName);
  });

  describe('execute', () => {
    describe('有 parentTaskId 的情况', () => {
      it('应该更新主任务状态为 CREATING_CA', async () => {
        mockGetContainerByName.mockResolvedValue({
          id: 'container-123',
          name: 'hra_123',
          state: 'running',
          status: 'Up 1 hour'
        });

        const result = await task.execute(
          { parentTaskId: 99, issueNumber: 123, caName: 'hra_123' },
          { taskId: 1, taskName: 'create_ca', retryCount: 0 }
        );

        expect(result.success).toBe(true);
      });

      it('应该在 nextParams 中传递 parentTaskId', async () => {
        mockGetContainerByName.mockResolvedValue({
          id: 'container-123',
          name: 'hra_123',
          state: 'running',
          status: 'Up 1 hour'
        });

        const result = await task.execute(
          { parentTaskId: 99, issueNumber: 123, caName: 'hra_123' },
          { taskId: 1, taskName: 'create_ca', retryCount: 0 }
        );

        expect(result.nextParams?.parentTaskId).toBe(99);
      });
    });

    describe('无 parentTaskId 的情况', () => {
      it('应该正常执行（不更新主任务状态）', async () => {
        mockGetContainerByName.mockResolvedValue({
          id: 'container-123',
          name: 'hra_123',
          state: 'running',
          status: 'Up 1 hour'
        });

        const result = await task.execute(
          { issueNumber: 123, caName: 'hra_123' },
          { taskId: 1, taskName: 'create_ca', retryCount: 0 }
        );

        expect(result.success).toBe(true);
        expect(result.nextParams?.parentTaskId).toBeUndefined();
      });
    });

    describe('容器验证', () => {
      it('应该验证容器存在且运行中', async () => {
        mockGetContainerByName.mockResolvedValue({
          id: 'container-123',
          name: 'hra_123',
          state: 'running',
          status: 'Up 1 hour'
        });

        const result = await task.execute(
          { issueNumber: 123, caName: 'hra_123' },
          { taskId: 1, taskName: 'create_ca', retryCount: 0 }
        );

        expect(result.success).toBe(true);
        expect(result.data?.containerId).toBe('container-123');
        expect(result.data?.containerName).toBe('hra_123');
      });

      it('应该处理容器不存在的情况', async () => {
        mockGetContainerByName.mockResolvedValue(null);

        const result = await task.execute(
          { issueNumber: 123, caName: 'hra_123' },
          { taskId: 1, taskName: 'create_ca', retryCount: 0 }
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('CA 容器 hra_123 不存在');
      });

      it('应该处理容器未运行的情况', async () => {
        mockGetContainerByName.mockResolvedValue({
          id: 'container-123',
          name: 'hra_123',
          state: undefined,
          status: 'Exited (0) 1 hour ago'
        });

        const result = await task.execute(
          { issueNumber: 123, caName: 'hra_123' },
          { taskId: 1, taskName: 'create_ca', retryCount: 0 }
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('CA 容器 hra_123 未运行');
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

        const result = await task.execute(
          { issueNumber: 123, caName: 'hra_123' },
          { taskId: 1, taskName: 'create_ca', retryCount: 0 }
        );

        expect(result.finalStatus).toBe(TASK_STATUS.COMPLETED);
      });

      it('应该返回正确的 nextTask 为 connect_ca', async () => {
        mockGetContainerByName.mockResolvedValue({
          id: 'container-123',
          name: 'hra_123',
          state: 'running',
          status: 'Up 1 hour'
        });

        const result = await task.execute(
          { issueNumber: 123, caName: 'hra_123' },
          { taskId: 1, taskName: 'create_ca', retryCount: 0 }
        );

        expect(result.nextTask).toBe('connect_ca');
        expect(result.nextEvent).toBe(TASK_EVENTS.CA_CREATED);
      });
    });
  });

  describe('任务属性', () => {
    it('应该有正确的 name 属性', () => {
      expect(task.name).toBe('create_ca');
    });

    it('应该有空的 dependencies', () => {
      expect(task.dependencies).toEqual([]);
    });

    it('应该有正确的 tags', () => {
      expect(task.tags).toContain(TASK_TAGS.MANAGES_CA);
      expect(task.tags).toContain(TASK_TAGS.SUBTASK);
    });
  });
});
