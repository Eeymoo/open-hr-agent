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
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
} as const;

const mockContainerInspect = vi.fn().mockResolvedValue({
  Id: 'test-container-id',
  Config: { Image: 'test-image' },
  State: { Status: 'running' },
  Created: '2024-01-01T00:00:00Z',
  NetworkSettings: {
    Ports: { '4096/tcp': [] }
  }
});

const mockContainerStart = vi.fn().mockResolvedValue(undefined);
const mockContainerRestart = vi.fn().mockResolvedValue(undefined);
const mockContainerRemove = vi.fn().mockResolvedValue(undefined);

vi.mock('dockerode', () => {
  const mockContainer = {
    start: mockContainerStart,
    restart: mockContainerRestart,
    remove: mockContainerRemove,
    inspect: mockContainerInspect
  };

  const mockDocker = {
    getContainer: vi.fn().mockReturnValue(mockContainer),
    listContainers: vi.fn().mockResolvedValue([
      {
        Id: 'container-1',
        Names: ['/hra_test-ca-1'],
        Image: 'test-image',
        Status: 'running',
        State: 'running',
        Created: 1704067200
      },
      {
        Id: 'container-2',
        Names: ['/other-container'],
        Image: 'other-image',
        Status: 'exited',
        State: 'exited',
        Created: 1704067200
      }
    ])
  };

  class MockDocker {
    constructor() {
      return mockDocker;
    }
  }

  return {
    default: MockDocker
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

describe('CA Routes Tests', () => {
  let app: Express;
  const TEST_SECRET = 'test-secret';

  beforeEach(async () => {
    vi.clearAllMocks();
    mockContainerInspect.mockResolvedValue({
      Id: 'test-container-id',
      Config: { Image: 'test-image' },
      State: { Status: 'running' },
      Created: '2024-01-01T00:00:00Z',
      NetworkSettings: {
        Ports: { '4096/tcp': [] }
      }
    });
    mockCodingAgentFindFirst.mockResolvedValue(null);

    global.taskManager = {
      run: mockTaskManagerRun,
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

  describe('GET /v1/ca', () => {
    it('应该在未授权时返回 401', async () => {
      const response = await request(app).get('/v1/ca');

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.UNAUTHORIZED);
    });

    it('应该成功返回 CA 容器列表', async () => {
      const response = await request(app).get('/v1/ca').set('x-ca-secret', TEST_SECRET);

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.OK);
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('containers');
      expect(Array.isArray(response.body.data.containers)).toBe(true);
    });

    it('应该只返回 hra_ 前缀的容器', async () => {
      const response = await request(app).get('/v1/ca').set('x-ca-secret', TEST_SECRET);

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.data.containers).toHaveLength(1);
      expect(response.body.data.containers[0].name).toBe('hra_test-ca-1');
    });
  });

  describe('GET /v1/ca/:name', () => {
    it('应该在未授权时返回 401', async () => {
      const response = await request(app).get('/v1/ca/test-ca');

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.UNAUTHORIZED);
    });

    it('应该成功返回容器信息', async () => {
      const response = await request(app).get('/v1/ca/test-ca').set('x-ca-secret', TEST_SECRET);

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.OK);
      expect(response.body.data).toHaveProperty('containerId', 'test-container-id');
      expect(response.body.data).toHaveProperty('status', 'running');
    });

    it('应该在容器不存在时返回 404', async () => {
      mockContainerInspect.mockRejectedValueOnce(new Error('Container not found'));

      const response = await request(app)
        .get('/v1/ca/non-existent')
        .set('x-ca-secret', TEST_SECRET);

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.NOT_FOUND);
    });
  });

  describe('PUT /v1/ca/:name', () => {
    it('应该在未授权时返回 401', async () => {
      const response = await request(app).put('/v1/ca/test-ca').send({});

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.UNAUTHORIZED);
    });

    it('应该成功更新容器（不重启）', async () => {
      const response = await request(app)
        .put('/v1/ca/test-ca')
        .set('x-ca-secret', TEST_SECRET)
        .send({});

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.OK);
      expect(response.body.data).toHaveProperty('message', 'Docker container updated successfully');
    });

    it('应该成功重启容器', async () => {
      const response = await request(app)
        .put('/v1/ca/test-ca')
        .set('x-ca-secret', TEST_SECRET)
        .send({ restart: true });

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(mockContainerRestart).toHaveBeenCalled();
    });

    it('应该在容器不存在时返回 404', async () => {
      mockContainerInspect.mockRejectedValueOnce(new Error('Container not found'));

      const response = await request(app)
        .put('/v1/ca/non-existent')
        .set('x-ca-secret', TEST_SECRET)
        .send({});

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.NOT_FOUND);
    });
  });

  describe('DELETE /v1/ca/:name', () => {
    it('应该在未授权时返回 401', async () => {
      const response = await request(app).delete('/v1/ca/test-ca');

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.UNAUTHORIZED);
    });

    it('应该在 CA 记录不存在时返回 404', async () => {
      mockCodingAgentFindFirst.mockResolvedValueOnce(null);

      const response = await request(app).delete('/v1/ca/test-ca').set('x-ca-secret', TEST_SECRET);

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.NOT_FOUND);
    });

    it('应该成功删除 CA', async () => {
      mockCodingAgentFindFirst.mockResolvedValueOnce({
        id: 1,
        caName: 'test-ca',
        status: 'running',
        containerId: 'container-123'
      });

      const response = await request(app).delete('/v1/ca/test-ca').set('x-ca-secret', TEST_SECRET);

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.OK);
      expect(response.body.data).toHaveProperty('status', 'pending_delete');
      expect(mockTaskManagerRun).toHaveBeenCalled();
    });

    it('应该在 CA 已在删除队列时返回 400', async () => {
      mockCodingAgentFindFirst.mockResolvedValueOnce({
        id: 1,
        caName: 'test-ca',
        status: 'pending_delete',
        containerId: 'container-123'
      });

      const response = await request(app).delete('/v1/ca/test-ca').set('x-ca-secret', TEST_SECRET);

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.BAD_REQUEST);
      expect(response.body.message).toContain('already pending deletion');
    });

    it('应该在 TaskManager 未初始化时返回 500', async () => {
      mockCodingAgentFindFirst.mockResolvedValueOnce({
        id: 1,
        caName: 'test-ca',
        status: 'running',
        containerId: 'container-123'
      });
      global.taskManager = undefined as never;

      const response = await request(app).delete('/v1/ca/test-ca').set('x-ca-secret', TEST_SECRET);

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(response.body.message).toContain('TaskManager');
    });
  });

  describe('POST /v1/ca/add', () => {
    it('应该在未授权时返回 401', async () => {
      const response = await request(app).post('/v1/ca/add').send({ name: 'test-ca' });

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.UNAUTHORIZED);
    });

    it('应该在缺少 name 和 issueId 时返回 400', async () => {
      const response = await request(app)
        .post('/v1/ca/add')
        .set('x-ca-secret', TEST_SECRET)
        .send({});

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.BAD_REQUEST);
      expect(response.body.message).toContain('name or issueId is required');
    });

    it('应该成功创建 CA（使用 name）', async () => {
      mockCodingAgentFindFirst.mockResolvedValueOnce(null);

      const response = await request(app)
        .post('/v1/ca/add')
        .set('x-ca-secret', TEST_SECRET)
        .send({ name: 'test-ca' });

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.OK);
      expect(response.body.data).toHaveProperty('status', 'pending_create');
      expect(response.body.data.name).toMatch(/^hra_test-ca$/);
    });

    it('应该成功创建 CA（使用 issueId）', async () => {
      mockCodingAgentFindFirst.mockResolvedValueOnce(null);

      const response = await request(app)
        .post('/v1/ca/add')
        .set('x-ca-secret', TEST_SECRET)
        .send({ issueId: 123 });

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.OK);
      expect(response.body.data.name).toBe('hra_123');
    });

    it('应该在 CA 名称已存在时返回 400', async () => {
      mockCodingAgentFindFirst.mockResolvedValueOnce({
        id: 1,
        caName: 'hra_test-ca'
      });

      const response = await request(app)
        .post('/v1/ca/add')
        .set('x-ca-secret', TEST_SECRET)
        .send({ name: 'test-ca' });

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.BAD_REQUEST);
      expect(response.body.message).toContain('already exists');
    });

    it('应该拒绝无效的容器名称', async () => {
      const response = await request(app)
        .post('/v1/ca/add')
        .set('x-ca-secret', TEST_SECRET)
        .send({ name: 'invalid@name!' });

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.BAD_REQUEST);
      expect(response.body.message).toContain('valid Docker container name');
    });
  });
});
