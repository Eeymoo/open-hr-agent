import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  REQUEST_TIMEOUT: 408
} as const;

const mockTaskUpdate = vi.fn().mockResolvedValue({ id: 1, priority: 20 });
const mockIssueFindFirst = vi.fn().mockResolvedValue(null);

vi.mock('@prisma/client', () => {
  const mockPrismaClient = {
    task: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 1 }),
      update: mockTaskUpdate,
      delete: vi.fn().mockResolvedValue({ id: 1 })
    },
    issue: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: mockIssueFindFirst,
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 1 }),
      update: vi.fn().mockResolvedValue({ id: 1 }),
      delete: vi.fn().mockResolvedValue({ id: 1 })
    },
    $transaction: vi.fn().mockImplementation((promises) => Promise.all(promises)),
    $disconnect: vi.fn().mockResolvedValue(undefined)
  };

  class MockPrismaClient {
    constructor() {
      return mockPrismaClient;
    }
  }

  return {
    PrismaClient: MockPrismaClient
  };
});

describe('Tasks Reorder Route Tests', () => {
  let app: Express;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    const { default: autoLoadRoutes } = await import('../../../middleware/autoLoadRoutes.js');
    const ROUTES_DIR = join(__dirname, '..', '..', '..', 'routes');
    await autoLoadRoutes(app, ROUTES_DIR);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /v1/tasks/reorder', () => {
    it('应该成功批量更新任务优先级', async () => {
      const response = await request(app)
        .post('/v1/tasks/reorder')
        .send({
          taskOrders: [
            { taskId: 1, priority: 10 },
            { taskId: 2, priority: 20 },
            { taskId: 3, priority: 30 }
          ]
        });

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('message', 'success');
    });

    it('应该在 taskOrders 缺失时返回 400 错误', async () => {
      const response = await request(app).post('/v1/tasks/reorder').send({});

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.BAD_REQUEST);
      expect(response.body.message).toContain('taskOrders is required');
    });

    it('应该在 taskOrders 为空数组时返回 400 错误', async () => {
      const response = await request(app).post('/v1/tasks/reorder').send({ taskOrders: [] });

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.BAD_REQUEST);
      expect(response.body.message).toContain('non-empty array');
    });

    it('应该在 taskId 不是数字时返回 400 错误', async () => {
      const response = await request(app)
        .post('/v1/tasks/reorder')
        .send({
          taskOrders: [{ taskId: 'invalid', priority: 10 }]
        });

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.BAD_REQUEST);
      expect(response.body.message).toContain('taskId (number) and priority (number)');
    });

    it('应该在 priority 不是数字时返回 400 错误', async () => {
      const response = await request(app)
        .post('/v1/tasks/reorder')
        .send({
          taskOrders: [{ taskId: 1, priority: 'high' }]
        });

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.BAD_REQUEST);
      expect(response.body.message).toContain('taskId (number) and priority (number)');
    });
  });

  describe('POST /v1/issues/:id/wait', () => {
    it('应该在 issue 不存在时返回 404 错误', async () => {
      mockIssueFindFirst.mockResolvedValueOnce(null);

      const response = await request(app).post('/v1/issues/999/wait').send({});

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.NOT_FOUND);
      expect(response.body.message).toContain('Issue not found');
    });

    it('应该在 issue ID 无效时返回 400 错误', async () => {
      const response = await request(app).post('/v1/issues/invalid/wait').send({});

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.BAD_REQUEST);
      expect(response.body.message).toContain('Invalid issue ID');
    });

    it('应该在 issue 已完成时立即返回', async () => {
      mockIssueFindFirst.mockResolvedValueOnce({
        id: 1,
        issueId: 123,
        completedAt: 1739380000
      });

      const response = await request(app).post('/v1/issues/1/wait').send({});

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.OK);
      expect(response.body.data).toHaveProperty('id', 1);
    });

    it('应该在 issue 未完成时等待并返回', async () => {
      mockIssueFindFirst
        .mockResolvedValueOnce({
          id: 1,
          issueId: 123,
          completedAt: -2
        })
        .mockResolvedValueOnce({
          id: 1,
          issueId: 123,
          completedAt: 1739380000
        });

      const response = await request(app).post('/v1/issues/1/wait').send({
        timeout: 100,
        interval: 50
      });

      expect(response.status).toBe(HTTP_STATUS.OK);
    });
  });
});
