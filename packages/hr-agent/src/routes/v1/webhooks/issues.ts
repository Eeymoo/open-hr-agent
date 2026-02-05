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

export default function issuesWebhook(req: Request, res: Response): void {
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

    console.log('=== GitHub Issues Webhook Received ===');
    console.log(`Event Type: ${event}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);

    if (process.env.NODE_ENV !== 'production') {
      console.log('Payload keys:', Object.keys(webhookData ?? {}));
    }

    if (event === 'issues' || event === 'issue_comment') {
      const { action, issue: issueData, repository } = webhookData ?? {};
      const issue = issueData ?? {};

      if (!issueData || !repository) {
        console.log(
          'Issue or repository data is missing from the webhook payload; skipping detailed logging.'
        );
      } else {
        const repositoryName = repository.full_name ?? 'Unknown repository';
        const issueNumber = issue.number ?? 'Unknown';
        const issueTitle = issue.title ?? 'Untitled';
        const authorLogin = issue.user?.login ?? 'Unknown';
        const issueUrl = issue.html_url ?? 'N/A';
        const issueState = issue.state ?? 'Unknown';
        const labelsArray = Array.isArray(issue.labels) ? issue.labels : [];
        const labelsText =
          labelsArray.length > 0
            ? labelsArray.map((label: { name: string }) => label.name).join(', ')
            : 'None';

        console.log(`=== Issue ${action} ===`);
        console.log(`Repository: ${repositoryName}`);
        console.log(`Issue #${issueNumber}: ${issueTitle}`);
        console.log(`Author: ${authorLogin}`);
        console.log(`URL: ${issueUrl}`);
        console.log(`State: ${issueState}`);
        console.log(`Labels: ${labelsText}`);
      }
    }

    res.json({ received: true, event });
  } catch (error) {
    console.error('Error handling GitHub issues webhook:', error);
    if (!res.headersSent) {
      res
        .status(HTTP_STATUS_INTERNAL_SERVER_ERROR)
        .json({ received: false, error: 'Internal server error' });
    }
  }
}
