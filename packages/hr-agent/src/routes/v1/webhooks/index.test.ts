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
  INTERNAL_SERVER_ERROR: 500
} as const;

const mockReceiveWebhook = vi.fn();

vi.mock('../../../utils/webhookHandler.js', () => ({
  receiveWebhook: mockReceiveWebhook
}));

vi.mock('../../../utils/secretManager.js', () => ({
  getDockerCASecret: vi.fn().mockReturnValue('test-secret'),
  getGitHubWebhookSecret: vi.fn().mockReturnValue('test-webhook-secret'),
  getGitHubToken: vi.fn().mockReturnValue('test-token'),
  getGitHubOwner: vi.fn().mockReturnValue('test-owner'),
  getGitHubRepo: vi.fn().mockReturnValue('test-repo'),
  getSecret: vi.fn().mockReturnValue('test-secret')
}));

vi.mock('@prisma/client', () => {
  const mockPrismaClient = {
    codingAgent: {
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([])
    },
    issue: {
      findUnique: vi.fn().mockResolvedValue(null)
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

describe('Webhooks Routes Tests', () => {
  let app: Express;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockReceiveWebhook.mockReset();

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

  describe('POST /v1/webhooks/issues', () => {
    it('应该在 webhook 处理成功时返回 200', async () => {
      mockReceiveWebhook.mockResolvedValueOnce({ success: true });

      const response = await request(app)
        .post('/v1/webhooks/issues')
        .set('x-github-event', 'issues')
        .set('x-hub-signature-256', 'sha256=test-signature')
        .send({ action: 'opened', issue: { number: 1 } });

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(mockReceiveWebhook).toHaveBeenCalled();
    });

    it('应该在 webhook 处理失败时返回 400', async () => {
      mockReceiveWebhook.mockResolvedValueOnce({ success: false, error: 'Invalid signature' });

      const response = await request(app)
        .post('/v1/webhooks/issues')
        .set('x-github-event', 'issues')
        .send({ action: 'opened' });

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    });

    it('应该在异常时返回 500', async () => {
      mockReceiveWebhook.mockRejectedValueOnce(new Error('Unexpected error'));

      const response = await request(app)
        .post('/v1/webhooks/issues')
        .set('x-github-event', 'issues')
        .send({});

      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
    });
  });

  describe('POST /v1/webhooks/pullRequests', () => {
    it('应该在 webhook 处理成功时返回 200', async () => {
      mockReceiveWebhook.mockResolvedValueOnce({ success: true });

      const response = await request(app)
        .post('/v1/webhooks/pullRequests')
        .set('x-github-event', 'pull_request')
        .set('x-hub-signature-256', 'sha256=test-signature')
        .send({ action: 'opened', pull_request: { number: 1 } });

      expect(response.status).toBe(HTTP_STATUS.OK);
      expect(mockReceiveWebhook).toHaveBeenCalled();
    });

    it('应该在 webhook 处理失败时返回 400', async () => {
      mockReceiveWebhook.mockResolvedValueOnce({ success: false, error: 'Invalid signature' });

      const response = await request(app)
        .post('/v1/webhooks/pullRequests')
        .set('x-github-event', 'pull_request')
        .send({ action: 'opened' });

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    });
  });
});
