import { Buffer } from 'node:buffer';
import crypto from 'node:crypto';
import type { Request, Response } from 'express';

const HTTP_STATUS_INTERNAL_SERVER_ERROR = 500;
const HTTP_STATUS_UNAUTHORIZED = 401;

function verifyWebhookSignature(
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

export default function pullRequestsWebhook(req: Request, res: Response): void {
  try {
    const signatureHeader = req.headers['x-hub-signature-256'] as string | undefined;
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;

    if (!verifyWebhookSignature(signatureHeader, webhookSecret ?? '', req.body)) {
      res.status(HTTP_STATUS_UNAUTHORIZED).json({ error: 'Invalid signature' });
      return;
    }

    if (!webhookSecret) {
      console.error('GitHub webhook secret is not configured.');
      res
        .status(HTTP_STATUS_INTERNAL_SERVER_ERROR)
        .json({ error: 'Webhook secret not configured' });
      return;
    }

    const webhookData = req.body;
    const event = req.headers['x-github-event'] as string;

    console.log('=== GitHub Pull Requests Webhook Received ===');
    console.log(`Event Type: ${event}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);

    if (process.env.NODE_ENV !== 'production') {
      console.log('Payload keys:', Object.keys(webhookData ?? {}));
    }

    if (event === 'pull_request' || event === 'pull_request_review') {
      const { action } = webhookData;
      const pr = webhookData.pull_request;
      const { repository } = webhookData;

      console.log(`=== Pull Request ${action ?? 'unknown'} ===`);

      if (!pr || !repository) {
        console.warn(
          'Missing pull_request or repository data in GitHub webhook payload; skipping detailed PR logging.'
        );
      } else {
        console.log(`Repository: ${repository.full_name ?? 'unknown repository'}`);
        console.log(`PR #${pr.number ?? 'unknown'}: ${pr.title ?? 'No title'}`);
        console.log(`Author: ${pr.user?.login ?? 'unknown author'}`);
        console.log(`URL: ${pr.html_url ?? 'N/A'}`);
        console.log(`State: ${pr.state ?? 'unknown'}`);
        console.log(`Merged: ${pr.merged ? 'Yes' : 'No'}`);
        const labelsArray = Array.isArray(pr.labels) ? pr.labels : [];
        const labelsText =
          labelsArray.length > 0
            ? labelsArray.map((label: { name: string }) => label.name).join(', ')
            : 'None';
        console.log(`Labels: ${labelsText}`);
      }
    }

    res.json({ received: true, event });
  } catch (error) {
    console.error('Error handling GitHub Pull Requests webhook:', error);
    if (!res.headersSent) {
      res
        .status(HTTP_STATUS_INTERNAL_SERVER_ERROR)
        .json({ received: false, error: 'Internal server error' });
    }
  }
}
