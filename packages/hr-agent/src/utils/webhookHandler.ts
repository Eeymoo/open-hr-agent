import { Webhooks } from '@octokit/webhooks';
import crypto from 'node:crypto';
import { Buffer } from 'node:buffer';
import type { Prisma } from '@prisma/client';
import { getPrismaClient, getCurrentTimestamp, setTimestamps } from './database.js';
import { getGitHubWebhookSecret } from './secretManager.js';

interface MockRequest {
  body: unknown;
  headers: Record<string, string>;
}

interface MockResponse {
  statusCode?: number;
  // eslint-disable-next-line no-unused-vars
  json: (data: unknown) => void;
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

  return {
    res,
    getResponseData() {
      return responseData;
    }
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

function getPriorityFromLabels(labels: { name?: string }[] = []): number {
  const labelNames = labels.map((l) => l.name?.toLowerCase()).filter(Boolean);

  if (labelNames.includes('high')) {
    return 3;
  }
  if (labelNames.includes('medium')) {
    return 2;
  }
  if (labelNames.includes('low')) {
    return 1;
  }

  return 0;
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
      completedAt: -2,
      deletedAt: -2,
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

export async function createTaskFromIssue(
  issueId: number,
  labels: { name?: string }[] = [],
  metadata?: Record<string, unknown>
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const prisma = getPrismaClient();

  try {
    const issue = await prisma.issue.findUnique({
      where: { issueId }
    });

    if (!issue) {
      return {
        success: false,
        error: 'Issue not found'
      };
    }

    const now = getCurrentTimestamp();
    const priority = getPriorityFromLabels(labels);

    const taskData: Prisma.TaskCreateInput = {
      type: 'issue_processing',
      status: 'planned',
      priority,
      issue: { connect: { id: issue.id } },
      completedAt: -2,
      deletedAt: -2,
      createdAt: now,
      updatedAt: now
    };

    if (metadata !== undefined) {
      taskData.metadata = metadata as Prisma.InputJsonValue;
    }

    const task = await prisma.task.create({ data: taskData });

    return {
      success: true,
      data: task
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

webhooks.on('issues.opened', async ({ payload }) => {
  const data = payload as IssueWebhookPayload;

  if (!data.issue?.number || !data.repository) {
    console.log('Invalid issues.opened payload: missing issue or repository data');
    return;
  }

  const { issue, repository } = data;
  const issueNumber = issue.number ?? 0;
  const issueUrl =
    issue.html_url ?? `https://github.com/${repository.full_name}/issues/${issueNumber}`;
  const issueTitle = issue.title ?? 'Untitled';
  const issueContent = issue.body;
  const labels = issue.labels ?? [];

  console.log('=== Issues Webhook: opened ===');
  console.log(`Repository: ${repository.full_name}`);
  console.log(`Issue #${issueNumber}: ${issueTitle}`);
  console.log(`Labels: ${labels.map((l) => l.name).join(', ') || 'none'}`);

  if (!hasHraLabel(labels)) {
    console.log('Issue does not have "hra" label, skipping task creation');
    return;
  }

  const priority = getPriorityFromLabels(labels);
  console.log(`Task priority: ${priority}`);

  const issueResult = await createIssueFromWebhook(issueNumber, issueUrl, issueTitle, issueContent);

  if (!issueResult.success) {
    const errorMessage = String(issueResult.error ?? '');
    if (!errorMessage.includes('Issue with this issueId already exists')) {
      console.error('Failed to create issue:', issueResult.error);
      return;
    }
    console.log('Issue already exists, continuing to create task');
  }

  console.log('Issue created successfully:', issueResult.data);

  const taskResult = await createTaskFromIssue(issueNumber, labels, {
    repository: repository.full_name,
    sender: data.sender?.login,
    action: data.action
  });

  if (!taskResult.success) {
    console.error('Failed to create task:', taskResult.error);
    return;
  }

  console.log('Task created successfully:', taskResult.data);
});

webhooks.on('issues.labeled', async ({ payload }) => {
  const data = payload as IssueWebhookPayload;

  if (!data.issue?.number || !data.repository) {
    console.log('Invalid issues.labeled payload: missing issue or repository data');
    return;
  }

  const { issue, repository } = data;
  const labels = issue.labels ?? [];

  if (!hasHraLabel(labels)) {
    console.log(
      `Issue #${issue.number ?? 'unknown'} does not have "hra" label after labeling, skipping`
    );
    return;
  }

  const prisma = getPrismaClient();
  const existingTask = await prisma.task.findFirst({
    where: {
      issue: { issueId: issue.number }
    }
  });

  if (existingTask) {
    console.log(`Task already exists for issue #${issue.number}, skipping creation`);
    return;
  }

  console.log('=== Issues Webhook: labeled with hra ===');
  console.log(`Repository: ${repository.full_name}`);
  console.log(`Issue #${issue.number ?? 'unknown'}: ${issue.title}`);

  // Ensure the Issue record exists before creating the Task
  const issueNumber = issue.number ?? 0;
  const issueUrl = issue.html_url ?? '';
  const issueTitle = issue.title ?? 'Untitled';
  const issueContent = issue.body ?? '';
  const issueResult = await createIssueFromWebhook(issueNumber, issueUrl, issueTitle, issueContent);

  if (!issueResult.success) {
    const errorMessage = String(issueResult.error ?? '');
    if (!errorMessage.includes('Issue with this issueId already exists')) {
      console.error('Failed to create issue:', issueResult.error);
      return;
    }
    console.log('Issue already exists, continuing to create task');
  }

  const taskResult = await createTaskFromIssue(issue.number ?? 0, labels, {
    repository: repository.full_name,
    sender: data.sender?.login,
    action: data.action
  });

  if (!taskResult.success) {
    console.error('Failed to create task:', taskResult.error);
    return;
  }

  console.log('Task created successfully:', taskResult.data);
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
