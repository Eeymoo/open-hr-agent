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

const mockIssueFindMany = vi.fn().mockResolvedValue([]);
const mockIssueFindFirst = vi.fn().mockResolvedValue(null);
const mockIssueFindUnique = vi.fn().mockResolvedValue(null);
const mockIssueCreate = vi.fn().mockResolvedValue({ id: 1 });
const mockIssueUpdate = vi.fn().mockResolvedValue({ id: 1 });
const mockIssueDelete = vi.fn().mockResolvedValue({ id: 1 });
const mockIssueCount = vi.fn().mockResolvedValue(0);

vi.mock('@prisma/client', () => {
  const mockPrismaClient = {
    issue: {
      findMany: mockIssueFindMany,
      findFirst: mockIssueFindFirst,
      findUnique: mockIssueFindUnique,
      create: mockIssueCreate,
      update: mockIssueUpdate,
      delete: mockIssueDelete,
      count: mockIssueCount
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

describe('Issues Routes Tests', () => {
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

  describe('GET /v1/issues', () => {
    it('应该成功获取 Issue 列表', async () => {
      mockIssueFindMany.mockResolvedValueOnce([]);
      mockIssueCount.mockResolvedValueOnce(0);

      const response = await request(app).get('/v1/issues');

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.OK);
      expect(response.body.data).toHaveProperty('issues');
      expect(response.body.data).toHaveProperty('pagination');
    });

    it('应该支持分页参数', async () => {
      mockIssueFindMany.mockResolvedValueOnce([]);
      mockIssueCount.mockResolvedValueOnce(0);

      const response = await request(app).get('/v1/issues?page=2&pageSize=20');

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body.data.pagination).toHaveProperty('page', 2);
      expect(response.body.data.pagination).toHaveProperty('pageSize', 20);
    });

    it('应该支持排序参数', async () => {
      mockIssueFindMany.mockResolvedValueOnce([]);
      mockIssueCount.mockResolvedValueOnce(0);

      const response = await request(app).get('/v1/issues?orderBy=issueTitle');

      expect(response.status).toBe(HTTP_STATUS.OK);
    });
  });

  describe('POST /v1/issues', () => {
    it('应该在缺少必填字段时返回 400', async () => {
      const response = await request(app).post('/v1/issues').send({});

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.BAD_REQUEST);
      expect(response.body.message).toContain('issueId, issueUrl, and issueTitle are required');
    });

    it('应该成功创建 Issue', async () => {
      mockIssueFindUnique.mockResolvedValueOnce(null);
      mockIssueCreate.mockResolvedValueOnce({
        id: 1,
        issueId: 123,
        issueUrl: 'https://github.com/test/repo/issues/123',
        issueTitle: 'Test Issue'
      });

      const response = await request(app).post('/v1/issues').send({
        issueId: 123,
        issueUrl: 'https://github.com/test/repo/issues/123',
        issueTitle: 'Test Issue'
      });

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.OK);
      expect(response.body.data).toHaveProperty('issueId', 123);
    });

    it('应该在 Issue 已存在时返回 409', async () => {
      mockIssueFindUnique.mockResolvedValueOnce({
        id: 1,
        issueId: 123
      });

      const response = await request(app).post('/v1/issues').send({
        issueId: 123,
        issueUrl: 'https://github.com/test/repo/issues/123',
        issueTitle: 'Test Issue'
      });

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.CONFLICT);
      expect(response.body.message).toContain('already exists');
    });
  });

  describe('GET /v1/issues/:id', () => {
    it('应该在 Issue 不存在时返回 404', async () => {
      mockIssueFindFirst.mockResolvedValueOnce(null);

      const response = await request(app).get('/v1/issues/999');

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.NOT_FOUND);
    });

    it('应该成功获取单个 Issue', async () => {
      mockIssueFindFirst.mockResolvedValueOnce({
        id: 1,
        issueId: 123,
        issueUrl: 'https://github.com/test/repo/issues/123',
        issueTitle: 'Test Issue'
      });

      const response = await request(app).get('/v1/issues/1');

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.OK);
      expect(response.body.data).toHaveProperty('id', 1);
    });
  });

  describe('PUT /v1/issues/:id', () => {
    it('应该在 Issue 不存在时返回 404', async () => {
      mockIssueFindFirst.mockResolvedValueOnce(null);

      const response = await request(app).put('/v1/issues/999').send({
        issueTitle: 'Updated Title'
      });

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.NOT_FOUND);
    });

    it('应该成功更新 Issue', async () => {
      mockIssueFindFirst.mockResolvedValueOnce({
        id: 1,
        issueId: 123,
        issueTitle: 'Test Issue'
      });
      mockIssueUpdate.mockResolvedValueOnce({
        id: 1,
        issueTitle: 'Updated Title'
      });

      const response = await request(app).put('/v1/issues/1').send({
        issueTitle: 'Updated Title'
      });

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.OK);
    });
  });

  describe('DELETE /v1/issues/:id', () => {
    it('应该在 Issue 不存在时返回 404', async () => {
      mockIssueFindFirst.mockResolvedValueOnce(null);

      const response = await request(app).delete('/v1/issues/999');

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.NOT_FOUND);
    });

    it('应该成功删除 Issue', async () => {
      mockIssueFindFirst.mockResolvedValueOnce({
        id: 1,
        issueId: 123
      });
      mockIssueUpdate.mockResolvedValueOnce({ id: 1 });

      const response = await request(app).delete('/v1/issues/1');

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(response.body).toHaveProperty('code', HTTP_STATUS.OK);
    });
  });
});
