import { Webhooks } from '@octokit/webhooks';
import crypto from 'node:crypto';
import { Buffer } from 'node:buffer';
import {
  getPrismaClient,
  getCurrentTimestamp,
  setTimestamps,
  INACTIVE_TIMESTAMP
} from './database.js';
import { getGitHubWebhookSecret } from './secretManager.js';
import { getPriorityFromLabels as getPriorityFromLabelsConfig } from '../config/taskPriorities.js';

declare global {
  var taskManager: import('../services/taskManager.js').TaskManager;
}

interface MockRequest {
  body: unknown;
  headers: Record<string, string>;
}

interface MockResponse {
  statusCode?: number;
  json: (_data: unknown) => void;
  end: () => void;
}

export function createMockRequest(
  body: unknown,
  headers: Record<string, string> = {}
): MockRequest {
  return {
    body,
    headers: {
      'content-type': 'application/json',
      ...headers
    }
  };
}

export function createMockResponse(): {
  res: MockResponse;
  getResponseData: () => { statusCode?: number; data?: unknown } | null;
  } {
  let responseData: { statusCode?: number; data?: unknown } | null = null;

  const res: MockResponse = {
    json(data: unknown) {
      responseData = { data };
    },
    end() {
      responseData = responseData ?? {};
    }
  };

  const getResponseData = (): { statusCode?: number; data?: unknown } | null => {
    return responseData;
  };

  return {
    res,
    getResponseData
  };
}

const webhookSecret = getGitHubWebhookSecret();

if (!webhookSecret && process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test') {
  throw new Error('GITHUB_WEBHOOK_SECRET must be set in production environment');
}

const webhooks = new Webhooks({
  secret: webhookSecret || 'test-secret-for-development'
});

export function getWebhooks(): Webhooks {
  return webhooks;
}

function hasHraLabel(labels: { name?: string }[] = []): boolean {
  return labels.some((l) => l.name?.toLowerCase() === 'hra');
}

export async function createIssueFromWebhook(
  issueId: number,
  issueUrl: string,
  issueTitle: string,
  issueContent?: string
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const prisma = getPrismaClient();

  try {
    const existingIssue = await prisma.issue.findUnique({
      where: { issueId }
    });

    if (existingIssue) {
      return {
        success: false,
        error: 'Issue with this issueId already exists'
      };
    }

    const issueData = setTimestamps({
      issueId,
      issueUrl,
      issueTitle,
      issueContent: issueContent ?? null,
      completedAt: INACTIVE_TIMESTAMP,
      deletedAt: INACTIVE_TIMESTAMP,
      createdAt: 0,
      updatedAt: 0
    });

    const issue = await prisma.issue.create({ data: issueData });

    return {
      success: true,
      data: issue
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

interface IssueWebhookPayload {
  action?: string;
  issue?: {
    id?: number;
    number?: number;
    title?: string;
    body?: string;
    html_url?: string;
    user?: { login?: string };
    state?: string;
    labels?: { name?: string }[];
  };
  repository?: {
    full_name?: string;
    id?: number;
  };
  sender?: {
    login?: string;
  };
}

interface IssueInfo {
  issueNumber: number;
  issueUrl: string;
  issueTitle: string;
  issueContent?: string;
  labels: { name?: string }[];
}

function extractIssueInfo(data: IssueWebhookPayload): IssueInfo | null {
  if (!data.issue?.number || !data.repository) {
    return null;
  }

  const { issue, repository } = data;
  const issueNumber = issue.number ?? 0;
  const issueUrl =
    issue.html_url ?? `https://github.com/${repository.full_name}/issues/${issueNumber}`;
  const issueTitle = issue.title ?? 'Untitled';
  const issueContent = issue.body;
  const labels = issue.labels ?? [];

  return {
    issueNumber,
    issueUrl,
    issueTitle,
    issueContent,
    labels
  };
}

function logIssueInfo(repositoryName: string, info: IssueInfo): void {
  console.log('=== Issues Webhook: opened ===');
  console.log(`Repository: ${repositoryName}`);
  console.log(`Issue #${info.issueNumber}: ${info.issueTitle}`);
  console.log(`Labels: ${info.labels.map((l) => l.name).join(', ') || 'none'}`);
}

async function handleIssuesOpened(data: IssueWebhookPayload): Promise<void> {
  const issueInfo = extractIssueInfo(data);
  if (!issueInfo || !data.repository?.full_name) {
    console.log('Invalid issues.opened payload: missing issue or repository data');
    return;
  }

  logIssueInfo(data.repository.full_name, issueInfo);

  if (!hasHraLabel(issueInfo.labels)) {
    console.log('Issue does not have "hra" label, skipping task creation');
    return;
  }

  const priority = getPriorityFromLabelsConfig(issueInfo.labels);
  console.log(`Task priority: ${priority}`);

  const issueResult = await createIssueFromWebhook(
    issueInfo.issueNumber,
    issueInfo.issueUrl,
    issueInfo.issueTitle,
    issueInfo.issueContent
  );

  if (!issueResult.success) {
    const errorMessage = String(issueResult.error ?? '');
    if (!errorMessage.includes('Issue with this issueId already exists')) {
      console.error('Failed to create issue:', issueResult.error);
      return;
    }
    console.log('Issue already exists, continuing to create task');
  }

  console.log('Issue created successfully:', issueResult.data);

  const prisma = getPrismaClient();
  const issue = await prisma.issue.findUnique({
    where: { issueId: issueInfo.issueNumber }
  });

  if (!issue) {
    console.error('Issue not found in database');
    return;
  }

  const { taskManager } = global;

  if (taskManager) {
    await taskManager.run('create_ca', { issueNumber: issueInfo.issueNumber }, priority, issue.id);
    console.log(`Task chain started for issue #${issueInfo.issueNumber} with priority ${priority}`);
  } else {
    console.error('TaskManager not initialized');
  }
}

webhooks.on('issues.opened', async ({ payload }) => {
  await handleIssuesOpened(payload as IssueWebhookPayload);
});

async function handleIssuesLabeled(payload: unknown): Promise<void> {
  const data = payload as IssueWebhookPayload;
  const issueInfo = extractIssueInfo(data);
  if (!issueInfo || !data.repository) {
    console.log('Invalid issues.labeled payload: missing issue or repository data');
    return;
  }

  const { repository } = data;

  if (!hasHraLabel(issueInfo.labels)) {
    console.log(
      `Issue #${issueInfo.issueNumber} does not have "hra" label after labeling, skipping`
    );
    return;
  }

  console.log('=== Issues Webhook: labeled with hra ===');
  console.log(`Repository: ${repository.full_name}`);
  console.log(`Issue #${issueInfo.issueNumber}: ${issueInfo.issueTitle}`);

  await createIssueForTask(issueInfo);
}

async function createIssueForTask(issueInfo: ReturnType<typeof extractIssueInfo>): Promise<void> {
  if (!issueInfo) {
    console.log('Invalid issue info, skipping');
    return;
  }

  const issueResult = await createIssueFromWebhook(
    issueInfo.issueNumber,
    issueInfo.issueUrl,
    issueInfo.issueTitle,
    issueInfo.issueContent ?? ''
  );

  if (!issueResult.success) {
    const errorMessage = String(issueResult.error ?? '');
    if (!errorMessage.includes('Issue with this issueId already exists')) {
      console.error('Failed to create issue:', issueResult.error);
      return;
    }
    console.log('Issue already exists, continuing to create CA');
  }

  await startTaskChain(issueInfo.issueNumber, issueInfo.labels);
}

async function startTaskChain(
  issueNumber: number,
  labels: { name?: string }[] | undefined
): Promise<void> {
  const prisma = getPrismaClient();
  const issue = await prisma.issue.findUnique({
    where: { issueId: issueNumber }
  });

  if (!issue) {
    console.error('Issue not found in database');
    return;
  }

  const existingTask = await prisma.task.findFirst({
    where: {
      issue: { issueId: issueNumber },
      type: 'create_ca',
      status: { in: ['queued', 'running', 'retrying', 'planned'] }
    }
  });

  if (existingTask) {
    console.log(`Task already exists for issue #${issueNumber}, skipping task creation`);
    return;
  }

  const { taskManager } = global;

  if (taskManager) {
    const priority = getPriorityFromLabelsConfig(labels);
    await taskManager.run('create_ca', { issueNumber }, priority, issue.id);
    console.log(`Task chain started for issue #${issueNumber} with priority ${priority}`);
  } else {
    console.error('TaskManager not initialized');
  }
}

webhooks.on('issues.labeled', async ({ payload }) => {
  await handleIssuesLabeled(payload);
});

webhooks.on('issues.reopened', async ({ payload }) => {
  const data = payload as IssueWebhookPayload;

  if (!data.issue?.number) {
    console.log('Invalid issues.reopened payload: missing issue data');
    return;
  }

  console.log('=== Issues Webhook: reopened ===');
  console.log(`Issue #${data.issue.number ?? 'unknown'}: ${data.issue.title}`);

  const prisma = getPrismaClient();
  const issueNumber = data.issue.number ?? 0;

  try {
    const existingTask = await prisma.task.findFirst({
      where: {
        issue: { issueId: issueNumber }
      }
    });

    if (!existingTask) {
      console.log(`No existing task for issue #${issueNumber}`);
      return;
    }

    const now = getCurrentTimestamp();
    await prisma.task.update({
      where: { id: existingTask.id },
      data: {
        status: 'planned',
        updatedAt: now
      }
    });

    console.log(`Task ${existingTask.id} status updated to planned`);
  } catch (error) {
    console.error('Failed to update task status:', error instanceof Error ? error.message : error);
  }
});

webhooks.on('issues.edited', async ({ payload }) => {
  const data = payload as IssueWebhookPayload;
  const issueInfo = extractIssueInfo(data);

  if (!issueInfo || !data.issue?.number) {
    console.log('Invalid issues.edited payload: missing issue data');
    return;
  }

  console.log('=== Issues Webhook: edited ===');
  console.log(`Issue #${data.issue.number}: ${data.issue.title}`);

  if (!hasHraLabel(issueInfo.labels)) {
    console.log('Issue does not have "hra" label, skipping CA creation');
    return;
  }

  const issueResult = await createIssueFromWebhook(
    issueInfo.issueNumber,
    issueInfo.issueUrl,
    issueInfo.issueTitle,
    issueInfo.issueContent ?? ''
  );

  if (!issueResult.success) {
    const errorMessage = String(issueResult.error ?? '');
    if (!errorMessage.includes('Issue with this issueId already exists')) {
      console.error('Failed to create issue:', issueResult.error);
      return;
    }
    console.log('Issue already exists, continuing to create CA');
  }

  console.log('CA created successfully for issue');
});

webhooks.on('issues.closed', async ({ payload }) => {
  const data = payload as IssueWebhookPayload;

  if (!data.issue?.number) {
    console.log('Invalid issues.closed payload: missing issue data');
    return;
  }

  console.log('=== Issues Webhook: closed ===');
  console.log(`Issue #${data.issue.number ?? 'unknown'}: ${data.issue.title}`);

  const prisma = getPrismaClient();
  const issueNumber = data.issue.number ?? 0;

  try {
    const existingTask = await prisma.task.findFirst({
      where: {
        issue: { issueId: issueNumber }
      }
    });

    if (!existingTask) {
      console.log(`No existing task for issue #${issueNumber}`);
      return;
    }

    const now = getCurrentTimestamp();
    await prisma.task.update({
      where: { id: existingTask.id },
      data: {
        status: 'completed',
        completedAt: now,
        updatedAt: now
      }
    });

    console.log(`Task ${existingTask.id} status updated to completed`);
  } catch (error) {
    console.error('Failed to update task status:', error instanceof Error ? error.message : error);
  }
});

webhooks.onError((error) => {
  console.error('Webhook error:', error);
});

export function verifyWebhookSignature(
  signatureHeader: string | undefined,
  secret: string,
  body: unknown
): boolean {
  if (!signatureHeader || !secret) {
    return false;
  }

  try {
    const signatureBuffer = Buffer.from(signatureHeader.replace('sha256=', ''), 'hex');
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(body));
    const expectedSignature = hmac.digest();

    return crypto.timingSafeEqual(signatureBuffer, expectedSignature);
  } catch {
    return false;
  }
}

export async function receiveWebhook(
  headers: Record<string, string>,
  body: unknown
): Promise<{ success: boolean; error?: string }> {
  try {
    const event = (headers['x-github-event'] as string) ?? '';
    const signature = headers['x-hub-signature-256'] as string | undefined;
    const id = (headers['x-github-delivery'] as string) ?? '';

    await webhooks.verifyAndReceive({
      id,
      name: event,
      payload: JSON.stringify(body),
      signature: signature ?? ''
    });

    return { success: true };
  } catch {
    return {
      success: false,
      error: 'Unknown error occurred'
    };
  }
}
