import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';
import crypto from 'node:crypto';

const TEST_SECRET = 'test-webhook-secret-123';

describe('Webhook Routes Tests', () => {
  let app: Express;

  beforeEach(async () => {
    process.env.GITHUB_WEBHOOK_SECRET = TEST_SECRET;
    process.env.NODE_ENV = 'test';

    app = express();
    app.use(
      express.json({
        verify: (req, _res, buf) => {
          (req as unknown as Record<string, unknown>).rawBody = buf;
        }
      })
    );

    const issuesWebhook = await import('./routes/v1/webhooks/issues.js');
    const pullRequestsWebhook = await import('./routes/v1/webhooks/pullRequests.js');

    app.post('/v1/webhooks/issues', issuesWebhook.default);
    app.post('/v1/webhooks/pullRequests', pullRequestsWebhook.default);
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.GITHUB_WEBHOOK_SECRET;
  });

  function generateSignature(payload: Record<string, unknown>): string {
    const payloadString = JSON.stringify(payload);
    const hmac = crypto.createHmac('sha256', TEST_SECRET);
    hmac.update(payloadString);
    return `sha256=${hmac.digest('hex')}`;
  }

  describe('Issues Webhook', () => {
    it('应该处理有效的 issues webhook', async () => {
      const payload = {
        action: 'opened',
        issue: {
          number: 123,
          title: 'Test Issue',
          user: { login: 'testuser' },
          html_url: 'https://github.com/test/repo/issues/123',
          state: 'open',
          labels: [{ name: 'bug' }, { name: 'high-priority' }]
        },
        repository: {
          full_name: 'test/repo'
        }
      };

      const signature = generateSignature(payload);

      const response = await request(app)
        .post('/v1/webhooks/issues')
        .set('X-Hub-Signature-256', signature)
        .set('X-GitHub-Event', 'issues')
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('received', true);
      expect(response.body).toHaveProperty('event', 'issues');
    });

    it('应该拒绝无效签名的请求', async () => {
      const payload = { test: 'data' };

      const response = await request(app)
        .post('/v1/webhooks/issues')
        .set('X-Hub-Signature-256', 'invalid-signature')
        .set('X-GitHub-Event', 'issues')
        .send(payload);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid signature');
    });

    it('应该处理缺少 signature header 的请求', async () => {
      const payload = { test: 'data' };

      const response = await request(app)
        .post('/v1/webhooks/issues')
        .set('X-GitHub-Event', 'issues')
        .send(payload);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid signature');
    });

    it('应该处理 issue_comment 事件', async () => {
      const payload = {
        action: 'created',
        issue: {
          number: 456,
          title: 'Another Issue',
          user: { login: 'commenter' },
          html_url: 'https://github.com/test/repo/issues/456',
          state: 'open',
          labels: []
        },
        repository: {
          full_name: 'test/repo'
        }
      };

      const signature = generateSignature(payload);

      const response = await request(app)
        .post('/v1/webhooks/issues')
        .set('X-Hub-Signature-256', signature)
        .set('X-GitHub-Event', 'issue_comment')
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('received', true);
    });
  });

  describe('Pull Requests Webhook', () => {
    it('应该处理有效的 pull_request webhook', async () => {
      const payload = {
        action: 'opened',
        pull_request: {
          number: 789,
          title: 'Test PR',
          user: { login: 'prauthor' },
          html_url: 'https://github.com/test/repo/pull/789',
          state: 'open',
          merged: false,
          labels: [{ name: 'enhancement' }]
        },
        repository: {
          full_name: 'test/repo'
        }
      };

      const signature = generateSignature(payload);

      const response = await request(app)
        .post('/v1/webhooks/pullRequests')
        .set('X-Hub-Signature-256', signature)
        .set('X-GitHub-Event', 'pull_request')
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('received', true);
      expect(response.body).toHaveProperty('event', 'pull_request');
    });

    it('应该拒绝无效签名的 PR 请求', async () => {
      const payload = { test: 'data' };

      const response = await request(app)
        .post('/v1/webhooks/pullRequests')
        .set('X-Hub-Signature-256', 'invalid-signature')
        .set('X-GitHub-Event', 'pull_request')
        .send(payload);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid signature');
    });

    it('应该处理 pull_request_review 事件', async () => {
      const payload = {
        action: 'submitted',
        pull_request: {
          number: 100,
          title: 'Review PR',
          user: { login: 'reviewer' },
          html_url: 'https://github.com/test/repo/pull/100',
          state: 'open',
          merged: false,
          labels: []
        },
        repository: {
          full_name: 'test/repo'
        }
      };

      const signature = generateSignature(payload);

      const response = await request(app)
        .post('/v1/webhooks/pullRequests')
        .set('X-Hub-Signature-256', signature)
        .set('X-GitHub-Event', 'pull_request_review')
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('received', true);
    });

    it('应该处理已合并的 PR', async () => {
      const payload = {
        action: 'closed',
        pull_request: {
          number: 200,
          title: 'Merged PR',
          user: { login: 'merger' },
          html_url: 'https://github.com/test/repo/pull/200',
          state: 'closed',
          merged: true,
          labels: []
        },
        repository: {
          full_name: 'test/repo'
        }
      };

      const signature = generateSignature(payload);

      const response = await request(app)
        .post('/v1/webhooks/pullRequests')
        .set('X-Hub-Signature-256', signature)
        .set('X-GitHub-Event', 'pull_request')
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('received', true);
    });
  });

  describe('Webhook Security', () => {
    it('应该在 GITHUB_WEBHOOK_SECRET 未配置时返回错误', async () => {
      delete process.env.GITHUB_WEBHOOK_SECRET;

      const app2 = express();
      app2.use(express.json());
      const issuesWebhook = await import('./routes/v1/webhooks/issues.js');
      app2.post('/v1/webhooks/issues', issuesWebhook.default);

      const payload = { test: 'data' };
      const signature = generateSignature(payload);

      const response = await request(app2)
        .post('/v1/webhooks/issues')
        .set('X-Hub-Signature-256', signature)
        .set('X-GitHub-Event', 'issues')
        .send(payload);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid signature');
    });
  });
});
