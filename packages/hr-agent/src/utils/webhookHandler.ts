import { Webhooks } from '@octokit/webhooks';
import crypto from 'node:crypto';
import { Buffer } from 'node:buffer';
import type { Prisma } from '@prisma/client';
import {
  getPrismaClient,
  getCurrentTimestamp,
  setTimestamps,
  INACTIVE_TIMESTAMP
} from './database.js';
import { getGitHubWebhookSecret } from './secretManager.js';
import { createContainer } from './docker/createContainer.js';
import { getContainerByName } from './docker/getContainer.js';
import { DOCKER_CONFIG } from '../config/docker.js';
import { createOpencodeClient } from '@opencode-ai/sdk';

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

const PRIORITY = {
  NONE: 0,
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3
} as const;

function getPriorityFromLabels(labels: { name?: string }[] = []): number {
  const labelNames = labels.map((l) => l.name?.toLowerCase()).filter(Boolean);

  if (labelNames.includes('high')) {
    return PRIORITY.HIGH;
  }
  if (labelNames.includes('medium')) {
    return PRIORITY.MEDIUM;
  }
  if (labelNames.includes('low')) {
    return PRIORITY.LOW;
  }

  return PRIORITY.NONE;
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
      completedAt: INACTIVE_TIMESTAMP,
      deletedAt: INACTIVE_TIMESTAMP,
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

  const priority = getPriorityFromLabels(issueInfo.labels);
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

  if (await caExistsForIssue(issueInfo.issueNumber)) {
    console.log('CA already exists for issue, skipping CA creation');
    return;
  }

  const caResult = await createCAForIssue(issueInfo.issueNumber, {
    repository: data.repository.full_name,
    sender: data.sender?.login,
    action: data.action
  });

  if (!caResult.success) {
    console.error('Failed to create CA for issue:', caResult.error);
    return;
  }

  console.log('CA created successfully for issue:', caResult.data);
}

async function handleIssuesLabeled(data: IssueWebhookPayload): Promise<void> {
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

  if (await caExistsForIssue(issueInfo.issueNumber)) {
    console.log('CA already exists for issue, skipping CA creation');
    return;
  }

  const caResult = await createCAForIssue(issueInfo.issueNumber, {
    repository: repository.full_name,
    sender: data.sender?.login,
    action: data.action
  });

  if (!caResult.success) {
    console.error('Failed to create CA for issue:', caResult.error);
    return;
  }

  console.log('CA created successfully for issue:', caResult.data);
}

webhooks.on('issues.opened', async ({ payload }) => {
  await handleIssuesOpened(payload as IssueWebhookPayload);
});

webhooks.on('issues.labeled', async ({ payload }) => {
  await handleIssuesLabeled(payload as IssueWebhookPayload);
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

  if (await caExistsForIssue(issueInfo.issueNumber)) {
    console.log('CA already exists for issue, skipping CA creation');
    return;
  }

  const caResult = await createCAForIssue(issueInfo.issueNumber, {
    repository: data.repository?.full_name,
    sender: data.sender?.login,
    action: data.action
  });

  if (!caResult.success) {
    console.error('Failed to create CA for issue:', caResult.error);
    return;
  }

  console.log('CA created successfully for issue:', caResult.data);
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

async function connectToCAAndSendIdentityMessage(containerName: string): Promise<void> {
  try {
    createOpencodeClient({
      baseUrl: `http://${containerName}:${DOCKER_CONFIG.PORT}`
    });

    console.log(`Connecting to CA at http://${containerName}:${DOCKER_CONFIG.PORT}`);
    console.log('Client created successfully');
    console.log('Sent "你是谁" message to CA (Note: Full session flow not implemented yet)');
  } catch (error) {
    console.error('Failed to connect to CA or send message:', error);
  }
}

async function caExistsForIssue(issueNumber: number): Promise<boolean> {
  const prisma = getPrismaClient();
  const existingTask = await prisma.task.findFirst({
    where: {
      issue: { issueId: issueNumber },
      caId: { not: null }
    },
    include: {
      codingAgent: true
    }
  });

  if (existingTask && existingTask.codingAgent) {
    console.log(
      `CA already exists for issue #${issueNumber}, CA ID: ${existingTask.codingAgent.id}`
    );
    return true;
  }

  return false;
}

async function createCAForIssue(
  issueNumber: number,
  metadata: Record<string, unknown>
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const prisma = getPrismaClient();

  try {
    const containerName = `${DOCKER_CONFIG.NAME_PREFIX}${issueNumber}`;
    const repoUrl = metadata.repository
      ? `https://github.com/${String(metadata.repository)}.git`
      : undefined;

    console.log('=== Checking if CA container already exists ===');
    const existingContainer = await getContainerByName(containerName);

    if (existingContainer) {
      console.log(`CA container already exists: ${existingContainer.id}`);

      const existingCA = await prisma.codingAgent.findFirst({
        where: {
          caName: containerName,
          deletedAt: INACTIVE_TIMESTAMP
        }
      });

      if (existingCA) {
        console.log(`CA record already exists in database: ${existingCA.id}`);
        return {
          success: false,
          error: 'CA already exists for this issue'
        };
      }

      const caData = setTimestamps({
        caName: containerName,
        containerId: existingContainer.id,
        status: 'running',
        dockerConfig: {
          image: DOCKER_CONFIG.IMAGE,
          network: DOCKER_CONFIG.NETWORK
        },
        metadata: repoUrl ? { repoUrl } : undefined,
        completedAt: INACTIVE_TIMESTAMP,
        deletedAt: INACTIVE_TIMESTAMP,
        createdAt: 0,
        updatedAt: 0
      });

      const caRecord = await prisma.codingAgent.create({ data: caData });
      console.log(`CA record created in database: ${caRecord.id}`);

      return {
        success: true,
        data: caRecord
      };
    }

    console.log('No existing CA container, creating new one...');
    const containerId = await createContainer(containerName, repoUrl);

    const now = getCurrentTimestamp();
    const caData = setTimestamps({
      caName: containerName,
      containerId,
      status: 'running',
      dockerConfig: {
        image: DOCKER_CONFIG.IMAGE,
        network: DOCKER_CONFIG.NETWORK
      },
      metadata: repoUrl ? { repoUrl } : undefined,
      completedAt: INACTIVE_TIMESTAMP,
      deletedAt: INACTIVE_TIMESTAMP,
      createdAt: 0,
      updatedAt: 0
    });

    const caRecord = await prisma.codingAgent.create({ data: caData });
    console.log(`CA record created in database: ${caRecord.id}`);

    const issue = await prisma.issue.findUnique({
      where: { issueId: issueNumber }
    });

    if (!issue) {
      console.error(`Issue #${issueNumber} not found in database`);
      return {
        success: false,
        error: 'Issue not found'
      };
    }

    const taskData: Prisma.TaskCreateInput = {
      type: 'issue_processing',
      status: 'in_progress',
      priority: 2,
      issue: { connect: { id: issue.id } },
      codingAgent: { connect: { id: caRecord.id } },
      metadata: metadata as Prisma.InputJsonValue,
      completedAt: INACTIVE_TIMESTAMP,
      deletedAt: INACTIVE_TIMESTAMP,
      createdAt: now,
      updatedAt: now
    };

    const task = await prisma.task.create({ data: taskData });
    console.log(`Task created and linked to CA: ${task.id}`);

    await connectToCAAndSendIdentityMessage(containerName);

    return {
      success: true,
      data: { ca: caRecord, task }
    };
  } catch (error) {
    console.error('Failed to create CA for issue:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export { caExistsForIssue, createCAForIssue };
