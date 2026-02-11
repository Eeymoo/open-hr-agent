import { TASK_CONFIG } from '../config/taskConfig.js';

/**
 * 任务重试管理器
 * 用于跟踪和管理任务的重试次数、重试延迟等
 */
export class RetryManager {
  /** 任务重试次数映射表 */
  private retryCount: Map<number, number> = new Map();

  /**
   * 获取任务的重试次数
   * @param taskId - 任务 ID
   * @returns 任务的重试次数，未重试过返回 0
   */
  getRetryCount(taskId: number): number {
    return this.retryCount.get(taskId) ?? 0;
  }

  /**
   * 增加任务的重试次数
   * @param taskId - 任务 ID
   * @returns 增加后的重试次数
   */
  incrementRetry(taskId: number): number {
    const currentCount = this.getRetryCount(taskId);
    const newCount = currentCount + 1;
    this.retryCount.set(taskId, newCount);
    return newCount;
  }

  /**
   * 判断任务是否可以重试
   * @param taskId - 任务 ID
   * @returns 是否可以继续重试
   */
  canRetry(taskId: number): boolean {
    return this.getRetryCount(taskId) < TASK_CONFIG.MAX_RETRY_COUNT;
  }

  /**
   * 获取下次重试的延迟时间
   * @param taskId - 任务 ID
   * @returns 重试延迟时间（毫秒），超过配置范围则返回最后一个延迟的 2 倍
   */
  getNextRetryDelay(taskId: number): number | null {
    const retryCount = this.getRetryCount(taskId);
    if (retryCount >= TASK_CONFIG.RETRY_DELAYS.length) {
      return TASK_CONFIG.RETRY_DELAYS[TASK_CONFIG.RETRY_DELAYS.length - 1] * 2;
    }
    return TASK_CONFIG.RETRY_DELAYS[retryCount];
  }

  /**
   * 清除任务的重试记录
   * @param taskId - 任务 ID
   */
  clearRetry(taskId: number): void {
    this.retryCount.delete(taskId);
  }

  /**
   * 清除所有任务的重试记录
   */
  clearAll(): void {
    this.retryCount.clear();
  }
}
