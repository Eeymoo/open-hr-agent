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
  UNAUTHORIZED: 401
} as const;

vi.mock('@prisma/client', () => {
  const mockPrismaClient = {
    codingAgent: {
      create: vi.fn().mockResolvedValue({ id: 'test-db-id' }),
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({ id: 'test-db-id' }),
      delete: vi.fn().mockResolvedValue({ id: 'test-db-id' }),
      findFirstOrThrow: vi.fn().mockResolvedValue({ id: 'test-db-id' })
    },
    issue: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'test-id' }),
      update: vi.fn().mockResolvedValue({ id: 'test-id' }),
      delete: vi.fn().mockResolvedValue({ id: 'test-id' }),
      findFirstOrThrow: vi.fn().mockResolvedValue({ id: 'test-id' })
    },
    pullRequest: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'test-id' }),
      update: vi.fn().mockResolvedValue({ id: 'test-id' }),
      delete: vi.fn().mockResolvedValue({ id: 'test-id' }),
      findFirstOrThrow: vi.fn().mockResolvedValue({ id: 'test-id' })
    },
    task: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'test-id' }),
      update: vi.fn().mockResolvedValue({ id: 'test-id' }),
      delete: vi.fn().mockResolvedValue({ id: 'test-id' }),
      findFirstOrThrow: vi.fn().mockResolvedValue({ id: 'test-id' })
    },
    agent: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'test-id' }),
      update: vi.fn().mockResolvedValue({ id: 'test-id' }),
      delete: vi.fn().mockResolvedValue({ id: 'test-id' }),
      findFirstOrThrow: vi.fn().mockResolvedValue({ id: 'test-id' })
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

describe('CA Routes Tests', () => {
  let app: Express;
  const TEST_SECRET = 'test-secret';

  beforeEach(async () => {
    process.env.DOCKER_CA_SECRET = TEST_SECRET;
    app = express();
    app.use(express.json());
    const { default: autoLoadRoutes } = await import('./middleware/autoLoadRoutes.js');
    const ROUTES_DIR = join(__dirname, 'routes');
    await autoLoadRoutes(app, ROUTES_DIR);
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.DOCKER_CA_SECRET;
  });

  it('应该响应 /v1/ca/add POST 路由', async () => {
    const response = await request(app)
      .post('/v1/ca/add')
      .set('X-CA-Secret', TEST_SECRET)
      .send({ name: 'test-container' });

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(response.body).toHaveProperty('code', HTTP_STATUS.OK);
    expect(response.body.data).toHaveProperty('name', 'test-container');
    expect(response.body.data).toHaveProperty('containerName', 'ca-test-container');
    expect(response.body.data).toHaveProperty('internalUrl');
    expect(response.body.data).toHaveProperty('message', 'Docker container created successfully');
  });

  it('应该使用 issueId 创建容器', async () => {
    const response = await request(app)
      .post('/v1/ca/add')
      .set('X-CA-Secret', TEST_SECRET)
      .send({ issueId: 123 });

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(response.body).toHaveProperty('code', HTTP_STATUS.OK);
    expect(response.body.data).toHaveProperty('name', 'hra_ca_123');
    expect(response.body.data).toHaveProperty('containerName', 'ca-hra_ca_123');
    expect(response.body.data).toHaveProperty('internalUrl');
    expect(response.body.data).toHaveProperty('message', 'Docker container created successfully');
  });

  it('应该在 name 和 issueId 都缺失时返回 400 错误', async () => {
    const response = await request(app).post('/v1/ca/add').set('X-CA-Secret', TEST_SECRET).send({});

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(response.body).toHaveProperty('code', HTTP_STATUS.BAD_REQUEST);
    expect(response.body).toHaveProperty('message', 'name or issueId is required');
  });

  it('应该在缺少认证头时返回 401 错误', async () => {
    const response = await request(app).post('/v1/ca/add').send({ name: 'test-container' });

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(response.body).toHaveProperty('code', HTTP_STATUS.UNAUTHORIZED);
    expect(response.body).toHaveProperty('message', 'Unauthorized: invalid or missing secret');
  });

  it('应该在 name 缺失时返回 400 错误', async () => {
    const response = await request(app).post('/v1/ca/add').set('X-CA-Secret', TEST_SECRET).send({});

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(response.body).toHaveProperty('code', HTTP_STATUS.BAD_REQUEST);
    expect(response.body).toHaveProperty('message', 'name is required and must be a string');
  });

  it('应该在 name 不是字符串时返回 400 错误', async () => {
    const response = await request(app)
      .post('/v1/ca/add')
      .set('X-CA-Secret', TEST_SECRET)
      .send({ name: 123 });

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(response.body).toHaveProperty('code', HTTP_STATUS.BAD_REQUEST);
    expect(response.body).toHaveProperty('message', 'name is required and must be a string');
  });

  it('应该在 name 包含无效字符时返回 400 错误', async () => {
    const response = await request(app)
      .post('/v1/ca/add')
      .set('X-CA-Secret', TEST_SECRET)
      .send({ name: 'invalid container name!' });

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(response.body).toHaveProperty('code', HTTP_STATUS.BAD_REQUEST);
    expect(response.body.message).toContain('name must be a valid Docker container name');
  });

  it('应该拒绝对 POST 路由的 GET 请求', async () => {
    const response = await request(app).get('/v1/ca/add');
    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(response.body).toHaveProperty('code', HTTP_STATUS.UNAUTHORIZED);
  });

  it('应该在缺少认证头时返回 401 错误 - DELETE', async () => {
    const response = await request(app).delete('/v1/ca/test');

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(response.body).toHaveProperty('code', HTTP_STATUS.UNAUTHORIZED);
    expect(response.body).toHaveProperty('message', 'Unauthorized: invalid or missing secret');
  });
});
