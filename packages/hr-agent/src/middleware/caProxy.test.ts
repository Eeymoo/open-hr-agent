import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';
import caProxyMiddleware, { rewriteHtmlPaths, injectBaseTag } from './caProxy.js';

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

  describe('rewriteHtmlPaths', () => {
    it('应重写绝对路径的 src 属性', () => {
      const html = '<script src="/assets/index.js"></script>';
      const result = rewriteHtmlPaths(html, '/ca/test-ca/');
      expect(result).toBe('<script src="/ca/test-ca/assets/index.js"></script>');
    });

    it('应重写绝对路径的 href 属性', () => {
      const html = '<link rel="stylesheet" href="/assets/style.css">';
      const result = rewriteHtmlPaths(html, '/ca/test-ca/');
      expect(result).toBe('<link rel="stylesheet" href="/ca/test-ca/assets/style.css">');
    });

    it('应保留外部链接不变', () => {
      const html = '<a href="https://example.com">Link</a>';
      const result = rewriteHtmlPaths(html, '/ca/test-ca/');
      expect(result).toBe('<a href="https://example.com">Link</a>');
    });

    it('应保留协议相对链接不变', () => {
      const html = '<script src="//cdn.example.com/lib.js"></script>';
      const result = rewriteHtmlPaths(html, '/ca/test-ca/');
      expect(result).toBe('<script src="//cdn.example.com/lib.js"></script>');
    });

    it('应保留已有的 /ca/ 路径不变', () => {
      const html = '<a href="/ca/other/path">Link</a>';
      const result = rewriteHtmlPaths(html, '/ca/test-ca/');
      expect(result).toBe('<a href="/ca/other/path">Link</a>');
    });

    it('应处理多个属性', () => {
      const html =
        '<script src="/js/app.js"></script><link href="/css/style.css"><img src="/img/logo.png">';
      const result = rewriteHtmlPaths(html, '/ca/test-ca/');
      expect(result).toBe(
        '<script src="/ca/test-ca/js/app.js"></script><link href="/ca/test-ca/css/style.css"><img src="/ca/test-ca/img/logo.png">'
      );
    });

    it('应处理 Vite 构建后的典型 HTML', () => {
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <link rel="icon" href="/vite.svg">
  <script type="module" src="/assets/index-CtVOE8w2.js"></script>
  <link rel="stylesheet" href="/assets/index-BmGkTJQe.css">
</head>
<body>
  <div id="root"></div>
</body>
</html>`;
      const result = rewriteHtmlPaths(html, '/ca/hra_test/');
      expect(result).toContain('href="/ca/hra_test/vite.svg"');
      expect(result).toContain('src="/ca/hra_test/assets/index-CtVOE8w2.js"');
      expect(result).toContain('href="/ca/hra_test/assets/index-BmGkTJQe.css"');
    });
  });

  describe('injectBaseTag', () => {
    it('应在 <head> 后插入 <base> 标签', () => {
      const html = '<html><head><title>Test</title></head><body></body></html>';
      const result = injectBaseTag(html, '/ca/test-ca/');
      expect(result).toBe('<html><head><base href="/ca/test-ca/"><title>Test</title></head><body></body></html>');
    });

    it('当没有 <head> 标签时应返回原 HTML', () => {
      const html = '<html><body></body></html>';
      const result = injectBaseTag(html, '/ca/test-ca/');
      expect(result).toBe(html);
    });
  });
});
