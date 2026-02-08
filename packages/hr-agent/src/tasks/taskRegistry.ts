import { BaseTask } from './baseTask.js';
import { EventBus } from '../services/eventBus.js';
import { TaskLogger } from '../utils/taskLogger.js';
import { CreateCaTask } from './createCaTask.js';
import { ConnectCaTask } from './connectCaTask.js';
import { AiCodingTask } from './aiCodingTask.js';
import { CreatePrTask } from './createPrTask.js';
import { DestroyCaTask } from './destroyCaTask.js';
import { CheckCaTask } from './checkCaTask.js';
import { ErrorHandlerTask } from './errorHandlerTask.js';

export class TaskRegistry {
  private registry: Map<string, BaseTask> = new Map();

  constructor(eventBus: EventBus, logger: TaskLogger) {
    this.register(new CreateCaTask(eventBus, logger));
    this.register(new ConnectCaTask(eventBus, logger));
    this.register(new AiCodingTask(eventBus, logger));
    this.register(new CreatePrTask(eventBus, logger));
    this.register(new DestroyCaTask(eventBus, logger));
    this.register(new CheckCaTask(eventBus, logger));
    this.register(new ErrorHandlerTask(eventBus, logger));
  }

  register(task: BaseTask): void {
    this.registry.set(task.name, task);
  }

  get(taskName: string): BaseTask | undefined {
    return this.registry.get(taskName);
  }

  getAll(): BaseTask[] {
    return Array.from(this.registry.values());
  }

  getAllTaskNames(): string[] {
    return Array.from(this.registry.keys());
  }
}
