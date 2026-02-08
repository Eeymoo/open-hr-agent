import { EventBus } from './eventBus.js';
import { TaskScheduler, type SchedulerStatus } from './taskScheduler.js';
import { TaskLogger } from '../utils/taskLogger.js';

export class TaskManager {
  private scheduler: TaskScheduler;
  private logger: TaskLogger;

  constructor(_eventBus: EventBus, scheduler: TaskScheduler) {
    this.scheduler = scheduler;
    this.logger = new TaskLogger();
  }

  start(): void {
    this.scheduler.start();
    this.logger.info(0, 'TaskManager', '任务管理器已启动');
  }

  stop(): void {
    this.scheduler.stop();
    this.logger.info(0, 'TaskManager', '任务管理器已停止');
  }

  // eslint-disable-next-line max-params
  async run(
    taskName: string,
    params: Record<string, unknown>,
    priority?: number,
    issueId?: number,
    prId?: number
  ): Promise<number> {
    return this.scheduler.addTask(taskName, params, priority, issueId, prId);
  }

  async apiRun(uri: string, params: Record<string, unknown>): Promise<number> {
    const taskName = this.parseUriToTaskName(uri);
    return this.run(taskName, params);
  }

  private parseUriToTaskName(uri: string): string {
    const parts = uri.split('/').filter(Boolean);

    if (parts.length >= 2 && parts[0] === 'tasks') {
      return parts[1];
    }

    throw new Error(`无效的 URI: ${uri}`);
  }

  async getStatus(): Promise<SchedulerStatus> {
    return this.scheduler.getStatus();
  }
}
