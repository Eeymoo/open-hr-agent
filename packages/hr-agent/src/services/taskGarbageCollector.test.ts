import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TaskGarbageCollector } from '../services/taskGarbageCollector.js';
import { TASK_STATUS } from '../config/taskStatus.js';
import { getPrismaClient } from '../utils/database.js';

vi.mock('../utils/database.js', () => ({
  getPrismaClient: vi.fn(),
  getCurrentTimestamp: vi.fn(() => Date.now() / 1000)
}));

interface MockPrisma {
  codingAgent: {
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  task: {
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
}

describe('TaskGarbageCollector', () => {
  let garbageCollector: TaskGarbageCollector;
  let mockPrisma: MockPrisma;

  beforeEach(() => {
    garbageCollector = new TaskGarbageCollector();
    mockPrisma = {
      codingAgent: {
        findMany: vi.fn(),
        update: vi.fn()
      },
      task: {
        findMany: vi.fn(),
        update: vi.fn()
      }
    };

    vi.mocked(getPrismaClient).mockClear();
    vi.mocked(getPrismaClient).mockReturnValue(mockPrisma as never);
  });

  describe('collect', () => {
    it('should return all zeros when there are no tasks to clean', async () => {
      mockPrisma.codingAgent.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.task.findMany = vi.fn().mockResolvedValue([]);

      const stats = await garbageCollector.collect();

      expect(stats).toEqual({
        caCreationFailed: 0,
        caLost: 0,
        longRunningError: 0,
        timeoutTasks: 0,
        cancelledTasks: 0,
        totalCleaned: 0
      });
    });

    it('should clean up CA creation failed tasks', async () => {
      const errorCA = [
        { id: 1, status: 'error', caName: 'test_ca_1' },
        { id: 2, status: 'error', caName: 'test_ca_2' }
      ];

      const tasks = [
        {
          id: 101,
          type: 'testTask',
          caId: 1,
          status: TASK_STATUS.RUNNING,
          metadata: {},
          deletedAt: -2
        },
        {
          id: 102,
          type: 'testTask',
          caId: 2,
          status: TASK_STATUS.RETRYING,
          metadata: {},
          deletedAt: -2
        }
      ];

      let callCount = 0;
      const mockTaskFindMany = (): Promise<unknown[]> => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve(tasks);
        }
        return Promise.resolve([]);
      };

      mockPrisma.codingAgent.findMany = vi.fn().mockResolvedValue(errorCA);
      mockPrisma.task.findMany = vi.fn().mockImplementation(mockTaskFindMany);
      mockPrisma.task.update = vi.fn().mockResolvedValue({});

      const stats = await garbageCollector.collect();

      expect(stats.caCreationFailed).toBe(2);
      expect(mockPrisma.task.update).toHaveBeenCalledTimes(2);
    });

    it('should clean up CA lost tasks', async () => {
      const now = Date.now() / 1000;
      const oldTime = now - 700;

      const allCA = [
        { id: 1, status: 'creating', containerId: null, createdAt: oldTime },
        { id: 2, status: 'idle', containerId: null, createdAt: now }
      ];

      const tasks = [
        {
          id: 201,
          type: 'testTask',
          caId: 1,
          status: TASK_STATUS.QUEUED,
          metadata: {},
          deletedAt: -2
        }
      ];

      mockPrisma.codingAgent.findMany = vi.fn().mockResolvedValue(allCA);
      mockPrisma.task.findMany = vi.fn().mockResolvedValue(tasks);
      mockPrisma.task.update = vi.fn().mockResolvedValue({});
      mockPrisma.codingAgent.update = vi.fn().mockResolvedValue({});

      const stats = await garbageCollector.collect();

      expect(stats.caLost).toBe(1);
    });

    it('should clean up long running error tasks', async () => {
      const oldTime = (Date.now() - 90000000) / 1000;

      const errorTasks = [
        { id: 301, type: 'testTask', status: TASK_STATUS.ERROR, createdAt: oldTime, deletedAt: -2 },
        { id: 302, type: 'testTask', status: TASK_STATUS.ERROR, createdAt: oldTime, deletedAt: -2 }
      ];

      mockPrisma.codingAgent.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.task.findMany = vi.fn().mockResolvedValue(errorTasks);
      mockPrisma.task.update = vi.fn().mockResolvedValue({});

      const stats = await garbageCollector.collect();

      expect(stats.longRunningError).toBe(2);
    });

    it('should clean up timeout tasks', async () => {
      const timeoutTasks = [
        { id: 401, type: 'testTask', status: TASK_STATUS.TIMEOUT, metadata: {}, deletedAt: -2 },
        { id: 402, type: 'testTask', status: TASK_STATUS.TIMEOUT, metadata: {}, deletedAt: -2 }
      ];

      mockPrisma.codingAgent.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.task.findMany = vi.fn().mockResolvedValue(timeoutTasks);
      mockPrisma.task.update = vi.fn().mockResolvedValue({});

      const stats = await garbageCollector.collect();

      expect(stats.timeoutTasks).toBe(2);
    });

    it('should clean up cancelled tasks', async () => {
      const cancelledTasks = [
        { id: 501, type: 'testTask', status: TASK_STATUS.CANCELLED, deletedAt: -2 },
        { id: 502, type: 'testTask', status: TASK_STATUS.CANCELLED, deletedAt: -2 }
      ];

      mockPrisma.codingAgent.findMany = vi.fn().mockResolvedValue([]);
      mockPrisma.task.findMany = vi.fn().mockResolvedValue(cancelledTasks);
      mockPrisma.task.update = vi.fn().mockResolvedValue({});

      const stats = await garbageCollector.collect();

      expect(stats.cancelledTasks).toBe(2);
    });
  });
});
