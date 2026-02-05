import { Buffer } from 'node:buffer';
import crypto from 'node:crypto';
import type { Response } from 'express';

const HTTP_STATUS_INTERNAL_SERVER_ERROR = 500;
const HTTP_STATUS_UNAUTHORIZED = 401;

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

export function sendUnauthorizedResponse(res: Response): void {
  res.status(HTTP_STATUS_UNAUTHORIZED).json({ error: 'Invalid signature' });
}

export function sendSecretNotConfiguredResponse(res: Response): void {
  console.error('GitHub webhook secret is not configured.');
  res.status(HTTP_STATUS_INTERNAL_SERVER_ERROR).json({ error: 'Webhook secret not configured' });
}

export function sendSuccessResponse(res: Response, event: string): void {
  res.json({ received: true, event });
}

export function sendErrorResponse(res: Response, error: unknown): void {
  console.error('Error handling webhook:', error);
  if (!res.headersSent) {
    res
      .status(HTTP_STATUS_INTERNAL_SERVER_ERROR)
      .json({ received: false, error: 'Internal server error' });
  }
}

export function logWebhookReceived(webhookType: string, event: string): void {
  console.log(`=== GitHub ${webhookType} Webhook Received ===`);
  console.log(`Event Type: ${event}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
}

export function logWebhookPayload(webhookData: unknown): void {
  if (process.env.NODE_ENV !== 'production') {
    console.log('Payload keys:', Object.keys(webhookData ?? {}));
  }
}

export function formatLabels(labels: unknown): string {
  const labelsArray = Array.isArray(labels) ? labels : [];
  return labelsArray.length > 0
    ? labelsArray.map((label: { name: string }) => label.name).join(', ')
    : 'None';
}
