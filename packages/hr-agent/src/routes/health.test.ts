import { describe, it, expect, beforeEach } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';

describe('Health Route Tests', () => {
  let app: Express;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    const { default: healthRoute } = await import('./health.js');
    app.get('/health', healthRoute);
  });

  describe('GET /health', () => {
    it('应该返回状态为 ok', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('code', 200);
      expect(response.body).toHaveProperty('message', 'success');
      expect(response.body.data).toEqual({ status: 'ok' });
    });

    it('应该返回正确的响应结构', async () => {
      const response = await request(app).get('/health');

      expect(response.body).toHaveProperty('code');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
    });
  });
});
