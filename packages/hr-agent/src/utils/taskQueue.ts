export interface QueuedTask {
  taskId: number;
  taskName: string;
  params: Record<string, unknown>;
  priority: number;
  issueId?: number;
  prId?: number;
  caId?: number;
  retryCount: number;
  createdAt: number;
  dependencies: string[];
}

export class TaskQueue {
  private queue: QueuedTask[] = [];

  enqueue(task: QueuedTask): void {
    this.queue.push(task);
    this.queue.sort((a, b) => b.priority - a.priority);
  }

  dequeue(): QueuedTask | null {
    return this.queue.shift() ?? null;
  }

  getLength(): number {
    return this.queue.length;
  }

  getTasks(): QueuedTask[] {
    return [...this.queue];
  }

  removeTask(taskId: number): boolean {
    const index = this.queue.findIndex((t) => t.taskId === taskId);
    if (index !== -1) {
      this.queue.splice(index, 1);
      return true;
    }
    return false;
  }

  clear(): void {
    this.queue = [];
  }
}
