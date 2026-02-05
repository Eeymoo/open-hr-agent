import type { Request, Response } from 'express';
import {
  verifyWebhookSignature,
  sendUnauthorizedResponse,
  sendSecretNotConfiguredResponse,
  sendSuccessResponse,
  sendErrorResponse,
  logWebhookReceived,
  logWebhookPayload,
  formatLabels
} from '../utils/webhook.js';

interface PullRequestData {
  number?: number;
  title?: string;
  user?: { login?: string };
  html_url?: string;
  state?: string;
  merged?: boolean;
  labels?: { name: string }[];
}

interface PullRequestsWebhookPayload {
  action?: string;
  pull_request?: PullRequestData;
  repository?: { full_name?: string };
}

function logPullRequestDetails(action: string, repositoryName: string, pr: PullRequestData): void {
  const prNumber = pr.number ?? 'unknown';
  const prTitle = pr.title ?? 'No title';
  const authorLogin = pr.user?.login ?? 'unknown author';
  const prUrl = pr.html_url ?? 'N/A';
  const prState = pr.state ?? 'unknown';
  const mergedText = pr.merged ? 'Yes' : 'No';
  const labelsText = formatLabels(pr.labels);

  console.log(`=== Pull Request ${action} ===`);
  console.log(`Repository: ${repositoryName}`);
  console.log(`PR #${prNumber}: ${prTitle}`);
  console.log(`Author: ${authorLogin}`);
  console.log(`URL: ${prUrl}`);
  console.log(`State: ${prState}`);
  console.log(`Merged: ${mergedText}`);
  console.log(`Labels: ${labelsText}`);
}

function handlePullRequestEvent(event: string, webhookData: PullRequestsWebhookPayload): void {
  if (event !== 'pull_request' && event !== 'pull_request_review') {
    return;
  }

  const { action, pull_request: pr, repository } = webhookData;

  if (!pr || !repository) {
    console.warn(
      'Missing pull_request or repository data in GitHub webhook payload; skipping detailed PR logging.'
    );
    return;
  }

  const repositoryName = repository.full_name ?? 'unknown repository';
  logPullRequestDetails(action ?? 'unknown', repositoryName, pr);
}

export default function pullRequestsWebhook(req: Request, res: Response): void {
  try {
    const signatureHeader = req.headers['x-hub-signature-256'] as string | undefined;
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;

    if (!verifyWebhookSignature(signatureHeader, webhookSecret ?? '', req.body)) {
      sendUnauthorizedResponse(res);
      return;
    }

    if (!webhookSecret) {
      sendSecretNotConfiguredResponse(res);
      return;
    }

    const event = req.headers['x-github-event'] as string;
    logWebhookReceived('Pull Requests', event);
    logWebhookPayload(req.body);

    handlePullRequestEvent(event, req.body as PullRequestsWebhookPayload);
    sendSuccessResponse(res, event);
  } catch (error) {
    sendErrorResponse(res, error);
  }
}
