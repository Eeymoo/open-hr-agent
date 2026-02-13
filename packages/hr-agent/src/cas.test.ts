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
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500
} as const;

vi.mock('@prisma/client', () => {
  const mockPrismaClient = {
    codingAgent: {
      create: vi.fn().mockImplementation((data: { data: { caName: string } }) => ({
        id: 1,
        ...data.data
      })),
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi
        .fn()
        .mockImplementation((data: { where: { id: number }; data: { caName?: string } }) => ({
          id: data.where.id,
          caName: data.data.caName ?? 'test-ca'
        })),
      count: vi.fn().mockResolvedValue(0)
    },
    codingAgentLog: {
      create: vi.fn().mockResolvedValue({ id: 1, caId: 1, action: 'TEST_ACTION' })
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

vi.mock('@opencode-ai/sdk', () => ({
  createOpencodeClient: vi.fn().mockReturnValue({})
}));

vi.mock('dockerode', () => {
  const mockContainer = {
    start: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    restart: vi.fn().mockResolvedValue(undefined),
    inspect: vi.fn().mockResolvedValue({
      Id: 'test-container-id',
      Config: { Image: 'test-image' },
      State: { Status: 'running' },
      NetworkSettings: {
        Ports: {
          '4096/tcp': []
        }
      }
    })
  };

  const mockNetwork = {
    inspect: vi.fn().mockRejectedValue(new Error('Network not found')),
    connect: vi.fn().mockResolvedValue(undefined)
  };

  const mockDocker = {
    getNetwork: vi.fn().mockReturnValue(mockNetwork),
    getContainer: vi.fn().mockReturnValue(mockContainer),
    listContainers: vi.fn().mockResolvedValue([]),
    createNetwork: vi.fn().mockResolvedValue(undefined),
    createContainer: vi.fn().mockResolvedValue(mockContainer)
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

describe('Coding Agents CRUD Routes Tests', () => {
  let app: Express;
  const TEST_SECRET = 'test-secret';

  beforeEach(async () => {
    process.env.DOCKER_CA_SECRET = TEST_SECRET;

    global.taskManager = {
      run: vi.fn().mockResolvedValue(1),
      start: vi.fn(),
      stop: vi.fn()
    } as never;

    app = express();
    app.use(express.json());
    const { default: autoLoadRoutes } = await import('./middleware/autoLoadRoutes.js');
    const ROUTES_DIR = join(__dirname, 'routes');
    await autoLoadRoutes(app, ROUTES_DIR);
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.DOCKER_CA_SECRET;
    global.taskManager = undefined as never;
  });

  describe('GET /v1/cas', () => {
    it('应该成功获取 CA 列表', async () => {
      const response = await request(app).get('/v1/cas');

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.OK);
      expect(response.body.data).toHaveProperty('cas');
      expect(response.body.data).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data.cas)).toBe(true);
    });

    it('应该支持分页参数', async () => {
      const response = await request(app).get('/v1/cas?page=2&pageSize=20');

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.data.pagination).toHaveProperty('page', 2);
      expect(response.body.data.pagination).toHaveProperty('pageSize', 20);
    });

    it('应该支持排序参数', async () => {
      const response = await request(app).get('/v1/cas?orderBy=caName');

      expect(response.status).toBe(HTTP_STATUS.OK);
    });
  });

  describe('POST /v1/cas', () => {
    it('应该成功创建 CA', async () => {
      const response = await request(app).post('/v1/cas').send({
        caName: 'test-ca-new'
      });

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.OK);
      expect(response.body.data).toHaveProperty('caName', 'hra_test-ca-new');
      expect(response.body.data).toHaveProperty('status', 'pending_create');
      expect(response.body.data).toHaveProperty('taskId');
    });

    it('应该在缺少 caName 时返回错误', async () => {
      const response = await request(app).post('/v1/cas').send({
        status: 'pending'
      });

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.BAD_REQUEST);
      expect(response.body.message).toContain('caName is required');
    });

    it('应该在 CA 名称已存在时返回冲突错误', async () => {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      vi.mocked(prisma.codingAgent.findUnique).mockResolvedValueOnce({
        id: 1,
        caName: 'existing-ca',
        deletedAt: -2
      } as never);

      const response = await request(app).post('/v1/cas').send({
        caName: 'existing-ca'
      });

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.CONFLICT);
      expect(response.body.message).toContain('already exists');
    });
  });

  describe('PUT /v1/cas/:id', () => {
    it('应该成功更新 CA', async () => {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      vi.mocked(prisma.codingAgent.findFirst).mockResolvedValueOnce({
        id: 1,
        caName: 'test-ca',
        status: 'pending',
        containerId: null,
        dockerConfig: null,
        createdAt: 0,
        updatedAt: 0,
        completedAt: -2,
        deletedAt: -2
      } as never);

      const response = await request(app).put('/v1/cas/1').send({
        status: 'running',
        containerId: 'container-123'
      });

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.OK);
    });

    it('应该在 CA 不存在时返回错误', async () => {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      vi.mocked(prisma.codingAgent.findFirst).mockResolvedValueOnce(null);

      const response = await request(app).put('/v1/cas/999').send({
        status: 'running'
      });

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.NOT_FOUND);
      expect(response.body.message).toContain('not found');
    });

    it('应该在没有任何字段更新时返回错误', async () => {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      vi.mocked(prisma.codingAgent.findFirst).mockResolvedValueOnce({
        id: 1,
        caName: 'test-ca',
        status: 'pending',
        containerId: null,
        dockerConfig: null,
        createdAt: 0,
        updatedAt: 0,
        completedAt: -2,
        deletedAt: -2
      } as never);

      const response = await request(app).put('/v1/cas/1').send({});

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.BAD_REQUEST);
      expect(response.body.message).toContain('No fields to update');
    });
  });

  describe('DELETE /v1/cas/:id', () => {
    it('应该成功删除 CA', async () => {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      vi.mocked(prisma.codingAgent.findFirst).mockResolvedValueOnce({
        id: 1,
        caName: 'test-ca',
        status: 'pending',
        containerId: 'container-123',
        dockerConfig: null,
        createdAt: 0,
        updatedAt: 0,
        completedAt: -2,
        deletedAt: -2
      } as never);

      const response = await request(app).delete('/v1/cas/1');

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.OK);
    });

    it('应该在 CA 不存在时返回错误', async () => {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      vi.mocked(prisma.codingAgent.findFirst).mockResolvedValueOnce(null);

      const response = await request(app).delete('/v1/cas/999');

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.NOT_FOUND);
      expect(response.body.message).toContain('not found');
    });
  });

  describe('GET /v1/cas/:id', () => {
    it('应该成功获取单个 CA', async () => {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      vi.mocked(prisma.codingAgent.findFirst).mockResolvedValueOnce({
        id: 1,
        caName: 'test-ca',
        status: 'running',
        containerId: 'container-123',
        dockerConfig: null,
        createdAt: 0,
        updatedAt: 0,
        completedAt: -2,
        deletedAt: -2,
        logs: []
      } as never);

      const response = await request(app).get('/v1/cas/1');

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.OK);
      expect(response.body.data).toHaveProperty('id', 1);
      expect(response.body.data).toHaveProperty('caName', 'test-ca');
    });

    it('应该在 CA 不存在时返回错误', async () => {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      vi.mocked(prisma.codingAgent.findFirst).mockResolvedValueOnce(null);

      const response = await request(app).get('/v1/cas/999');

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.NOT_FOUND);
      expect(response.body.message).toContain('not found');
    });
  });
});
