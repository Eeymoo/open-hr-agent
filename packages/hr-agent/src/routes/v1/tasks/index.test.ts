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
  INTERNAL_SERVER_ERROR: 500
} as const;

const mockTaskFindMany = vi.fn().mockResolvedValue([]);
const mockTaskFindFirst = vi.fn().mockResolvedValue(null);
const mockTaskFindUnique = vi.fn().mockResolvedValue(null);
const mockTaskCreate = vi.fn().mockResolvedValue({ id: 1 });
const mockTaskUpdate = vi.fn().mockResolvedValue({ id: 1 });
const mockTaskCount = vi.fn().mockResolvedValue(0);
const mockTaskManagerRun = vi.fn().mockResolvedValue(1);
const mockTaskManagerRunExisting = vi.fn().mockResolvedValue(1);
const mockTaskManagerApiRun = vi.fn().mockResolvedValue(1);

vi.mock('@prisma/client', () => {
  const mockPrismaClient = {
    task: {
      findMany: mockTaskFindMany,
      findFirst: mockTaskFindFirst,
      findUnique: mockTaskFindUnique,
      create: mockTaskCreate,
      update: mockTaskUpdate,
      delete: vi.fn().mockResolvedValue({ id: 1 }),
      count: mockTaskCount
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

vi.mock('../../../utils/secretManager.js', () => ({
  getDockerCASecret: vi.fn().mockReturnValue('test-secret'),
  getGitHubWebhookSecret: vi.fn().mockReturnValue('test-webhook-secret'),
  getGitHubToken: vi.fn().mockReturnValue('test-token'),
  getGitHubOwner: vi.fn().mockReturnValue('test-owner'),
  getGitHubRepo: vi.fn().mockReturnValue('test-repo'),
  getSecret: vi.fn().mockReturnValue('test-secret')
}));

vi.mock('dockerode', () => {
  class MockDocker {
    constructor() {
      return {
        getContainer: vi.fn().mockReturnValue({
          inspect: vi.fn().mockResolvedValue({ Id: 'test', State: { Status: 'running' } })
        }),
        listContainers: vi.fn().mockResolvedValue([])
      };
    }
  }
  return { default: MockDocker };
});

describe('Tasks Routes Tests', () => {
  let app: Express;

  beforeEach(async () => {
    vi.clearAllMocks();

    global.taskManager = {
      run: mockTaskManagerRun,
      runExisting: mockTaskManagerRunExisting,
      apiRun: mockTaskManagerApiRun,
      start: vi.fn(),
      stop: vi.fn(),
      getStatus: vi.fn().mockResolvedValue({ caPool: [] })
    } as never;

    app = express();
    app.use(express.json());
    const { default: autoLoadRoutes } = await import('../../../middleware/autoLoadRoutes.js');
    const ROUTES_DIR = join(__dirname, '..', '..', '..', 'routes');
    await autoLoadRoutes(app, ROUTES_DIR);
  });

  afterEach(() => {
    vi.clearAllMocks();
    global.taskManager = undefined as never;
  });

  describe('GET /v1/tasks', () => {
    it('应该成功获取任务列表', async () => {
      mockTaskFindMany.mockResolvedValueOnce([]);
      mockTaskCount.mockResolvedValueOnce(0);

      const response = await request(app).get('/v1/tasks');

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.OK);
      expect(response.body.data).toHaveProperty('tasks');
      expect(response.body.data).toHaveProperty('pagination');
    });

    it('应该支持分页参数', async () => {
      mockTaskFindMany.mockResolvedValueOnce([]);
      mockTaskCount.mockResolvedValueOnce(0);

      const response = await request(app).get('/v1/tasks?page=2&pageSize=20');

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.data.pagination).toHaveProperty('page', 2);
      expect(response.body.data.pagination).toHaveProperty('pageSize', 20);
    });

    it('应该支持状态过滤', async () => {
      mockTaskFindMany.mockResolvedValueOnce([]);
      mockTaskCount.mockResolvedValueOnce(0);

      const response = await request(app).get('/v1/tasks?status=pending');

      expect(response.status).toBe(HTTP_STATUS.OK);
    });

    it('应该支持 tags 过滤', async () => {
      mockTaskFindMany.mockResolvedValueOnce([]);
      mockTaskCount.mockResolvedValueOnce(0);

      const response = await request(app).get('/v1/tasks?tags=test,example');

      expect(response.status).toBe(HTTP_STATUS.OK);
    });
  });

  describe('POST /v1/tasks', () => {
    it('应该在缺少 type 时返回 400', async () => {
      const response = await request(app).post('/v1/tasks').send({});

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.BAD_REQUEST);
      expect(response.body.message).toContain('type is required');
    });

    it('应该在 TaskManager 未初始化时返回 500', async () => {
      global.taskManager = undefined as never;

      const response = await request(app).post('/v1/tasks').send({
        type: 'test_task'
      });

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    });

    it('应该成功创建任务', async () => {
      mockTaskFindUnique.mockResolvedValueOnce({ id: 1, type: 'test_task' });

      const response = await request(app).post('/v1/tasks').send({
        type: 'test_task',
        priority: 10
      });

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.OK);
      expect(mockTaskManagerRun).toHaveBeenCalled();
    });
  });

  describe('POST /v1/tasks/execute', () => {
    it('应该在没有任何参数时返回 400', async () => {
      const response = await request(app).post('/v1/tasks/execute').send({});

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.BAD_REQUEST);
      expect(response.body.message).toContain('taskName、uri 或 taskId');
    });

    it('应该成功通过 taskId 执行任务', async () => {
      const response = await request(app).post('/v1/tasks/execute').send({
        taskId: 1
      });

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.OK);
      expect(mockTaskManagerRunExisting).toHaveBeenCalledWith(1);
    });

    it('应该成功通过 taskName 执行任务', async () => {
      const response = await request(app)
        .post('/v1/tasks/execute')
        .send({
          taskName: 'test_task',
          params: { key: 'value' }
        });

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.OK);
      expect(mockTaskManagerRun).toHaveBeenCalled();
    });

    it('应该成功通过 uri 执行任务', async () => {
      const response = await request(app)
        .post('/v1/tasks/execute')
        .send({
          uri: '/api/test',
          params: { key: 'value' }
        });

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.OK);
      expect(mockTaskManagerApiRun).toHaveBeenCalled();
    });

    it('应该在缺少 params 时返回 400（非 taskId 模式）', async () => {
      const response = await request(app).post('/v1/tasks/execute').send({
        taskName: 'test_task'
      });

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.BAD_REQUEST);
      expect(response.body.message).toContain('params 是必需的');
    });
  });

  describe('GET /v1/tasks/:id', () => {
    it('应该在任务不存在时返回 404', async () => {
      mockTaskFindFirst.mockResolvedValueOnce(null);

      const response = await request(app).get('/v1/tasks/999');

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.NOT_FOUND);
    });

    it('应该成功获取单个任务', async () => {
      mockTaskFindFirst.mockResolvedValueOnce({
        id: 1,
        type: 'test_task',
        status: 'pending'
      });

      const response = await request(app).get('/v1/tasks/1');

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.OK);
      expect(response.body.data).toHaveProperty('id', 1);
    });
  });

  describe('PUT /v1/tasks/:id', () => {
    it('应该在任务不存在时返回 404', async () => {
      mockTaskFindFirst.mockResolvedValueOnce(null);

      const response = await request(app).put('/v1/tasks/999').send({
        status: 'completed'
      });

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.NOT_FOUND);
    });

    it('应该成功更新任务', async () => {
      mockTaskFindFirst.mockResolvedValueOnce({
        id: 1,
        type: 'test_task'
      });
      mockTaskUpdate.mockResolvedValueOnce({
        id: 1,
        status: 'completed'
      });

      const response = await request(app).put('/v1/tasks/1').send({
        status: 'completed'
      });

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.OK);
    });
  });

  describe('DELETE /v1/tasks/:id', () => {
    it('应该在任务不存在时返回 404', async () => {
      mockTaskFindFirst.mockResolvedValueOnce(null);

      const response = await request(app).delete('/v1/tasks/999');

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.NOT_FOUND);
    });

    it('应该成功删除任务', async () => {
      mockTaskFindFirst.mockResolvedValueOnce({
        id: 1,
        type: 'test_task'
      });
      mockTaskUpdate.mockResolvedValueOnce({ id: 1 });

      const response = await request(app).delete('/v1/tasks/1');

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.OK);
    });
  });

  describe('PUT /v1/tasks/:id/status', () => {
    it('应该在任务不存在时返回 404', async () => {
      mockTaskFindFirst.mockResolvedValueOnce(null);

      const response = await request(app).put('/v1/tasks/999/status').send({
        status: 'completed'
      });

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.NOT_FOUND);
    });

    it('应该成功更新任务状态', async () => {
      mockTaskFindFirst.mockResolvedValueOnce({
        id: 1,
        type: 'test_task'
      });
      mockTaskUpdate.mockResolvedValueOnce({
        id: 1,
        status: 'completed'
      });

      const response = await request(app).put('/v1/tasks/1/status').send({
        status: 'completed'
      });

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.OK);
    });
  });

  describe('POST /v1/tasks/:id/assign', () => {
    it('应该在任务不存在时返回 404', async () => {
      mockTaskFindFirst.mockResolvedValueOnce(null);

      const response = await request(app).post('/v1/tasks/999/assign').send({
        caId: 1
      });

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.NOT_FOUND);
    });

    it('应该成功分配任务', async () => {
      mockTaskFindFirst.mockResolvedValueOnce({
        id: 1,
        type: 'test_task'
      });
      mockTaskUpdate.mockResolvedValueOnce({
        id: 1,
        caId: 1
      });

      const response = await request(app).post('/v1/tasks/1/assign').send({
        caId: 1
      });

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.OK);
    });
  });
});
