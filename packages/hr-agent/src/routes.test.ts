import { describe, it, expect, beforeEach, vi } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

vi.mock('dockerode', () => {
  const mockContainer = {
    start: vi.fn().mockResolvedValue(undefined),
    inspect: vi.fn().mockResolvedValue({ Id: 'test-container-id' })
  };

  const mockDocker = {
    getNetwork: vi.fn().mockRejectedValue(new Error('Network not found')),
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

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    const { default: autoLoadRoutes } = await import('./middleware/autoLoadRoutes.js');
    const ROUTES_DIR = join(__dirname, 'routes');
    await autoLoadRoutes(app, ROUTES_DIR);
  });

  it('应该响应 /v1/ca/new POST 路由', async () => {
    const response = await request(app)
      .post('/v1/ca/new')
      .send({ name: 'test-container' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('code', 200);
    expect(response.body.data).toHaveProperty('name', 'test-container');
    expect(response.body.data).toHaveProperty('containerName', 'ca-test-container');
    expect(response.body.data).toHaveProperty('message', 'Docker container created successfully');
  });

  it('应该在 name 缺失时返回 400 错误', async () => {
    const response = await request(app)
      .post('/v1/ca/new')
      .send({});

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('code', 400);
    expect(response.body).toHaveProperty('message', 'name is required and must be a string');
  });

  it('应该在 name 不是字符串时返回 400 错误', async () => {
    const response = await request(app)
      .post('/v1/ca/new')
      .send({ name: 123 });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('code', 400);
    expect(response.body).toHaveProperty('message', 'name is required and must be a string');
  });

  it('应该在应该拒绝对 POST 路由的 GET 请求', async () => {
    const response = await request(app).get('/v1/ca/new');
    expect(response.status).toBe(404);
  });
});
