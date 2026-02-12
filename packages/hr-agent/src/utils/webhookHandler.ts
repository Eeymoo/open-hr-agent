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

/**
 * 模拟请求接口
 */
interface MockRequest {
  /** 请求体 */
  body: unknown;
  /** 请求头 */
  headers: Record<string, string>;
}

/**
 * 模拟响应接口
 */
interface MockResponse {
  /** 状态码 */
  statusCode?: number;
  /** JSON 响应方法 */
  json: (_data: unknown) => void;
  /** 结束响应方法 */
  end: () => void;
}

/**
 * 创建模拟请求对象
 * @param body - 请求体
 * @param headers - 请求头
 * @returns 模拟请求对象
 */
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

/**
 * 创建模拟响应对象
 * @returns 包含响应对象和响应数据获取函数的对象
 */
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

/**
 * 获取 GitHub Webhooks 实例
 * @returns Webhooks 实例
 */
export function getWebhooks(): Webhooks {
  return webhooks;
}

/**
 * 检查标签中是否包含 'hra' 标签
 * @param labels - 标签数组
 * @returns 是否包含 hra 标签
 */
function hasHraLabel(labels: { name?: string }[] = []): boolean {
  return labels.some((l) => l.name?.toLowerCase() === 'hra');
}

/**
 * 从 Webhook 创建 Issue 记录
 * @param issueId - Issue ID
 * @param issueUrl - Issue URL
 * @param issueTitle - Issue 标题
 * @param issueContent - Issue 内容
 * @returns 操作结果
 */
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

interface PullRequestWebhookPayload {
  action?: string;
  pull_request?: {
    id?: number;
    number?: number;
    title?: string;
    body?: string;
    html_url?: string;
    user?: { login?: string };
    state?: string;
    merged?: boolean;
    head?: {
      ref?: string;
      sha?: string;
    };
    base?: {
      ref?: string;
    };
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

  await createIssueForTask(issueInfo);
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

  const errorTask = await prisma.task.findFirst({
    where: {
      issue: { issueId: issueNumber },
      type: 'create_ca',
      status: 'error'
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  if (errorTask) {
    const now = getCurrentTimestamp();
    const retryDelay = 60000;
    const timeSinceError = (now - errorTask.updatedAt) * 1000;

    if (timeSinceError < retryDelay) {
      console.log(
        `Recent error task exists for issue #${issueNumber}, waiting before retry. Time since error: ${timeSinceError}ms`
      );
      return;
    }
  }

  const { taskManager } = global;

  if (taskManager) {
    const priority = getPriorityFromLabelsConfig(labels);
    await taskManager.run('create_ca', { issueNumber }, priority, issue.id, undefined);
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

webhooks.on('pull_request.opened', async ({ payload }) => {
  const data = payload as PullRequestWebhookPayload;

  if (!data.pull_request?.number || !data.repository?.full_name) {
    console.log('Invalid pull_request.opened payload: missing data');
    return;
  }

  console.log('=== Pull Request Webhook: opened ===');
  console.log(`Repository: ${data.repository.full_name}`);
  console.log(`PR #${data.pull_request.number}: ${data.pull_request.title}`);
  console.log(`Branch: ${data.pull_request.head?.ref} -> ${data.pull_request.base?.ref}`);

  try {
    const prisma = getPrismaClient();
    const prNumber = data.pull_request.number ?? 0;
    const prTitle = data.pull_request.title ?? 'Untitled';
    const prBody = data.pull_request.body ?? null;
    const prHtmlUrl =
      data.pull_request.html_url ??
      `https://github.com/${data.repository?.full_name}/pull/${prNumber}`;
    const issueNumber = extractIssueNumberFromTitle(prTitle);

    const now = getCurrentTimestamp();

    const existingPR = await prisma.pullRequest.findUnique({
      where: { prId: prNumber }
    });

    if (existingPR) {
      console.log(`PR #${prNumber} already exists, updating...`);
      await prisma.pullRequest.update({
        where: { id: existingPR.id },
        data: {
          prTitle,
          prContent: prBody,
          prUrl: prHtmlUrl,
          updatedAt: now
        }
      });
      console.log(`PR #${prNumber} updated successfully`);
      return;
    }

    let issueId: number | undefined;
    if (issueNumber) {
      const issue = await prisma.issue.findUnique({
        where: { issueId: issueNumber }
      });
      issueId = issue?.id;
    }

    const pr = await prisma.pullRequest.create({
      data: {
        prId: prNumber,
        prTitle,
        prContent: prBody,
        prUrl: prHtmlUrl,
        issueId: issueId ?? null,
        completedAt: INACTIVE_TIMESTAMP,
        deletedAt: INACTIVE_TIMESTAMP,
        createdAt: now,
        updatedAt: now
      }
    });

    if (issueId) {
      const existingIssuePr = await prisma.issuePR.findUnique({
        where: {
          issueId_prId: {
            issueId,
            prId: pr.id
          }
        }
      });

      if (!existingIssuePr) {
        await prisma.issuePR.create({
          data: {
            issueId,
            prId: pr.id
          }
        });
        console.log(`IssuePR relation created for issue ${issueId} and PR ${pr.id}`);
      }
    }

    console.log(`PR #${prNumber} created successfully`);
  } catch (error) {
    console.error(
      'Failed to process pull_request.opened:',
      error instanceof Error ? error.message : error
    );
  }
});

webhooks.on('pull_request.closed', async ({ payload }) => {
  const data = payload as PullRequestWebhookPayload;

  if (!data.pull_request?.number) {
    console.log('Invalid pull_request.closed payload: missing data');
    return;
  }

  console.log('=== Pull Request Webhook: closed ===');
  console.log(`PR #${data.pull_request.number}: ${data.pull_request.title}`);
  console.log(`Merged: ${data.pull_request.merged ?? false}`);

  try {
    const prisma = getPrismaClient();
    const prNumber = data.pull_request.number ?? 0;
    const isMerged = data.pull_request.merged ?? false;

    const pr = await prisma.pullRequest.findUnique({
      where: { prId: prNumber },
      include: { tasks: true }
    });

    if (!pr) {
      console.log(`PR #${prNumber} not found in database`);
      return;
    }

    const now = getCurrentTimestamp();

    if (isMerged) {
      await prisma.pullRequest.update({
        where: { id: pr.id },
        data: {
          completedAt: now,
          updatedAt: now
        }
      });
      console.log(`PR #${prNumber} marked as merged`);

      if (pr.issueId) {
        await prisma.issue.update({
          where: { id: pr.issueId },
          data: {
            completedAt: now,
            updatedAt: now
          }
        });
        console.log(`Issue #${pr.issueId} marked as completed`);
      }
    }

    for (const task of pr.tasks) {
      await prisma.task.update({
        where: { id: task.id },
        data: {
          status: 'completed',
          completedAt: now,
          updatedAt: now
        }
      });
    }

    console.log(`Updated ${pr.tasks.length} tasks for PR #${prNumber}`);
  } catch (error) {
    console.error(
      'Failed to process pull_request.closed:',
      error instanceof Error ? error.message : error
    );
  }
});

function extractIssueNumberFromTitle(title: string): number | null {
  const match = title.match(/#(\d+)/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
}

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

    if (!event) {
      return {
        success: false,
        error: 'Missing X-GitHub-Event header'
      };
    }

    if (!id) {
      return {
        success: false,
        error: 'Missing X-GitHub-Delivery header'
      };
    }

    await webhooks.verifyAndReceive({
      id,
      name: event,
      payload: JSON.stringify(body),
      signature: signature ?? ''
    });

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      success: false,
      error: errorMessage
    };
  }
}
