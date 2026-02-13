import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';
import caProxyMiddleware from './caProxy.js';

const mockCodingAgentFindFirst = vi.fn();
const mockGetContainerByName = vi.fn();

vi.mock('../utils/database.js', () => ({
  getPrismaClient: () => ({
    codingAgent: {
      findFirst: mockCodingAgentFindFirst
    }
  })
}));

vi.mock('../utils/docker/getContainer.js', () => ({
  getContainerByName: () => mockGetContainerByName()
}));

vi.mock('../config/docker.js', () => ({
  DOCKER_CONFIG: {
    PORT: '4096'
  }
}));

vi.mock('../utils/envSecrets.js', () => ({
  getOptionalEnvValue: () => 'http://test.example.com'
}));

describe('caProxy 中间件测试', () => {
  let app: Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(caProxyMiddleware);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('错误处理', () => {
    it('当 CA 不在数据库中时，应返回 404', async () => {
      mockCodingAgentFindFirst.mockResolvedValue(null);

      const response = await request(app).get('/ca/test-ca/');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        code: 404,
        message: 'CA "test-ca" not found in database'
      });
    });

    it('当 Docker 容器不存在时，应返回 404', async () => {
      mockCodingAgentFindFirst.mockResolvedValue({ caName: 'test-ca' });
      mockGetContainerByName.mockResolvedValue(null);

      const response = await request(app).get('/ca/test-ca/');

      expect(response.status).toBe(404);
      expect(response.body.code).toBe(404);
      expect(response.body.message).toContain('Docker container "test-ca" not found');
    });

    it('当容器未运行时，应返回 503', async () => {
      mockCodingAgentFindFirst.mockResolvedValue({ caName: 'test-ca' });
      mockGetContainerByName.mockResolvedValue({
        id: 'container-id',
        name: 'test-ca',
        status: 'exited',
        state: false,
        created: '2024-01-01T00:00:00Z'
      });

      const response = await request(app).get('/ca/test-ca/');

      expect(response.status).toBe(503);
      expect(response.body.code).toBe(503);
      expect(response.body.message).toContain('CA container "test-ca" is not running');
    });
  });

  describe('代理功能', () => {
    it('应正确处理非 /ca 路径的请求', async () => {
      const response = await request(app).get('/other-path');

      expect(response.status).toBe(404);
    });
  });
});
