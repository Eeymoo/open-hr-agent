import { EventBus } from '../services/eventBus.js';
import { TaskLogger } from '../utils/taskLogger.js';
import type { TaskEventType } from '../config/taskEvents.js';
import { getPrismaClient, getCurrentTimestamp } from '../utils/database.js';
import { TASK_TAGS, type TaskTag } from '../config/taskTags.js';
import type { Prisma } from '@prisma/client';

export interface TaskResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  finalStatus?: string;
  nextEvent?: string;
  nextTask?: string;
  nextParams?: Record<string, unknown>;
}

export interface TaskContext {
  taskId: number;
  taskName: string;
  issueId?: number;
  prId?: number;
  caId?: number;
  retryCount: number;
}

export abstract class BaseTask {
  abstract readonly name: string;
  abstract readonly dependencies: string[];
  readonly tags: TaskTag[] = [];

  protected eventBus: EventBus;
  protected logger: TaskLogger;

  constructor(eventBus: EventBus, logger: TaskLogger) {
    this.eventBus = eventBus;
    this.logger = logger;
  }

  get needsCA(): boolean {
    return this.tags.includes(TASK_TAGS.REQUIRES_CA);
  }

  abstract execute(_params: Record<string, unknown>, _context: TaskContext): Promise<TaskResult>;

  protected async validateParams(
    params: Record<string, unknown>,
    requiredKeys: string[]
  ): Promise<boolean> {
    const missingKeys = requiredKeys.filter((key) => !(key in params));

    if (missingKeys.length > 0) {
      throw new Error(`缺少必需参数: ${missingKeys.join(', ')}`);
    }

    return true;
  }

  protected async updateTaskMetadata(
    taskId: number,
    metadata: Record<string, unknown>
  ): Promise<void> {
    const prisma = getPrismaClient();
    const now = getCurrentTimestamp();

    await prisma.task.update({
      where: { id: taskId },
      data: {
        metadata: metadata as Prisma.InputJsonValue,
        updatedAt: now
      }
    });
  }

  protected async emitTaskEvent(
    eventType: TaskEventType,
    data: Record<string, unknown>
  ): Promise<void> {
    await this.eventBus.emit(eventType, data);
  }

  protected async updateParentTaskStatus(parentTaskId: number, status: string): Promise<void> {
    const prisma = getPrismaClient();
    const now = getCurrentTimestamp();

    await prisma.task.update({
      where: { id: parentTaskId },
      data: {
        status,
        updatedAt: now
      }
    });
  }
}
