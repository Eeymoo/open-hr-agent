import { TASK_CONFIG } from '../config/taskConfig.js';

export class RetryManager {
  private retryCount: Map<number, number> = new Map();

  getRetryCount(taskId: number): number {
    return this.retryCount.get(taskId) ?? 0;
  }

  incrementRetry(taskId: number): number {
    const currentCount = this.getRetryCount(taskId);
    const newCount = currentCount + 1;
    this.retryCount.set(taskId, newCount);
    return newCount;
  }

  canRetry(taskId: number): boolean {
    return this.getRetryCount(taskId) < TASK_CONFIG.MAX_RETRY_COUNT;
  }

  getNextRetryDelay(taskId: number): number | null {
    const retryCount = this.getRetryCount(taskId);
    if (retryCount >= TASK_CONFIG.RETRY_DELAYS.length) {
      return TASK_CONFIG.RETRY_DELAYS[TASK_CONFIG.RETRY_DELAYS.length - 1] * 2;
    }
    return TASK_CONFIG.RETRY_DELAYS[retryCount];
  }

  clearRetry(taskId: number): void {
    this.retryCount.delete(taskId);
  }

  clearAll(): void {
    this.retryCount.clear();
  }
}
