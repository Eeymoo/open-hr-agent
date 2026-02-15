import { describe, it, expect, beforeEach, vi } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';

vi.mock('../../../config/taskConfig.js', () => ({
  TASK_CONFIG: {
    CA_NAME_PREFIX: 'test-ca-prefix'
  }
}));

describe('Config Route Tests', () => {
  let app: Express;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    const { default: configRoute } = await import('./index.get.js');
    app.get('/v1/config', configRoute);
  });

  describe('GET /v1/config', () => {
    it('应该返回 CA 名称前缀配置', async () => {
      const response = await request(app).get('/v1/config');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('code', 200);
      expect(response.body).toHaveProperty('message', 'success');
      expect(response.body.data).toHaveProperty('caNamePrefix', 'test-ca-prefix');
    });

    it('应该返回正确的响应结构', async () => {
      const response = await request(app).get('/v1/config');

      expect(response.body).toHaveProperty('code');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
    });
  });
});
