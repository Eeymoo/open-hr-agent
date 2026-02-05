import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'node:crypto';
import type { Response } from 'express';
import { Buffer } from 'node:buffer';
import {
  verifyWebhookSignature,
  sendUnauthorizedResponse,
  sendSecretNotConfiguredResponse,
  sendSuccessResponse,
  sendErrorResponse,
  logWebhookReceived,
  logWebhookPayload,
  formatLabels
} from './webhook.js';

describe('webhook 工具函数测试', () => {
  const TEST_SECRET = 'test-webhook-secret';
  const consoleSpy = vi.spyOn(console, 'log');
  const consoleWarnSpy = vi.spyOn(console, 'warn');
  const consoleErrorSpy = vi.spyOn(console, 'error');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('verifyWebhookSignature', () => {
    it('应该验证有效的签名', () => {
      const payload = { test: 'data' };
      const payloadString = JSON.stringify(payload);
      const hmac = crypto.createHmac('sha256', TEST_SECRET);
      hmac.update(payloadString);
      const signature = `sha256=${hmac.digest('hex')}`;

      const result = verifyWebhookSignature(signature, TEST_SECRET, payload);
      expect(result).toBe(true);
    });

    it('应该拒绝无效的签名', () => {
      const payload = { test: 'data' };
      const invalidSignature = 'sha256=invalid';

      const result = verifyWebhookSignature(invalidSignature, TEST_SECRET, payload);
      expect(result).toBe(false);
    });

    it('应该在 secret 为空时返回 false', () => {
      const payload = { test: 'data' };
      const signature = 'sha256=some-signature';

      const result = verifyWebhookSignature(signature, '', payload);
      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('应该在 signature header 缺失时返回 false', () => {
      const payload = { test: 'data' };

      const result = verifyWebhookSignature(undefined, TEST_SECRET, payload);
      expect(result).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('应该处理带 rawBody 的 payload', () => {
      const payloadString = JSON.stringify({ test: 'data' });
      const rawBody = Buffer.from(payloadString, 'utf8');
      const bodyWithRawBody = { rawBody };

      const hmac = crypto.createHmac('sha256', TEST_SECRET);
      hmac.update(rawBody);
      const signature = `sha256=${hmac.digest('hex')}`;

      const result = verifyWebhookSignature(signature, TEST_SECRET, bodyWithRawBody);
      expect(result).toBe(true);
    });

    it('应该使用 timingSafeEqual 防止时序攻击', () => {
      const payload = { test: 'data' };
      const payloadString = JSON.stringify(payload);
      const hmac = crypto.createHmac('sha256', TEST_SECRET);
      hmac.update(payloadString);
      const correctSignature = `sha256=${hmac.digest('hex')}`;

      const timingSafeEqualSpy = vi.spyOn(crypto, 'timingSafeEqual');

      verifyWebhookSignature(correctSignature, TEST_SECRET, payload);
      expect(timingSafeEqualSpy).toHaveBeenCalled();
    });
  });

  describe('sendUnauthorizedResponse', () => {
    it('应该发送 401 未授权响应', () => {
      const mockResponse = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as unknown as Response;

      sendUnauthorizedResponse(mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Invalid signature' });
    });
  });

  describe('sendSecretNotConfiguredResponse', () => {
    it('应该发送 500 内部服务器错误响应', () => {
      const mockResponse = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as unknown as Response;

      sendSecretNotConfiguredResponse(mockResponse);

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Webhook secret not configured' });
    });
  });

  describe('sendSuccessResponse', () => {
    it('应该发送成功响应', () => {
      const mockResponse = {
        json: vi.fn()
      } as unknown as Response;
      const event = 'issues';

      sendSuccessResponse(mockResponse, event);

      expect(mockResponse.json).toHaveBeenCalledWith({ received: true, event });
    });
  });

  describe('sendErrorResponse', () => {
    it('应该发送错误响应', () => {
      const mockResponse = {
        headersSent: false,
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as unknown as Response;

      const error = new Error('Test error');

      sendErrorResponse(mockResponse, error);

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect((mockResponse as unknown as Record<string, unknown>).status).toHaveBeenCalledWith(500);
      expect((mockResponse as unknown as Record<string, unknown>).json).toHaveBeenCalledWith({
        received: false,
        error: 'Internal server error'
      });
    });

    it('应该在 headers 已发送时不发送响应', () => {
      const mockResponse = {
        headersSent: true,
        status: vi.fn(),
        json: vi.fn()
      } as unknown as Response;

      const error = new Error('Test error');

      sendErrorResponse(mockResponse, error);

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect((mockResponse as unknown as Record<string, unknown>).status).not.toHaveBeenCalled();
      expect((mockResponse as unknown as Record<string, unknown>).json).not.toHaveBeenCalled();
    });
  });

  describe('logWebhookReceived', () => {
    it('应该记录 webhook 接收信息', () => {
      const webhookType = 'Issues';
      const event = 'opened';

      logWebhookReceived(webhookType, event);

      expect(consoleSpy).toHaveBeenCalled();
      const { calls } = consoleSpy.mock;
      expect(calls[0][0]).toContain('GitHub Issues Webhook Received');
    });
  });

  describe('logWebhookPayload', () => {
    it('应该在非生产环境记录 payload keys', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const payload = { key1: 'value1', key2: 'value2' };

      logWebhookPayload(payload);

      expect(consoleSpy).toHaveBeenCalled();
      const { calls } = consoleSpy.mock;
      expect(calls[calls.length - 1][0]).toContain('Payload keys:');

      process.env.NODE_ENV = originalEnv;
    });

    it('应该在生产环境不记录 payload', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const payload = { key1: 'value1', key2: 'value2' };

      logWebhookPayload(payload);

      expect(consoleSpy).not.toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('formatLabels', () => {
    it('应该格式化标签数组', () => {
      const labels = [{ name: 'bug' }, { name: 'enhancement' }, { name: 'high-priority' }];

      const result = formatLabels(labels);

      expect(result).toBe('bug, enhancement, high-priority');
    });

    it('应该处理空标签数组', () => {
      const labels: unknown[] = [];

      const result = formatLabels(labels);

      expect(result).toBe('None');
    });

    it('应该处理非数组输入', () => {
      const labels = 'not an array';

      const result = formatLabels(labels);

      expect(result).toBe('None');
    });

    it('应该处理 undefined 输入', () => {
      const result = formatLabels(undefined);

      expect(result).toBe('None');
    });
  });
});
