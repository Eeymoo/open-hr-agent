import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TaskScheduler } from './taskScheduler.js';
import { CAResourceManager } from './caResourceManager.js';
import { EventBus } from './eventBus.js';
import { TaskLogger } from '../utils/taskLogger.js';
import { TaskGarbageCollector } from './taskGarbageCollector.js';
import { getPrismaClient, getCurrentTimestamp } from '../utils/database.js';
import { TASK_STATUS } from '../config/taskStatus.js';
import { BaseTask, type TaskContext, type TaskResult } from '../tasks/baseTask.js';

vi.mock('../utils/database.js');
vi.mock('../utils/taskLogger.js');
vi.mock('./taskGarbageCollector.js');

describe('TaskScheduler - CA Creation Race Condition', () => {
  let eventBus: EventBus;
  let taskScheduler: TaskScheduler;
  let taskRegistry: Map<string, BaseTask>;
  let mockPrismaClient: any;

  class MockTask extends BaseTask {
    readonly name = 'mock_task';
    readonly dependencies: string[] = [];
    readonly needsCA = true;

    async execute(_params: Record<string, unknown>, _context: TaskContext): Promise<TaskResult> {
      return { success: true, data: {} };
    }
  }

  beforeEach(() => {
    eventBus = new EventBus();
    taskRegistry = new Map();
    taskRegistry.set('mock_task', new MockTask());
    taskScheduler = new TaskScheduler(eventBus, taskRegistry);

    mockPrismaClient = {
      issue: {
        findUnique: vi.fn()
      },
      codingAgent: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn()
      },
      task: {
        create: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn()
      }
    };

    (getPrismaClient as any).mockReturnValue(mockPrismaClient);
    (getCurrentTimestamp as any).mockReturnValue(Date.now());
  });

  it('should handle concurrent CA creation requests', async () => {
    const issueId = 123;
    const taskId = 456;
    const issueNumber = 1001;
    const containerName = `ca-test${issueNumber}`;

    mockPrismaClient.issue.findUnique.mockResolvedValue({
      id: issueId,
      issueId: issueNumber
    });

    const caRecord = {
      id: 1,
      caName: containerName,
      status: 'creating',
      containerId: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      deletedAt: -2
    };

    mockPrismaClient.codingAgent.create
      .mockResolvedValueOnce(caRecord)
      .mockRejectedValueOnce({
        code: 'P2002',
        message: 'Unique constraint failed on the fields: (caName)'
      });

    mockPrismaClient.codingAgent.findFirst.mockResolvedValue(caRecord);

    taskScheduler.start();

    const createPromise1 = taskScheduler.addTask('mock_task', { issueNumber }, 50, issueId);
    const createPromise2 = taskScheduler.addTask('mock_task', { issueNumber }, 50, issueId);

    await Promise.all([createPromise1, createPromise2]);

    expect(mockPrismaClient.codingAgent.create).toHaveBeenCalledTimes(2);
    expect(mockPrismaClient.codingAgent.findFirst).toHaveBeenCalled();
  });

  it('should reuse existing idle CA instead of creating new one', async () => {
    const issueId = 123;
    const issueNumber = 1002;
    const containerName = `ca-test${issueNumber}`;

    mockPrismaClient.issue.findUnique.mockResolvedValue({
      id: issueId,
      issueId: issueNumber
    });

    const existingCA = {
      id: 2,
      caName: containerName,
      status: 'idle',
      containerId: 'container-123',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      deletedAt: -2
    };

    mockPrismaClient.codingAgent.findFirst.mockResolvedValue(existingCA);
    mockPrismaClient.codingAgent.update.mockResolvedValue(existingCA);

    taskScheduler.start();

    await taskScheduler.addTask('mock_task', { issueNumber }, 50, issueId);

    expect(mockPrismaClient.codingAgent.create).not.toHaveBeenCalled();
    expect(mockPrismaClient.codingAgent.update).toHaveBeenCalledWith({
      where: { id: existingCA.id },
      data: { status: 'busy' }
    });
  });

  it('should fail when trying to create CA for busy CA', async () => {
    const issueId = 123;
    const issueNumber = 1003;
    const containerName = `ca-test${issueNumber}`;

    mockPrismaClient.issue.findUnique.mockResolvedValue({
      id: issueId,
      issueId: issueNumber
    });

    const busyCA = {
      id: 3,
      caName: containerName,
      status: 'busy',
      containerId: 'container-456',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      deletedAt: -2
    };

    mockPrismaClient.codingAgent.findFirst.mockResolvedValue(busyCA);
    mockPrismaClient.codingAgent.update.mockResolvedValue(busyCA);

    taskScheduler.start();

    await expect(taskScheduler.addTask('mock_task', { issueNumber }, 50, issueId)).resolves.toBeGreaterThan(0);
  });

  it('should wait for CA to become idle during creation', async () => {
    const issueId = 123;
    const issueNumber = 1004;
    const containerName = `ca-test${issueNumber}`;

    mockPrismaClient.issue.findUnique.mockResolvedValue({
      id: issueId,
      issueId: issueNumber
    });

    const creatingCA = {
      id: 4,
      caName: containerName,
      status: 'creating',
      containerId: 'container-789',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      deletedAt: -2
    };

    mockPrismaClient.codingAgent.findFirst
      .mockResolvedValueOnce(creatingCA)
      .mockResolvedValueOnce({
        ...creatingCA,
        status: 'idle'
      });

    mockPrismaClient.codingAgent.update.mockResolvedValue({
      ...creatingCA,
      status: 'idle'
    });

    taskScheduler.start();

    await taskScheduler.addTask('mock_task', { issueNumber }, 50, issueId);

    expect(mockPrismaClient.codingAgent.findFirst).toHaveBeenCalled();
  });
});
