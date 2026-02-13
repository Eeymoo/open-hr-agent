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

const mockCodingAgentFindFirst = vi.fn().mockResolvedValue(null);
const mockCodingAgentUpdate = vi.fn().mockResolvedValue({ id: 1 });
const mockTaskManagerRun = vi.fn().mockResolvedValue(1);

vi.mock('@prisma/client', () => {
  const mockPrismaClient = {
    codingAgent: {
      findFirst: mockCodingAgentFindFirst,
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 1 }),
      update: mockCodingAgentUpdate,
      delete: vi.fn().mockResolvedValue({ id: 1 }),
      findMany: vi.fn().mockResolvedValue([])
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

vi.mock('../../../../utils/secretManager.js', () => ({
  getDockerCASecret: vi.fn().mockReturnValue('test-secret'),
  getGitHubWebhookSecret: vi.fn().mockReturnValue('test-webhook-secret'),
  getGitHubToken: vi.fn().mockReturnValue('test-token'),
  getGitHubOwner: vi.fn().mockReturnValue('test-owner'),
  getGitHubRepo: vi.fn().mockReturnValue('test-repo'),
  getSecret: vi.fn().mockReturnValue('test-secret')
}));

vi.mock('dockerode', () => {
  const mockContainer = {
    start: vi.fn().mockResolvedValue(undefined),
    restart: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    inspect: vi.fn().mockResolvedValue({
      Id: 'test-container-id',
      State: { Status: 'running' }
    })
  };

  class MockDocker {
    constructor() {
      return {
        getContainer: vi.fn().mockReturnValue(mockContainer),
        listContainers: vi.fn().mockResolvedValue([])
      };
    }
  }

  return {
    default: MockDocker
  };
});

describe('CAS Operations Routes Tests', () => {
  let app: Express;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockCodingAgentFindFirst.mockResolvedValue({
      id: 1,
      caName: 'test-ca',
      containerId: 'container-123',
      status: 'running',
      createdAt: 0,
      updatedAt: 0
    });

    global.taskManager = {
      run: mockTaskManagerRun,
      start: vi.fn(),
      stop: vi.fn(),
      getStatus: vi.fn().mockResolvedValue({ caPool: [] })
    } as never;

    app = express();
    app.use(express.json());
    const { default: autoLoadRoutes } = await import('../../../../middleware/autoLoadRoutes.js');
    const ROUTES_DIR = join(__dirname, '..', '..', '..', '..', 'routes');
    await autoLoadRoutes(app, ROUTES_DIR);
  });

  afterEach(() => {
    vi.clearAllMocks();
    global.taskManager = undefined as never;
  });

  describe('POST /v1/cas/:id/restart', () => {
    it('应该在 ID 无效时返回 400', async () => {
      const response = await request(app).post('/v1/cas/invalid/restart');

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.BAD_REQUEST);
      expect(response.body.message).toContain('Invalid ID');
    });

    it('应该在 CA 不存在时返回 404', async () => {
      mockCodingAgentFindFirst.mockResolvedValueOnce(null);

      const response = await request(app).post('/v1/cas/999/restart');

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.NOT_FOUND);
      expect(response.body.message).toContain('not found');
    });

    it('应该在 CA 没有关联容器时返回 400', async () => {
      mockCodingAgentFindFirst.mockResolvedValueOnce({
        id: 1,
        caName: 'test-ca',
        containerId: null,
        status: 'pending'
      });

      const response = await request(app).post('/v1/cas/1/restart');

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.BAD_REQUEST);
      expect(response.body.message).toContain('No container');
    });

    it('应该成功创建重启任务', async () => {
      const response = await request(app).post('/v1/cas/1/restart');

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.OK);
      expect(response.body.data).toHaveProperty('status', 'pending_restart');
      expect(response.body.data).toHaveProperty('taskId');
      expect(mockTaskManagerRun).toHaveBeenCalled();
    });

    it('应该在 TaskManager 未初始化时返回 500', async () => {
      global.taskManager = undefined as never;

      const response = await request(app).post('/v1/cas/1/restart');

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    });
  });

  describe('POST /v1/cas/:id/start', () => {
    it('应该在 ID 无效时返回 400', async () => {
      const response = await request(app).post('/v1/cas/invalid/start');

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.BAD_REQUEST);
    });

    it('应该在 CA 不存在时返回 404', async () => {
      mockCodingAgentFindFirst.mockResolvedValueOnce(null);

      const response = await request(app).post('/v1/cas/999/start');

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.NOT_FOUND);
    });

    it('应该成功创建启动任务', async () => {
      const response = await request(app).post('/v1/cas/1/start');

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.OK);
      expect(response.body.data).toHaveProperty('status', 'pending_start');
      expect(mockTaskManagerRun).toHaveBeenCalled();
    });
  });

  describe('POST /v1/cas/:id/stop', () => {
    it('应该在 ID 无效时返回 400', async () => {
      const response = await request(app).post('/v1/cas/invalid/stop');

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.BAD_REQUEST);
    });

    it('应该在 CA 不存在时返回 404', async () => {
      mockCodingAgentFindFirst.mockResolvedValueOnce(null);

      const response = await request(app).post('/v1/cas/999/stop');

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.NOT_FOUND);
    });

    it('应该成功创建停止任务', async () => {
      const response = await request(app).post('/v1/cas/1/stop');

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.OK);
      expect(response.body.data).toHaveProperty('status', 'pending_stop');
      expect(mockTaskManagerRun).toHaveBeenCalled();
    });
  });

  describe('POST /v1/cas/:id/sync', () => {
    it('应该在 ID 无效时返回 400', async () => {
      const response = await request(app).post('/v1/cas/invalid/sync');

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.BAD_REQUEST);
    });

    it('应该在 CA 不存在时返回 404', async () => {
      mockCodingAgentFindFirst.mockResolvedValueOnce(null);

      const response = await request(app).post('/v1/cas/999/sync');

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.NOT_FOUND);
    });

    it('应该成功创建同步任务', async () => {
      const response = await request(app).post('/v1/cas/1/sync');

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.OK);
      expect(response.body.data).toHaveProperty('message', 'Container sync task queued');
      expect(mockTaskManagerRun).toHaveBeenCalled();
    });

    it('应该在 TaskManager 未初始化时返回 500', async () => {
      global.taskManager = undefined as never;

      const response = await request(app).post('/v1/cas/1/sync');

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    });
  });
});
