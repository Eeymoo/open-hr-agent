import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CaStatusCheckTask } from './caStatusCheckTask.js';
import { EventBus } from '../services/eventBus.js';
import { TaskLogger } from '../utils/taskLogger.js';
import { readPrompt } from '../utils/promptReader.js';

vi.mock('../utils/promptReader.js', () => ({
  readPrompt: vi.fn()
}));

vi.mock('../utils/database.js', () => ({
  getPrismaClient: vi.fn(() => ({
    task: {
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({})
    }
  })),
  getCurrentTimestamp: vi.fn(() => Date.now())
}));

type TaskPrivateMethods = {
  checkForXML: (message: { parts?: { type: string; text?: string }[] } | undefined) => boolean;
  getMessageContent: (
    message: { parts?: { type: string; text?: string }[] } | undefined
  ) => string | null;
};

describe('CaStatusCheckTask', () => {
  let task: CaStatusCheckTask;
  let eventBus: EventBus;
  let logger: TaskLogger;

  const mockClient = {
    session: {
      list: vi.fn(),
      messages: vi.fn(),
      prompt: vi.fn(),
      shell: vi.fn()
    }
  };

  beforeEach(() => {
    eventBus = new EventBus();
    logger = new TaskLogger();

    vi.mocked(readPrompt).mockImplementation((name: string) => {
      if (name === 'next') {
        return '继续';
      }
      if (name === 'check') {
        return 'pnpm run check';
      }
      return '';
    });
    vi.spyOn(logger, 'info').mockResolvedValue(undefined);
    vi.spyOn(logger, 'warn').mockResolvedValue(undefined);
    vi.spyOn(logger, 'error').mockResolvedValue(undefined);

    task = new CaStatusCheckTask(eventBus, logger);

    vi.spyOn(
      task as unknown as { createClient: () => typeof mockClient },
      'createClient'
    ).mockReturnValue(mockClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('execute', () => {
    it('应该检测到 XML 错误并发送继续', async () => {
      mockClient.session.list.mockResolvedValue({
        data: [{ id: 'session-1' }]
      });
      mockClient.session.messages.mockResolvedValue({
        data: [
          {
            parts: [{ type: 'text', text: '任务执行中' }]
          },
          {
            parts: [
              {
                type: 'text',
                text: '执行失败<error>工具错误</error>'
              }
            ]
          }
        ]
      });

      const result = await task.execute(
        { caId: 1, caName: 'hra_123' },
        {
          taskId: 0,
          taskName: 'ca_status_check',
          caId: 1,
          issueId: undefined,
          prId: undefined,
          retryCount: 0
        }
      );

      expect(result.success).toBe(true);
      if (result.data) {
        expect(result.data.hasXMLError).toBe(true);
      }
      expect(mockClient.session.prompt).toHaveBeenCalledWith(
        expect.objectContaining({
          path: { id: 'session-1' },
          body: expect.objectContaining({
            parts: expect.arrayContaining([expect.objectContaining({ type: 'text', text: '继续' })])
          })
        })
      );
    });

    it('应该在无 XML 错误时执行代码检查', async () => {
      mockClient.session.list.mockResolvedValue({
        data: [{ id: 'session-1' }]
      });
      mockClient.session.messages.mockResolvedValue({
        data: [
          {
            parts: [{ type: 'text', text: '任务执行中...' }]
          }
        ]
      });
      mockClient.session.shell.mockResolvedValue({
        data: { output: 'All checks passed' }
      });

      const result = await task.execute(
        { caId: 1, caName: 'hra_123' },
        {
          taskId: 0,
          taskName: 'ca_status_check',
          caId: 1,
          issueId: undefined,
          prId: undefined,
          retryCount: 0
        }
      );

      expect(result.success).toBe(true);
      if (result.data) {
        expect(result.data.hasXMLError).toBe(false);
        expect(result.data.action).toBe('run_code_check');
      }
      expect(mockClient.session.shell).toHaveBeenCalledWith(
        expect.objectContaining({
          path: { id: 'session-1' },
          body: expect.objectContaining({
            command: 'pnpm run check'
          })
        })
      );
    });

    it('应该处理空 session 列表', async () => {
      mockClient.session.list.mockResolvedValue({ data: [] });

      const result = await task.execute(
        { caId: 1, caName: 'hra_123' },
        {
          taskId: 0,
          taskName: 'ca_status_check',
          caId: 1,
          issueId: undefined,
          prId: undefined,
          retryCount: 0
        }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('No session found');
    });

    it('应该处理空消息列表', async () => {
      mockClient.session.list.mockResolvedValue({
        data: [{ id: 'session-1' }]
      });
      mockClient.session.messages.mockResolvedValue({ data: [] });

      const result = await task.execute(
        { caId: 1, caName: 'hra_123' },
        {
          taskId: 0,
          taskName: 'ca_status_check',
          caId: 1,
          issueId: undefined,
          prId: undefined,
          retryCount: 0
        }
      );

      expect(result.success).toBe(true);
      if (result.data) {
        expect(result.data.hasXMLError).toBe(false);
        expect(result.data.messageCount).toBe(0);
      }
    });

    it('应该处理连接错误', async () => {
      mockClient.session.list.mockRejectedValue(new Error('Connection refused'));

      const result = await task.execute(
        { caId: 1, caName: 'hra_123' },
        {
          taskId: 0,
          taskName: 'ca_status_check',
          caId: 1,
          issueId: undefined,
          prId: undefined,
          retryCount: 0
        }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Connection refused');
    });
  });

  describe('checkForXML', () => {
    it('应该检测到 XML 标签', () => {
      const message = {
        parts: [{ type: 'text', text: '错误信息<error>执行失败</error>' }]
      };
      expect((task as unknown as TaskPrivateMethods).checkForXML(message)).toBe(true);
    });

    it('应该检测到不同类型的 XML 标签', () => {
      const message = {
        parts: [{ type: 'text', text: '结果<function_results>error</function_results>' }]
      };
      expect((task as unknown as TaskPrivateMethods).checkForXML(message)).toBe(true);
    });

    it('应该忽略非 XML 文本', () => {
      const message = {
        parts: [{ type: 'text', text: '正常消息，没有标签' }]
      };
      expect((task as unknown as TaskPrivateMethods).checkForXML(message)).toBe(false);
    });

    it('应该处理空消息', () => {
      expect((task as unknown as TaskPrivateMethods).checkForXML(undefined)).toBe(false);
      expect((task as unknown as TaskPrivateMethods).checkForXML({})).toBe(false);
    });

    it('应该处理没有 parts 的消息', () => {
      const message = {};
      expect((task as unknown as TaskPrivateMethods).checkForXML(message)).toBe(false);
    });

    it('应该处理没有文本类型的 parts', () => {
      const message = {
        parts: [{ type: 'image', url: 'test.png' }]
      };
      expect((task as unknown as TaskPrivateMethods).checkForXML(message)).toBe(false);
    });
  });

  describe('getMessageContent', () => {
    it('应该提取消息内容', () => {
      const message = {
        parts: [{ type: 'text', text: '测试内容' }]
      };
      expect((task as unknown as TaskPrivateMethods).getMessageContent(message)).toBe('测试内容');
    });

    it('应该返回 null 对于没有文本的消息', () => {
      const message = {
        parts: [{ type: 'image', url: 'test.png' }]
      };
      expect((task as unknown as TaskPrivateMethods).getMessageContent(message)).toBeNull();
    });

    it('应该返回 null 对于空消息', () => {
      expect((task as unknown as TaskPrivateMethods).getMessageContent(undefined)).toBeNull();
      expect((task as unknown as TaskPrivateMethods).getMessageContent({})).toBeNull();
    });

    it('应该返回第一个文本部分的内容', () => {
      const message = {
        parts: [
          { type: 'text', text: '第一部分' },
          { type: 'text', text: '第二部分' }
        ]
      };
      expect((task as unknown as TaskPrivateMethods).getMessageContent(message)).toBe('第一部分');
    });
  });
});
