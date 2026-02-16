import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventBus } from './eventBus.js';
import { TASK_EVENTS } from '../config/taskEvents.js';
import { TASK_STATUS } from '../config/taskStatus.js';
import { getPrismaClient, getCurrentTimestamp } from '../utils/database.js';
import type { BaseTask } from '../tasks/baseTask.js';

vi.mock('../utils/database.js', () => ({
  getPrismaClient: vi.fn(),
  getCurrentTimestamp: vi.fn(() => Date.now() / 1000)
}));

vi.mock('../utils/taskLogger.js', () => {
  return {
    TaskLogger: class MockTaskLogger {
      info = vi.fn().mockResolvedValue(undefined);
      warn = vi.fn().mockResolvedValue(undefined);
      error = vi.fn().mockResolvedValue(undefined);
    }
  };
});

vi.mock('./caResourceManager.js', () => {
  return {
    CAResourceManager: class MockCAResourceManager {
      getAllCA = vi.fn().mockResolvedValue([]);
      getIdleCA = vi.fn().mockResolvedValue(null);
      getCAStatus = vi.fn().mockResolvedValue({
        total: 0,
        idle: 0,
        busy: 0,
        creating: 0,
        error: 0,
        not_found: 0,
        pending_create: 0,
        pending_delete: 0,
        pending_start: 0,
        pending_stop: 0,
        pending_restart: 0,
        pending_update: 0
      });
      canCreateCA = vi.fn().mockResolvedValue(false);
      allocateCA = vi.fn().mockResolvedValue(null);
      releaseCA = vi.fn().mockResolvedValue(undefined);
      createCA = vi.fn().mockResolvedValue({ id: 1, name: 'test-ca', containerId: 'test', status: 'idle' });
    }
  };
});

vi.mock('./taskGarbageCollector.js', () => {
  return {
    TaskGarbageCollector: class MockTaskGarbageCollector {
      collect = vi.fn().mockResolvedValue({
        caCreationFailed: 0,
        caLost: 0,
        longRunningError: 0,
        timeoutTasks: 0,
        cancelledTasks: 0,
        totalCleaned: 0
      });
    }
  };
});

// Import the class dynamically to allow mocks to apply first
const { TaskScheduler } = await import('./taskScheduler.js');

interface MockTask {
  id: number;
  type: string;
  status: string;
  priority: number;
  tags: string[];
  metadata: Record<string, unknown>;
  issueId: number | null;
  prId: number | null;
  createdAt: number;
  updatedAt: number;
  deletedAt: number;
}

interface MockPrisma {
  task: {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  codingAgent: {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  $disconnect: ReturnType<typeof vi.fn>;
}

describe('TaskScheduler', () => {
  let scheduler: InstanceType<typeof TaskScheduler>;
  let eventBus: EventBus;
  let taskRegistry: Map<string, BaseTask>;
  let mockPrisma: MockPrisma;

  beforeEach(() => {
    // Disable fake timers to avoid infinite loop with recursive scheduling
    // vi.useFakeTimers();

    eventBus = new EventBus();
    taskRegistry = new Map<string, BaseTask>();

    const mockBaseTask = {
      execute: vi.fn().mockResolvedValue({ success: true }),
      tags: [],
      dependencies: []
    } as unknown as BaseTask;

    taskRegistry.set('test_task', mockBaseTask);

    mockPrisma = {
      task: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue(null),
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 1 }),
        update: vi.fn().mockResolvedValue({ id: 1 }),
        delete: vi.fn().mockResolvedValue({ id: 1 }),
        count: vi.fn().mockResolvedValue(0)
      },
      codingAgent: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue(null),
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 1 }),
        update: vi.fn().mockResolvedValue({ id: 1 }),
        delete: vi.fn().mockResolvedValue({ id: 1 })
      },
      $disconnect: vi.fn().mockResolvedValue(undefined)
    };

    vi.mocked(getPrismaClient).mockReturnValue(mockPrisma as never);
    vi.mocked(getCurrentTimestamp).mockReturnValue(Date.now() / 1000);

    scheduler = new TaskScheduler(eventBus, taskRegistry);
  });

  afterEach(() => {
    if (scheduler) {
      scheduler.stop();
    }
    eventBus.clear();
    // vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('start', () => {
    it('should load and process queued tasks from database', async () => {
      const queuedTasks: MockTask[] = [
        {
          id: 101,
          type: 'test_task',
          status: TASK_STATUS.QUEUED,
          priority: 50,
          tags: [],
          metadata: { param1: 'value1' },
          issueId: null,
          prId: null,
          createdAt: Date.now() / 1000,
          updatedAt: Date.now() / 1000,
          deletedAt: -2
        }
      ];

      mockPrisma.task.findMany.mockResolvedValueOnce(queuedTasks);
      mockPrisma.task.update.mockResolvedValue({ id: 101, status: TASK_STATUS.RUNNING });

      const taskStartedListener = vi.fn();
      eventBus.register(TASK_EVENTS.TASK_STARTED, taskStartedListener);

      scheduler.start();

      const verifyTaskProcessing = () => {
        expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              status: TASK_STATUS.QUEUED,
              deletedAt: -2
            })
          })
        );

        expect(mockPrisma.task.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: 101 },
            data: expect.objectContaining({
              status: TASK_STATUS.RUNNING
            })
          })
        );
      };

      await vi.waitFor(verifyTaskProcessing);
    });

    it('should not process tasks when queue is empty', async () => {
      mockPrisma.task.findMany.mockResolvedValueOnce([]);

      const taskStartedListener = vi.fn();
      eventBus.register(TASK_EVENTS.TASK_STARTED, taskStartedListener);

      scheduler.start();

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(taskStartedListener).not.toHaveBeenCalled();
    });

    it('should only start once when called multiple times', () => {
      mockPrisma.task.findMany.mockResolvedValue([]);

      scheduler.start();
      scheduler.start();
      scheduler.start();

      expect(mockPrisma.task.findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('addTask', () => {
    it('should enqueue task and trigger scheduleNext', async () => {
      mockPrisma.task.create.mockResolvedValue({
        id: 1,
        type: 'test_task',
        status: TASK_STATUS.QUEUED,
        priority: 50,
        tags: [],
        metadata: {},
        issueId: null,
        prId: null,
        createdAt: Date.now() / 1000,
        updatedAt: Date.now() / 1000,
        deletedAt: -2
      });

      scheduler.start();

      await new Promise((resolve) => setTimeout(resolve, 50));

      const taskId = await scheduler.addTask('test_task', { param1: 'value1' }, 50);
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(taskId).toBe(1);
      expect(mockPrisma.task.create).toHaveBeenCalled();
    });
  });

  describe('scheduleNext', () => {
    it('should call getIdleCA when task has requires:ca tag', async () => {
      const caTask = {
        execute: vi.fn().mockResolvedValue({ success: true }),
        tags: ['requires:ca'],
        dependencies: []
      } as unknown as BaseTask;
      taskRegistry.set('ca_task', caTask);

      mockPrisma.task.create.mockResolvedValue({
        id: 1,
        type: 'ca_task',
        status: TASK_STATUS.QUEUED,
        priority: 50,
        tags: ['requires:ca'],
        metadata: { issueId: 123 },
        issueId: 123,
        prId: null,
        createdAt: Date.now() / 1000,
        updatedAt: Date.now() / 1000,
        deletedAt: -2
      });

      mockPrisma.task.update.mockResolvedValue({
        id: 1,
        status: TASK_STATUS.RUNNING
      });

      const getIdleCASpy = vi
        .spyOn(scheduler['caManager'], 'getIdleCA')
        .mockResolvedValue({
          id: 1,
          name: 'test-ca',
          containerId: 'test',
          status: 'idle',
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      const allocateCASpy = vi
        .spyOn(scheduler['caManager'], 'allocateCA')
        .mockResolvedValue({
          id: 1,
          name: 'test-ca',
          containerId: 'test',
          status: 'busy',
          createdAt: Date.now(),
          updatedAt: Date.now()
        });

      scheduler.start();

      await scheduler.addTask('ca_task', { issueId: 123 }, 50, 123);

      await vi.waitFor(() => {
        expect(getIdleCASpy).toHaveBeenCalled();
      });

      getIdleCASpy.mockRestore();
      allocateCASpy.mockRestore();
    });
  });

  describe('getStatus', () => {
    it('should return correct scheduler status', async () => {
      mockPrisma.task.findMany.mockResolvedValue([]);

      scheduler.start();

      await new Promise((resolve) => setTimeout(resolve, 50));

      const status = await scheduler.getStatus();

      expect(status.running).toBe(true);
      expect(status.queueLength).toBe(0);
      expect(status.currentTasks).toBe(0);
    });
  });
});
