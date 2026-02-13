import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const HTTP_STATUS = {
  OK: 200,
  INTERNAL_SERVER_ERROR: 500
} as const;

const mockTasks = [
  {
    id: 1,
    type: 'coding',
    status: 'completed',
    priority: 10,
    tags: ['requires:ca', 'agent:coding'],
    parentTaskId: null,
    issueId: null,
    prId: null,
    caId: null,
    metadata: {},
    createdAt: 1739380000,
    updatedAt: 1739380100,
    completedAt: 1739380200,
    deletedAt: -2,
    subTasks: [],
    issue: null,
    pullRequest: null,
    codingAgent: null
  },
  {
    id: 2,
    type: 'review',
    status: 'running',
    priority: 20,
    tags: ['agent:review', 'agent:test'],
    parentTaskId: null,
    issueId: null,
    prId: null,
    caId: null,
    metadata: {},
    createdAt: 1739380300,
    updatedAt: 1739380400,
    completedAt: 0,
    deletedAt: -2,
    subTasks: [],
    issue: null,
    pullRequest: null,
    codingAgent: null
  },
  {
    id: 3,
    type: 'test',
    status: 'queued',
    priority: 30,
    tags: ['agent:test'],
    parentTaskId: null,
    issueId: null,
    prId: null,
    caId: null,
    metadata: {},
    createdAt: 1739380500,
    updatedAt: 1739380600,
    completedAt: 0,
    deletedAt: -2,
    subTasks: [],
    issue: null,
    pullRequest: null,
    codingAgent: null
  }
];

const mockTaskFindMany = vi.fn().mockResolvedValue(mockTasks);
const mockTaskCount = vi.fn().mockResolvedValue(3);

vi.mock('@prisma/client', () => {
  const mockPrismaClient = {
    task: {
      findMany: mockTaskFindMany,
      count: mockTaskCount,
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 1 }),
      update: vi.fn().mockResolvedValue({ id: 1 }),
      delete: vi.fn().mockResolvedValue({ id: 1 })
    },
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

describe('Tasks GET Route Tests', () => {
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

  describe('GET /v1/tasks', () => {
    it('应该成功获取任务列表（无参数）', async () => {
      mockTaskFindMany.mockResolvedValueOnce(mockTasks);
      mockTaskCount.mockResolvedValueOnce(3);

      const response = await request(app).get('/v1/tasks');

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.OK);
      expect(response.body.data).toHaveProperty('tasks');
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data.pagination).toHaveProperty('page', 1);
      expect(response.body.data.pagination).toHaveProperty('pageSize', 10);
      expect(response.body.data.pagination).toHaveProperty('total', 3);
    });

    it('应该支持分页参数', async () => {
      mockTaskFindMany.mockResolvedValueOnce([mockTasks[0]]);
      mockTaskCount.mockResolvedValueOnce(3);

      const response = await request(app).get('/v1/tasks?page=2&pageSize=1');

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.data.pagination).toHaveProperty('page', 2);
      expect(response.body.data.pagination).toHaveProperty('pageSize', 1);
      expect(response.body.data.pagination).toHaveProperty('total', 3);
      expect(response.body.data.pagination).toHaveProperty('totalPages', 3);
    });

    it('应该支持 tags 过滤（单个标签）', async () => {
      mockTaskFindMany.mockResolvedValueOnce([mockTasks[0]]);
      mockTaskCount.mockResolvedValueOnce(1);

      const response = await request(app).get('/v1/tasks?tags=requires:ca');

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.data.tasks).toHaveLength(1);
      expect(mockTaskFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tags: { hasSome: ['requires:ca'] }
          })
        })
      );
    });

    it('应该支持 tags 过滤（多个标签）', async () => {
      mockTaskFindMany.mockResolvedValueOnce(mockTasks.slice(0, 2));
      mockTaskCount.mockResolvedValueOnce(2);

      const response = await request(app).get(
        '/v1/tasks?tags=requires:ca,agent:coding'
      );

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(mockTaskFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tags: { hasSome: ['requires:ca', 'agent:coding'] }
          })
        })
      );
    });

    it('应该支持 status 过滤', async () => {
      mockTaskFindMany.mockResolvedValueOnce([mockTasks[0]]);
      mockTaskCount.mockResolvedValueOnce(1);

      const response = await request(app).get('/v1/tasks?status=completed');

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(mockTaskFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'completed'
          })
        })
      );
    });

    it('应该支持 priority 过滤', async () => {
      mockTaskFindMany.mockResolvedValueOnce([mockTasks[2]]);
      mockTaskCount.mockResolvedValueOnce(1);

      const response = await request(app).get('/v1/tasks?priority=30');

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(mockTaskFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            priority: 30
          })
        })
      );
    });

    it('应该支持组合过滤条件', async () => {
      mockTaskFindMany.mockResolvedValueOnce([mockTasks[0]]);
      mockTaskCount.mockResolvedValueOnce(1);

      const response = await request(app).get(
        '/v1/tasks?tags=requires:ca&status=completed&page=1&pageSize=10'
      );

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(mockTaskFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tags: { hasSome: ['requires:ca'] },
            status: 'completed'
          }),
          skip: 0,
          take: 10
        })
      );
    });

    it('应该正确计算总页数', async () => {
      mockTaskFindMany.mockResolvedValueOnce([]);
      mockTaskCount.mockResolvedValueOnce(25);

      const response = await request(app).get('/v1/tasks?pageSize=10');

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.data.pagination).toHaveProperty('totalPages', 3);
    });

    it('应该排除软删除的任务', async () => {
      mockTaskFindMany.mockResolvedValueOnce([]);
      mockTaskCount.mockResolvedValueOnce(0);

      const response = await request(app).get('/v1/tasks');

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(mockTaskFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: -2
          })
        })
      );
    });

    it('应该排除子任务', async () => {
      mockTaskFindMany.mockResolvedValueOnce([]);
      mockTaskCount.mockResolvedValueOnce(0);

      const response = await request(app).get('/v1/tasks');

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(mockTaskFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            parentTaskId: null
          })
        })
      );
    });

    it('应该处理无效的分页参数（使用默认值）', async () => {
      mockTaskFindMany.mockResolvedValueOnce(mockTasks);
      mockTaskCount.mockResolvedValueOnce(3);

      const response = await request(app).get('/v1/tasks?page=-1&pageSize=abc');

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.data.pagination).toHaveProperty('page', 1);
      expect(response.body.data.pagination).toHaveProperty('pageSize', 10);
    });

    it('应该支持 orderBy 参数', async () => {
      mockTaskFindMany.mockResolvedValueOnce(mockTasks);
      mockTaskCount.mockResolvedValueOnce(3);

      const response = await request(app).get('/v1/tasks?orderBy=priority');

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(mockTaskFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { priority: 'desc' }
        })
      );
    });
  });
});
