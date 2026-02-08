import { TaskQueue, type QueuedTask } from '../utils/taskQueue.js';
import { CAResourceManager } from './caResourceManager.js';
import { EventBus } from './eventBus.js';
import { RetryManager } from '../utils/retryManager.js';
import { TaskLogger } from '../utils/taskLogger.js';
import { TaskGarbageCollector } from './taskGarbageCollector.js';
import { getPrismaClient, getCurrentTimestamp } from '../utils/database.js';
import { TASK_CONFIG } from '../config/taskConfig.js';
import { TASK_EVENTS } from '../config/taskEvents.js';
import { TASK_STATUS } from '../config/taskStatus.js';
import type { BaseTask } from '../tasks/baseTask.js';
import type { Prisma } from '@prisma/client';

export interface SchedulerStatus {
  running: boolean;
  queueLength: number;
  caPool: {
    total: number;
    idle: number;
    busy: number;
    creating: number;
    error: number;
  };
  currentTasks: number;
}

export class TaskScheduler {
  private taskQueue: TaskQueue;
  private caManager: CAResourceManager;
  private eventBus: EventBus;
  private retryManager: RetryManager;
  private logger: TaskLogger;
  private garbageCollector: TaskGarbageCollector;
  private taskRegistry: Map<string, BaseTask>;
  private runningTasks: Set<number> = new Set();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  constructor(eventBus: EventBus, taskRegistry: Map<string, BaseTask>) {
    this.taskQueue = new TaskQueue();
    this.eventBus = eventBus;
    this.taskRegistry = taskRegistry;
    this.caManager = new CAResourceManager(eventBus);
    this.retryManager = new RetryManager();
    this.logger = new TaskLogger();
    this.garbageCollector = new TaskGarbageCollector();

    this.registerEventListeners();
  }

  private registerEventListeners(): void {
    this.eventBus.register(TASK_EVENTS.TASK_COMPLETED, async (data) => {
      const { taskId, caId } = data as { taskId: number; caId?: number };
      if (caId) {
        await this.releaseCAForTask(taskId, caId);
      }
      this.runningTasks.delete(taskId);
      this.retryManager.clearRetry(taskId);
      await this.garbageCollector.collect();
    });

    this.eventBus.register(TASK_EVENTS.TASK_FAILED, async (data) => {
      const { taskId, caId } = data as { taskId: number; caId?: number };
      if (caId) {
        await this.releaseCAForTask(taskId, caId);
      }
      this.runningTasks.delete(taskId);
      this.retryManager.clearRetry(taskId);
      await this.garbageCollector.collect();
    });

    this.eventBus.register(TASK_EVENTS.TASK_TIMEOUT, async () => {
      await this.garbageCollector.collect();
    });

    this.eventBus.register(TASK_EVENTS.TASK_CANCELLED, async () => {
      await this.garbageCollector.collect();
    });

    this.eventBus.register(TASK_EVENTS.CA_ERROR, async () => {
      await this.garbageCollector.collect();
    });

    this.eventBus.register(TASK_EVENTS.CA_CREATED, async () => {
      await this.garbageCollector.collect();
      await this.scheduleNext();
    });

    this.eventBus.register(TASK_EVENTS.CA_RELEASED, async () => {
      await this.garbageCollector.collect();
      await this.scheduleNext();
    });

    this.eventBus.register(TASK_EVENTS.PR_MERGED, async (data) => {
      const { caId } = data as { caId: number };
      if (caId) {
        await this.caManager.destroyCA(caId);
      }
      await this.garbageCollector.collect();
    });
  }

  start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    this.monitoringInterval = setInterval(async () => {
      await this.monitor();
    }, TASK_CONFIG.MONITOR_INTERVAL);

    this.loadQueuedTasks();

    this.scheduleNext();
  }

  private async loadQueuedTasks(): Promise<void> {
    const prisma = getPrismaClient();

    const queuedTasks = await prisma.task.findMany({
      where: {
        status: TASK_STATUS.QUEUED,
        deletedAt: -2
      },
      include: {
        issue: true,
        pullRequest: true
      },
      orderBy: {
        priority: 'desc'
      }
    });

    for (const taskRecord of queuedTasks) {
      const task = this.taskRegistry.get(taskRecord.type);

      this.taskQueue.enqueue({
        taskId: taskRecord.id,
        taskName: taskRecord.type,
        params: (taskRecord.metadata as Record<string, unknown>) ?? {},
        priority: taskRecord.priority,
        issueId: taskRecord.issueId ?? undefined,
        prId: taskRecord.prId ?? undefined,
        retryCount: 0,
        createdAt: taskRecord.createdAt,
        dependencies: task?.dependencies ?? []
      });

      await this.logger.info(taskRecord.id, taskRecord.type, '已从数据库加载到队列', {
        priority: taskRecord.priority
      });
    }

    if (queuedTasks.length > 0) {
      await this.logger.info(
        0,
        'Scheduler',
        `已从数据库加载 ${queuedTasks.length} 个待执行任务到队列`
      );
    }
  }

  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  // eslint-disable-next-line max-params
  async addTask(
    taskName: string,
    params: Record<string, unknown>,
    priority: number = 50,
    issueId?: number,
    prId?: number
  ): Promise<number> {
    const prisma = getPrismaClient();
    const now = getCurrentTimestamp();

    const taskRecord = await prisma.task.create({
      data: {
        type: taskName,
        status: TASK_STATUS.QUEUED,
        priority,
        issue: issueId ? { connect: { id: issueId } } : undefined,
        pullRequest: prId ? { connect: { id: prId } } : undefined,
        metadata: params as Prisma.InputJsonValue,
        completedAt: -2,
        deletedAt: -2,
        createdAt: now,
        updatedAt: now
      }
    });

    const taskId = taskRecord.id;

    const task = this.taskRegistry.get(taskName);
    const dependencies = task?.dependencies ?? [];

    this.taskQueue.enqueue({
      taskId,
      taskName,
      params,
      priority,
      issueId,
      prId,
      retryCount: 0,
      createdAt: now,
      dependencies
    });

    await this.eventBus.emit(TASK_EVENTS.TASK_QUEUED, {
      taskId,
      taskName,
      priority
    });

    await this.logger.info(taskId, taskName, '任务已加入队列', { priority });

    await this.scheduleNext();

    return taskId;
  }

  async scheduleNext(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    const task = this.taskQueue.dequeue();
    if (!task) {
      await this.garbageCollector.collect();
      return;
    }

    const taskInstance = this.taskRegistry.get(task.taskName);
    const needsCA = taskInstance?.needsCA ?? false;

    if (needsCA) {
      const ca = await this.allocateCAForTask(task);

      if (!ca) {
        this.taskQueue.enqueue(task);
        return;
      }

      task.caId = ca.id;
    }

    await this.executeTask(task);
  }

  private async allocateCAForTask(task: QueuedTask): Promise<{ id: number } | null> {
    const ca = await this.caManager.getIdleCA();

    if (ca) {
      await this.caManager.allocateCA(task.taskId);
      return { id: ca.id };
    }

    const canCreate = await this.caManager.canCreateCA();

    if (!canCreate) {
      return null;
    }

    if (!task.issueId) {
      return null;
    }

    const issueNumber = await this.getIssueNumber(task.issueId);
    if (!issueNumber) {
      return null;
    }

    const caResource = await this.caManager.createCA(issueNumber, task.taskId);

    await this.waitForCAReady(caResource.id);

    return { id: caResource.id };
  }

  private async waitForCAReady(caId: number): Promise<void> {
    const maxWait = 60000;
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      const ca = Array.from(await this.caManager.getAllCA()).find((c) => c.id === caId);

      if (ca?.status === 'idle') {
        return;
      }

      if (ca?.status === 'error') {
        throw new Error(`CA ${caId} 创建失败`);
      }

      // eslint-disable-next-line no-magic-numbers
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    throw new Error(`CA ${caId} 创建超时`);
  }

  private async getIssueNumber(issueId: number): Promise<number | null> {
    const prisma = getPrismaClient();
    const issue = await prisma.issue.findUnique({
      where: { id: issueId }
    });

    return issue?.issueId ?? null;
  }

  private async executeTask(task: QueuedTask): Promise<void> {
    const taskInstance = this.taskRegistry.get(task.taskName);

    if (!taskInstance) {
      await this.logger.error(task.taskId, task.taskName, '任务不存在');
      await this.eventBus.emit(TASK_EVENTS.TASK_FAILED, {
        taskId: task.taskId,
        error: '任务不存在'
      });
      return;
    }

    this.runningTasks.add(task.taskId);

    await this.updateTaskStatus(task.taskId, TASK_STATUS.RUNNING);

    await this.eventBus.emit(TASK_EVENTS.TASK_STARTED, {
      taskId: task.taskId,
      taskName: task.taskName
    });

    await this.logger.info(task.taskId, task.taskName, '任务开始执行');

    try {
      const result = await taskInstance.execute(task.params, {
        taskId: task.taskId,
        taskName: task.taskName,
        issueId: task.issueId,
        prId: task.prId,
        caId: task.caId,
        retryCount: task.retryCount
      });

      if (result.success) {
        await this.onTaskSuccess(task, result);
      } else {
        await this.onTaskFailure(task, new Error(result.error ?? '任务执行失败'));
      }
    } catch (error) {
      await this.onTaskFailure(task, error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async onTaskSuccess(task: QueuedTask, result: unknown): Promise<void> {
    await this.updateTaskStatus(task.taskId, TASK_STATUS.PR_SUBMITTED);

    await this.eventBus.emitAsync(TASK_EVENTS.TASK_COMPLETED, {
      taskId: task.taskId,
      taskName: task.taskName,
      result,
      caId: task.caId ?? undefined
    });

    await this.logger.info(task.taskId, task.taskName, '任务执行成功', { result });

    if (
      typeof result === 'object' &&
      result !== null &&
      'nextEvent' in result &&
      'nextTask' in result
    ) {
      const typedResult = result as {
        nextEvent: string;
        nextTask: string;
        nextParams: Record<string, unknown>;
      };

      await this.addTask(
        typedResult.nextTask,
        typedResult.nextParams,
        task.priority,
        task.issueId,
        task.prId
      );
    }

    await this.scheduleNext();
  }

  private async onTaskFailure(task: QueuedTask, error: Error): Promise<void> {
    await this.logger.error(task.taskId, task.taskName, `任务执行失败: ${error.message}`);

    const retryCount = this.retryManager.incrementRetry(task.taskId);

    if (this.retryManager.canRetry(task.taskId)) {
      const delay = this.retryManager.getNextRetryDelay(task.taskId);

      if (!delay) {
        throw new Error('Retry delay is null');
      }

      await this.updateTaskStatus(task.taskId, TASK_STATUS.RETRYING);

      await this.eventBus.emitAsync(TASK_EVENTS.TASK_RETRYING, {
        taskId: task.taskId,
        taskName: task.taskName,
        retryCount,
        delay,
        error: error.message
      });

      await this.logger.warn(task.taskId, task.taskName, `准备第 ${retryCount} 次重试`, { delay });

      setTimeout(async () => {
        this.taskQueue.enqueue(task);
        await this.scheduleNext();
      }, delay);
    } else {
      await this.updateTaskStatus(task.taskId, TASK_STATUS.ERROR);

      await this.eventBus.emitAsync(TASK_EVENTS.TASK_FAILED, {
        taskId: task.taskId,
        taskName: task.taskName,
        error: error.message,
        issueId: task.issueId,
        prId: task.prId,
        caId: task.caId ?? undefined
      });

      await this.logger.error(
        task.taskId,
        task.taskName,
        `任务失败，超过最大重试次数 (${TASK_CONFIG.MAX_RETRY_COUNT})`
      );
    }
  }

  private async releaseCAForTask(_taskId: number, caId: number): Promise<void> {
    await this.caManager.releaseCA(caId);
  }

  private async updateTaskStatus(taskId: number, status: string): Promise<void> {
    const prisma = getPrismaClient();
    const now = getCurrentTimestamp();

    await prisma.task.update({
      where: { id: taskId },
      data: {
        status,
        updatedAt: now
      }
    });
  }

  private async monitor(): Promise<void> {
    const prisma = getPrismaClient();
    const now = getCurrentTimestamp();

    const runningTasks = await prisma.task.findMany({
      where: {
        status: TASK_STATUS.RUNNING,
        deletedAt: -2
      }
    });

    for (const task of runningTasks) {
      // eslint-disable-next-line no-magic-numbers
      const elapsed = (now - task.updatedAt) * 1000;

      if (elapsed > TASK_CONFIG.TASK_TIMEOUT) {
        await this.eventBus.emitAsync(TASK_EVENTS.TASK_TIMEOUT, {
          taskId: task.id,
          taskName: task.type,
          elapsed
        });

        await this.logger.warn(task.id, task.type, `任务超时，已运行 ${elapsed}ms`);
      }
    }

    const caStatus = await this.caManager.getCAStatus();
    await this.logger.info(0, 'Scheduler', 'CA 状态监控', caStatus);
  }

  async getStatus(): Promise<SchedulerStatus> {
    const caStatus = await this.caManager.getCAStatus();

    return {
      running: this.isRunning,
      queueLength: this.taskQueue.getLength(),
      caPool: caStatus,
      currentTasks: this.runningTasks.size
    };
  }
}
