import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IssueProcessingTask } from './issueProcessingTask.js';
import { EventBus } from '../services/eventBus.js';
import { TaskLogger } from '../utils/taskLogger.js';
import { TASK_STATUS } from '../config/taskStatus.js';
import { TASK_EVENTS } from '../config/taskEvents.js';

describe('IssueProcessingTask', () => {
  let task: IssueProcessingTask;
  let eventBus: EventBus;
  let logger: TaskLogger;

  beforeEach(() => {
    eventBus = new EventBus();
    logger = new TaskLogger();
    vi.spyOn(logger, 'info').mockResolvedValue(undefined);
    task = new IssueProcessingTask(eventBus, logger);
  });

  describe('execute', () => {
    it('应该成功执行并返回正确的 TaskResult', async () => {
      const result = await task.execute(
        { issueNumber: 123, caName: 'hra_123' },
        {
          taskId: 1,
          taskName: 'issue_processing',
          retryCount: 0
        }
      );

      expect(result.success).toBe(true);
      expect(result.finalStatus).toBe(TASK_STATUS.QUEUED);
      expect(result.nextEvent).toBe(TASK_EVENTS.ISSUE_PROCESSING_STARTED);
      expect(result.nextTask).toBe('create_ca');
      expect(result.nextParams).toEqual({
        parentTaskId: 1,
        issueNumber: 123,
        caName: 'hra_123'
      });
    });

    it('应该记录开始处理 Issue 的日志', async () => {
      await task.execute(
        { issueNumber: 123, caName: 'hra_123' },
        { taskId: 1, taskName: 'issue_processing', retryCount: 0 }
      );

      expect(logger.info).toHaveBeenCalledWith(1, 'issue_processing', '开始处理 Issue', {
        issueNumber: 123,
        caName: 'hra_123'
      });
    });

    it('应该正确提取 issueNumber 和 caName', async () => {
      const result = await task.execute(
        { issueNumber: 456, caName: 'hra_456' },
        { taskId: 2, taskName: 'issue_processing', retryCount: 0 }
      );

      expect(result.nextParams?.issueNumber).toBe(456);
      expect(result.nextParams?.caName).toBe('hra_456');
    });

    it('应该将当前 taskId 作为 parentTaskId 传递', async () => {
      const result = await task.execute(
        { issueNumber: 123, caName: 'hra_123' },
        { taskId: 99, taskName: 'issue_processing', retryCount: 0 }
      );

      expect(result.nextParams?.parentTaskId).toBe(99);
    });

    it('应该返回 finalStatus 为 QUEUED（主任务保持队列状态）', async () => {
      const result = await task.execute(
        { issueNumber: 123, caName: 'hra_123' },
        { taskId: 1, taskName: 'issue_processing', retryCount: 0 }
      );

      expect(result.finalStatus).toBe(TASK_STATUS.QUEUED);
    });
  });

  describe('任务属性', () => {
    it('应该有正确的 name 属性', () => {
      expect(task.name).toBe('issue_processing');
    });

    it('应该有空的 dependencies', () => {
      expect(task.dependencies).toEqual([]);
    });
  });
});
