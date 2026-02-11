import { Buffer } from 'node:buffer';
import crypto from 'node:crypto';
import type { Response } from 'express';

const HTTP_STATUS_INTERNAL_SERVER_ERROR = 500;
const HTTP_STATUS_UNAUTHORIZED = 401;

/**
 * 验证 GitHub Webhook 签名
 * @param signatureHeader - 签名头，格式为 'sha256=...'
 * @param webhookSecret - Webhook 密钥
 * @param body - 请求体
 * @returns 签名是否有效
 */
export function verifyWebhookSignature(
  signatureHeader: string | undefined,
  webhookSecret: string,
  body: unknown
): boolean {
  if (!webhookSecret) {
    console.error('GitHub webhook secret is not configured.');
    return false;
  }

  if (!signatureHeader) {
    console.warn('Missing X-Hub-Signature-256 header on GitHub webhook request.');
    return false;
  }

  const rawBodyValue =
    (body as Record<string, unknown> | undefined)?.rawBody ?? JSON.stringify(body ?? {});
  const rawBodyBuffer = Buffer.isBuffer(rawBodyValue)
    ? rawBodyValue
    : Buffer.from(String(rawBodyValue), 'utf8');

  const hmac = crypto.createHmac('sha256', webhookSecret);
  hmac.update(rawBodyBuffer);
  const expectedSignature = `sha256=${hmac.digest('hex')}`;

  const providedSignatureBuffer = Buffer.from(signatureHeader, 'utf8');
  const expectedSignatureBuffer = Buffer.from(expectedSignature, 'utf8');

  return (
    providedSignatureBuffer.length === expectedSignatureBuffer.length &&
    crypto.timingSafeEqual(providedSignatureBuffer, expectedSignatureBuffer)
  );
}

/**
 * 发送未授权响应
 * @param res - Express Response 对象
 */
export function sendUnauthorizedResponse(res: Response): void {
  res.status(HTTP_STATUS_UNAUTHORIZED).json({ error: 'Invalid signature' });
}

/**
 * 发送密钥未配置响应
 * @param res - Express Response 对象
 */
export function sendSecretNotConfiguredResponse(res: Response): void {
  console.error('GitHub webhook secret is not configured.');
  res.status(HTTP_STATUS_INTERNAL_SERVER_ERROR).json({ error: 'Webhook secret not configured' });
}

/**
 * 发送成功响应
 * @param res - Express Response 对象
 * @param event - 事件类型
 */
export function sendSuccessResponse(res: Response, event: string): void {
  res.json({ received: true, event });
}

/**
 * 发送错误响应
 * @param res - Express Response 对象
 * @param error - 错误对象
 */
export function sendErrorResponse(res: Response, error: unknown): void {
  console.error('Error handling webhook:', error);
  if (!res.headersSent) {
    res
      .status(HTTP_STATUS_INTERNAL_SERVER_ERROR)
      .json({ received: false, error: 'Internal server error' });
  }
}

/**
 * 记录 Webhook 接收信息
 * @param webhookType - Webhook 类型（如 'Issues'）
 * @param event - 事件类型
 */
export function logWebhookReceived(webhookType: string, event: string): void {
  console.log(`=== GitHub ${webhookType} Webhook Received ===`);
  console.log(`Event Type: ${event}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
}

/**
 * 记录 Webhook 载荷信息（仅在非生产环境）
 * @param webhookData - Webhook 数据
 */
export function logWebhookPayload(webhookData: unknown): void {
  if (process.env.NODE_ENV !== 'production') {
    console.log('Payload keys:', Object.keys(webhookData ?? {}));
  }
}

/**
 * 格式化标签列表为字符串
 * @param labels - 标签数组
 * @returns 格式化后的标签字符串
 */
export function formatLabels(labels: unknown): string {
  const labelsArray = Array.isArray(labels) ? labels : [];
  return labelsArray.length > 0
    ? labelsArray.map((label: { name: string }) => label.name).join(', ')
    : 'None';
}
