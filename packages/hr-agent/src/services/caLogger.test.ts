import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../utils/database.js', () => ({
  getPrismaClient: vi.fn().mockReturnValue({
    codingAgentLog: {
      create: vi.fn().mockResolvedValue({ id: 1 }),
      findMany: vi.fn().mockResolvedValue([])
    }
  }),
  setTimestamps: vi.fn((data) => ({ ...data, createdAt: 0, updatedAt: 0 }))
}));

describe('CALogger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createCALog', () => {
    it('应该成功创建 CA 日志', async () => {
      const { createCALog } = await import('./caLogger.js');
      await createCALog(1, 'TEST_ACTION', 'old', 'new');
    });

    it('应该支持没有旧值和新值的日志', async () => {
      const { createCALog } = await import('./caLogger.js');
      await createCALog(1, 'TEST_ACTION');
    });

    it('应该支持 metadata', async () => {
      const { createCALog } = await import('./caLogger.js');
      await createCALog(1, 'TEST_ACTION', null, null, { key: 'value' });
    });
  });

  describe('getCALogs', () => {
    it('应该成功获取 CA 日志列表', async () => {
      const { getCALogs } = await import('./caLogger.js');
      const logs = await getCALogs(1);
      expect(Array.isArray(logs)).toBe(true);
    });

    it('应该支持自定义 limit', async () => {
      const { getCALogs } = await import('./caLogger.js');
      await getCALogs(1, 100);
    });
  });
});
