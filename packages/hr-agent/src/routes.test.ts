import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Routes Integration Tests', () => {
  let app: Express;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    const { default: autoLoadRoutes } = await import('./middleware/autoLoadRoutes.js');
    const ROUTES_DIR = join(__dirname, 'routes');
    await autoLoadRoutes(app, ROUTES_DIR);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('应该响应 /health 路由', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('code', 200);
    expect(response.body.data).toHaveProperty('status', 'ok');
  });

  it('应该响应 /v1/hello 路由', async () => {
    const response = await request(app).get('/v1/hello');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('code', 200);
    expect(response.body.data).toHaveProperty('message', 'Hello from API');
  });

  it('应该响应 /v1/error 路由', async () => {
    const response = await request(app).get('/v1/error');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('code', 400);
    expect(response.body).toHaveProperty('message', 'Bad Request');
  });

  it('应该响应 /v1/agents 路由', async () => {
    const response = await request(app).get('/v1/agents');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('code', 200);
    expect(response.body.data).toHaveProperty('agent_total', 3);
    expect(response.body.data).toHaveProperty('agent_operation_list');
    expect(Array.isArray(response.body.data.agent_operation_list)).toBe(true);
    expect(response.body.data.agent_operation_list).toHaveLength(3);
  });

  it('应该对不存在的路由返回 404', async () => {
    const response = await request(app).get('/v1/nonexistent');
    expect(response.status).toBe(404);
  });

  it('应该响应 .post.ts 文件的 POST 路由', async () => {
    await import('./routes/v1/webhooks/issues.post.js');
    const response = await request(app)
      .post('/v1/webhooks/issues')
      .set('X-Hub-Signature-256', 'test-signature')
      .set('X-GitHub-Event', 'issues')
      .send({ test: 'data' });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error', 'Invalid signature');
  });

  it('应该拒绝对 POST 路由的 GET 请求', async () => {
    const response = await request(app).get('/v1/webhooks/issues');
    expect(response.status).toBe(404);
  });
});
