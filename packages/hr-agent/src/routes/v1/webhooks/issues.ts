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

interface IssueData {
  number?: number;
  title?: string;
  user?: { login?: string };
  html_url?: string;
  state?: string;
  labels?: { name: string }[];
}

interface IssuesWebhookPayload {
  action?: string;
  issue?: IssueData;
  repository?: { full_name?: string };
}

function logIssueDetails(action: string, repositoryName: string, issue: IssueData): void {
  const issueNumber = issue.number ?? 'Unknown';
  const issueTitle = issue.title ?? 'Untitled';
  const authorLogin = issue.user?.login ?? 'Unknown';
  const issueUrl = issue.html_url ?? 'N/A';
  const issueState = issue.state ?? 'Unknown';
  const labelsText = formatLabels(issue.labels);

  console.log(`=== Issue ${action} ===`);
  console.log(`Repository: ${repositoryName}`);
  console.log(`Issue #${issueNumber}: ${issueTitle}`);
  console.log(`Author: ${authorLogin}`);
  console.log(`URL: ${issueUrl}`);
  console.log(`State: ${issueState}`);
  console.log(`Labels: ${labelsText}`);
}

function handleIssuesEvent(event: string, webhookData: IssuesWebhookPayload): void {
  if (event !== 'issues' && event !== 'issue_comment') {
    return;
  }

  const { action, issue, repository } = webhookData;

  if (!issue || !repository) {
    console.log(
      'Issue or repository data is missing from the webhook payload; skipping detailed logging.'
    );
    return;
  }

  const repositoryName = repository.full_name ?? 'Unknown repository';
  logIssueDetails(action ?? 'unknown', repositoryName, issue);
}

export default function issuesWebhook(req: Request, res: Response): void {
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
    logWebhookReceived('Issues', event);
    logWebhookPayload(req.body);

    handleIssuesEvent(event, req.body as IssuesWebhookPayload);
    sendSuccessResponse(res, event);
  } catch (error) {
    sendErrorResponse(res, error);
  }
}
