/**
 * 排队中的任务接口
 */
export interface QueuedTask {
  /** 任务 ID */
  taskId: number;
  /** 任务名称 */
  taskName: string;
  /** 任务参数 */
  params: Record<string, unknown>;
  /** 优先级 */
  priority: number;
  /** 任务标签 */
  tags: string[];
  /** 关联的 Issue ID */
  issueId?: number;
  /** 关联的 PR ID */
  prId?: number;
  /** 关联的 CA ID */
  caId?: number;
  /** 重试次数 */
  retryCount: number;
  /** 创建时间 */
  createdAt: number;
  /** 依赖任务列表 */
  dependencies: string[];
}

/**
 * 任务队列
 * 用于管理待执行的任务，支持优先级排序
 */
export class TaskQueue {
  /** 任务队列 */
  private queue: QueuedTask[] = [];

  /**
   * 将任务加入队列
   * @param task - 要加入的任务
   */
  enqueue(task: QueuedTask): void {
    this.queue.push(task);
    this.queue.sort((a, b) => b.priority - a.priority);
  }

  /**
   * 从队列中取出一个任务
   * @returns 队列中的任务，队列为空则返回 null
   */
  dequeue(): QueuedTask | null {
    return this.queue.shift() ?? null;
  }

  /**
   * 获取队列长度
   * @returns 队列中的任务数量
   */
  getLength(): number {
    return this.queue.length;
  }

  /**
   * 获取队列中的所有任务（副本）
   * @returns 任务数组的副本
   */
  getTasks(): QueuedTask[] {
    return [...this.queue];
  }

  /**
   * 从队列中移除指定任务
   * @param taskId - 任务 ID
   * @returns 是否成功移除
   */
  removeTask(taskId: number): boolean {
    const index = this.queue.findIndex((t) => t.taskId === taskId);
    if (index !== -1) {
      this.queue.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * 清空队列
   */
  clear(): void {
    this.queue = [];
  }
}
