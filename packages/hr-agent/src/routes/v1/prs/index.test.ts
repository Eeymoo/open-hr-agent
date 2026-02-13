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
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500
} as const;

const mockPRFindMany = vi.fn().mockResolvedValue([]);
const mockPRFindFirst = vi.fn().mockResolvedValue(null);
const mockPRFindUnique = vi.fn().mockResolvedValue(null);
const mockPRCreate = vi.fn().mockResolvedValue({ id: 1 });
const mockPRUpdate = vi.fn().mockResolvedValue({ id: 1 });
const mockPRCount = vi.fn().mockResolvedValue(0);

vi.mock('@prisma/client', () => {
  const mockPrismaClient = {
    pullRequest: {
      findMany: mockPRFindMany,
      findFirst: mockPRFindFirst,
      findUnique: mockPRFindUnique,
      create: mockPRCreate,
      update: mockPRUpdate,
      delete: vi.fn().mockResolvedValue({ id: 1 }),
      count: mockPRCount
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

describe('PRs Routes Tests', () => {
  let app: Express;

  beforeEach(async () => {
    vi.clearAllMocks();

    global.taskManager = {
      run: vi.fn().mockResolvedValue(1),
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

  describe('GET /v1/prs', () => {
    it('应该成功获取 PR 列表', async () => {
      mockPRFindMany.mockResolvedValueOnce([]);
      mockPRCount.mockResolvedValueOnce(0);

      const response = await request(app).get('/v1/prs');

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.OK);
      expect(response.body.data).toHaveProperty('prs');
      expect(response.body.data).toHaveProperty('pagination');
    });

    it('应该支持分页参数', async () => {
      mockPRFindMany.mockResolvedValueOnce([]);
      mockPRCount.mockResolvedValueOnce(0);

      const response = await request(app).get('/v1/prs?page=2&pageSize=20');

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.data.pagination).toHaveProperty('page', 2);
      expect(response.body.data.pagination).toHaveProperty('pageSize', 20);
    });

    it('应该支持 issueId 过滤', async () => {
      mockPRFindMany.mockResolvedValueOnce([]);
      mockPRCount.mockResolvedValueOnce(0);

      const response = await request(app).get('/v1/prs?issueId=123');

      expect(response.status).toBe(HTTP_STATUS.OK);
    });
  });

  describe('POST /v1/prs', () => {
    it('应该在缺少必填字段时返回 400', async () => {
      const response = await request(app).post('/v1/prs').send({});

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.BAD_REQUEST);
      expect(response.body.message).toContain('prId, prTitle, and prUrl are required');
    });

    it('应该成功创建 PR', async () => {
      mockPRFindUnique.mockResolvedValueOnce(null);
      mockPRCreate.mockResolvedValueOnce({
        id: 1,
        prId: 456,
        prTitle: 'Test PR',
        prUrl: 'https://github.com/test/repo/pull/456'
      });

      const response = await request(app).post('/v1/prs').send({
        prId: 456,
        prTitle: 'Test PR',
        prUrl: 'https://github.com/test/repo/pull/456'
      });

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.OK);
      expect(response.body.data).toHaveProperty('prId', 456);
    });

    it('应该在 PR 已存在时返回 409', async () => {
      mockPRFindUnique.mockResolvedValueOnce({
        id: 1,
        prId: 456
      });

      const response = await request(app).post('/v1/prs').send({
        prId: 456,
        prTitle: 'Test PR',
        prUrl: 'https://github.com/test/repo/pull/456'
      });

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.CONFLICT);
      expect(response.body.message).toContain('already exists');
    });
  });

  describe('GET /v1/prs/:id', () => {
    it('应该在 PR 不存在时返回 404', async () => {
      mockPRFindFirst.mockResolvedValueOnce(null);

      const response = await request(app).get('/v1/prs/999');

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.NOT_FOUND);
    });

    it('应该成功获取单个 PR', async () => {
      mockPRFindFirst.mockResolvedValueOnce({
        id: 1,
        prId: 456,
        prTitle: 'Test PR'
      });

      const response = await request(app).get('/v1/prs/1');

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.OK);
      expect(response.body.data).toHaveProperty('id', 1);
    });
  });

  describe('PUT /v1/prs/:id', () => {
    it('应该在 PR 不存在时返回 404', async () => {
      mockPRFindFirst.mockResolvedValueOnce(null);

      const response = await request(app).put('/v1/prs/999').send({
        prTitle: 'Updated Title'
      });

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.NOT_FOUND);
    });

    it('应该成功更新 PR', async () => {
      mockPRFindFirst.mockResolvedValueOnce({
        id: 1,
        prId: 456,
        prTitle: 'Test PR'
      });
      mockPRUpdate.mockResolvedValueOnce({
        id: 1,
        prTitle: 'Updated Title'
      });

      const response = await request(app).put('/v1/prs/1').send({
        prTitle: 'Updated Title'
      });

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.OK);
    });
  });

  describe('DELETE /v1/prs/:id', () => {
    it('应该在 PR 不存在时返回 404', async () => {
      mockPRFindFirst.mockResolvedValueOnce(null);

      const response = await request(app).delete('/v1/prs/999');

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.NOT_FOUND);
    });

    it('应该成功删除 PR', async () => {
      mockPRFindFirst.mockResolvedValueOnce({
        id: 1,
        prId: 456
      });
      mockPRUpdate.mockResolvedValueOnce({ id: 1 });

      const response = await request(app).delete('/v1/prs/1');

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.OK);
    });
  });
});
