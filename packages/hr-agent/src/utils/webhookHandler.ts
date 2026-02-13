import { Webhooks } from '@octokit/webhooks';
import crypto from 'node:crypto';
import { Buffer } from 'node:buffer';
import { getPrismaClient, getCurrentTimestamp } from './database.js';
import { getGitHubWebhookSecret } from './secretManager.js';
import { getPriorityFromLabels as getPriorityFromLabelsConfig } from '../config/taskPriorities.js';
import {
  syncIssueFromWebhook,
  cancelTasksForIssue,
  completeTasksForIssue,
  reopenTasksForIssue,
  type IssueSyncData
} from '../services/issueSyncService.js';
import {
  syncPullRequestFromWebhook,
  linkPRToIssue,
  completeTasksForPR,
  completeLinkedIssue,
  extractIssueNumberFromTitle,
  type PullRequestSyncData
} from '../services/prSyncService.js';

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

interface IssueWebhookPayload {
  action?: string;
  issue?: {
    id?: number;
    number?: number;
    title?: string;
    body?: string;
    html_url?: string;
    user?: { login?: string };
    state?: 'open' | 'closed';
    labels?: { name?: string }[];
  };
  label?: {
    name?: string;
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
    state?: 'open' | 'closed';
    merged?: boolean;
    merged_at?: string | null;
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
  state: 'open' | 'closed';
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
  const state = issue.state ?? 'open';

  return {
    issueNumber,
    issueUrl,
    issueTitle,
    issueContent,
    labels,
    state
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

  const syncData: IssueSyncData = {
    issueId: issueInfo.issueNumber,
    issueUrl: issueInfo.issueUrl,
    issueTitle: issueInfo.issueTitle,
    issueContent: issueInfo.issueContent,
    state: issueInfo.state
  };

  const syncResult = await syncIssueFromWebhook(syncData);
  if (!syncResult.success) {
    console.error('Failed to sync issue:', syncResult.error);
    return;
  }

  await startTaskChain(issueInfo.issueNumber, issueInfo.labels);
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

  const syncData: IssueSyncData = {
    issueId: issueInfo.issueNumber,
    issueUrl: issueInfo.issueUrl,
    issueTitle: issueInfo.issueTitle,
    issueContent: issueInfo.issueContent,
    state: issueInfo.state
  };

  const syncResult = await syncIssueFromWebhook(syncData);
  if (!syncResult.success) {
    console.error('Failed to sync issue:', syncResult.error);
    return;
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
  const issueInfo = extractIssueInfo(data);

  if (!issueInfo) {
    console.log('Invalid issues.reopened payload: missing issue data');
    return;
  }

  console.log('=== Issues Webhook: reopened ===');
  console.log(`Issue #${issueInfo.issueNumber}: ${issueInfo.issueTitle}`);

  const syncData: IssueSyncData = {
    issueId: issueInfo.issueNumber,
    issueUrl: issueInfo.issueUrl,
    issueTitle: issueInfo.issueTitle,
    issueContent: issueInfo.issueContent,
    state: 'open'
  };

  const syncResult = await syncIssueFromWebhook(syncData);
  if (!syncResult.success) {
    console.error('Failed to sync issue:', syncResult.error);
    return;
  }

  const reopenResult = await reopenTasksForIssue(issueInfo.issueNumber);
  if (!reopenResult.success) {
    console.error('Failed to reopen tasks:', reopenResult.error);
    return;
  }

  console.log(`Issue synced and ${reopenResult.reopenedCount} tasks reopened`);
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
    console.log('Issue does not have "hra" label, skipping update');
    return;
  }

  const syncData: IssueSyncData = {
    issueId: issueInfo.issueNumber,
    issueUrl: issueInfo.issueUrl,
    issueTitle: issueInfo.issueTitle,
    issueContent: issueInfo.issueContent,
    state: issueInfo.state
  };

  const syncResult = await syncIssueFromWebhook(syncData);
  if (!syncResult.success) {
    console.error('Failed to sync issue:', syncResult.error);
    return;
  }

  console.log('Issue synced successfully');
});

webhooks.on('issues.closed', async ({ payload }) => {
  const data = payload as IssueWebhookPayload;
  const issueInfo = extractIssueInfo(data);

  if (!issueInfo) {
    console.log('Invalid issues.closed payload: missing issue data');
    return;
  }

  console.log('=== Issues Webhook: closed ===');
  console.log(`Issue #${issueInfo.issueNumber}: ${issueInfo.issueTitle}`);

  const syncData: IssueSyncData = {
    issueId: issueInfo.issueNumber,
    issueUrl: issueInfo.issueUrl,
    issueTitle: issueInfo.issueTitle,
    issueContent: issueInfo.issueContent,
    state: 'closed'
  };

  const syncResult = await syncIssueFromWebhook(syncData);
  if (!syncResult.success) {
    console.error('Failed to sync issue:', syncResult.error);
    return;
  }

  const completeResult = await completeTasksForIssue(issueInfo.issueNumber);
  if (!completeResult.success) {
    console.error('Failed to complete tasks:', completeResult.error);
    return;
  }

  console.log(`Issue synced and ${completeResult.completedCount} tasks completed`);
});

webhooks.on('issues.unlabeled', async ({ payload }) => {
  const data = payload as IssueWebhookPayload;

  if (!data.issue?.number) {
    console.log('Invalid issues.unlabeled payload: missing issue data');
    return;
  }

  const removedLabel = data.label?.name?.toLowerCase();
  if (removedLabel !== 'hra') {
    return;
  }

  console.log('=== Issues Webhook: unlabeled (hra removed) ===');
  console.log(`Issue #${data.issue.number}: ${data.issue.title}`);

  const cancelResult = await cancelTasksForIssue(data.issue.number);
  if (!cancelResult.success) {
    console.error('Failed to cancel tasks:', cancelResult.error);
    return;
  }

  console.log(`Cancelled ${cancelResult.cancelledCount} tasks for issue #${data.issue.number}`);
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

  const prNumber = data.pull_request.number ?? 0;
  const prTitle = data.pull_request.title ?? 'Untitled';
  const prHtmlUrl =
    data.pull_request.html_url ??
    `https://github.com/${data.repository.full_name}/pull/${prNumber}`;

  const syncData: PullRequestSyncData = {
    prId: prNumber,
    prTitle,
    prContent: data.pull_request.body ?? null,
    prUrl: prHtmlUrl,
    state: 'open',
    merged: false,
    headRef: data.pull_request.head?.ref,
    headSha: data.pull_request.head?.sha,
    baseRef: data.pull_request.base?.ref
  };

  const syncResult = await syncPullRequestFromWebhook(syncData);
  if (!syncResult.success) {
    console.error('Failed to sync pull request:', syncResult.error);
    return;
  }

  const issueNumber = extractIssueNumberFromTitle(prTitle);
  if (issueNumber && syncResult.pullRequest) {
    const linkResult = await linkPRToIssue(prNumber, issueNumber);
    if (linkResult.success && linkResult.linked) {
      console.log(`PR #${prNumber} linked to issue #${issueNumber}`);
    }
  }

  console.log(`PR #${prNumber} synced successfully`);
});

webhooks.on('pull_request.closed', async ({ payload }) => {
  const data = payload as PullRequestWebhookPayload;

  if (!data.pull_request?.number || !data.repository?.full_name) {
    console.log('Invalid pull_request.closed payload: missing data');
    return;
  }

  console.log('=== Pull Request Webhook: closed ===');
  console.log(`PR #${data.pull_request.number}: ${data.pull_request.title}`);
  console.log(`Merged: ${data.pull_request.merged ?? false}`);

  const prNumber = data.pull_request.number ?? 0;
  const prTitle = data.pull_request.title ?? 'Untitled';
  const prHtmlUrl =
    data.pull_request.html_url ??
    `https://github.com/${data.repository.full_name}/pull/${prNumber}`;
  const isMerged = data.pull_request.merged ?? false;

  const syncData: PullRequestSyncData = {
    prId: prNumber,
    prTitle,
    prContent: data.pull_request.body ?? null,
    prUrl: prHtmlUrl,
    state: 'closed',
    merged: isMerged,
    headRef: data.pull_request.head?.ref,
    headSha: data.pull_request.head?.sha,
    baseRef: data.pull_request.base?.ref
  };

  const syncResult = await syncPullRequestFromWebhook(syncData);
  if (!syncResult.success) {
    console.error('Failed to sync pull request:', syncResult.error);
    return;
  }

  const completeTasksResult = await completeTasksForPR(prNumber);
  if (!completeTasksResult.success) {
    console.error('Failed to complete tasks:', completeTasksResult.error);
    return;
  }
  console.log(`Completed ${completeTasksResult.completedCount} tasks for PR #${prNumber}`);

  if (isMerged) {
    const completeIssueResult = await completeLinkedIssue(prNumber);
    if (!completeIssueResult.success) {
      console.error('Failed to complete linked issue:', completeIssueResult.error);
      return;
    }
    if (completeIssueResult.issueId) {
      console.log(`Linked issue completed for PR #${prNumber}`);
    }
  }

  console.log(`PR #${prNumber} closed successfully`);
});

webhooks.on('pull_request.reopened', async ({ payload }) => {
  const data = payload as PullRequestWebhookPayload;

  if (!data.pull_request?.number || !data.repository?.full_name) {
    console.log('Invalid pull_request.reopened payload: missing data');
    return;
  }

  console.log('=== Pull Request Webhook: reopened ===');
  console.log(`PR #${data.pull_request.number}: ${data.pull_request.title}`);

  const prNumber = data.pull_request.number ?? 0;
  const prTitle = data.pull_request.title ?? 'Untitled';
  const prHtmlUrl =
    data.pull_request.html_url ??
    `https://github.com/${data.repository.full_name}/pull/${prNumber}`;

  const syncData: PullRequestSyncData = {
    prId: prNumber,
    prTitle,
    prContent: data.pull_request.body ?? null,
    prUrl: prHtmlUrl,
    state: 'open',
    merged: false,
    headRef: data.pull_request.head?.ref,
    headSha: data.pull_request.head?.sha,
    baseRef: data.pull_request.base?.ref
  };

  const syncResult = await syncPullRequestFromWebhook(syncData);
  if (!syncResult.success) {
    console.error('Failed to sync pull request:', syncResult.error);
    return;
  }

  console.log(`PR #${prNumber} reopened and synced successfully`);
});

webhooks.on('pull_request.edited', async ({ payload }) => {
  const data = payload as PullRequestWebhookPayload;

  if (!data.pull_request?.number || !data.repository?.full_name) {
    console.log('Invalid pull_request.edited payload: missing data');
    return;
  }

  console.log('=== Pull Request Webhook: edited ===');
  console.log(`PR #${data.pull_request.number}: ${data.pull_request.title}`);

  const prNumber = data.pull_request.number ?? 0;
  const prTitle = data.pull_request.title ?? 'Untitled';
  const prHtmlUrl =
    data.pull_request.html_url ??
    `https://github.com/${data.repository.full_name}/pull/${prNumber}`;

  const syncData: PullRequestSyncData = {
    prId: prNumber,
    prTitle,
    prContent: data.pull_request.body ?? null,
    prUrl: prHtmlUrl,
    state: data.pull_request.state,
    headRef: data.pull_request.head?.ref,
    headSha: data.pull_request.head?.sha,
    baseRef: data.pull_request.base?.ref
  };

  const syncResult = await syncPullRequestFromWebhook(syncData);
  if (!syncResult.success) {
    console.error('Failed to sync pull request:', syncResult.error);
    return;
  }

  const issueNumber = extractIssueNumberFromTitle(prTitle);
  if (issueNumber && syncResult.pullRequest) {
    const linkResult = await linkPRToIssue(prNumber, issueNumber);
    if (linkResult.success && linkResult.linked) {
      console.log(`PR #${prNumber} linked to issue #${issueNumber}`);
    }
  }

  console.log(`PR #${prNumber} edited and synced successfully`);
});

webhooks.on('pull_request.synchronize', async ({ payload }) => {
  const data = payload as PullRequestWebhookPayload;

  if (!data.pull_request?.number || !data.repository?.full_name) {
    console.log('Invalid pull_request.synchronize payload: missing data');
    return;
  }

  console.log('=== Pull Request Webhook: synchronize ===');
  console.log(`PR #${data.pull_request.number}: ${data.pull_request.title}`);
  console.log(`New SHA: ${data.pull_request.head?.sha}`);

  const prNumber = data.pull_request.number ?? 0;
  const prTitle = data.pull_request.title ?? 'Untitled';
  const prHtmlUrl =
    data.pull_request.html_url ??
    `https://github.com/${data.repository.full_name}/pull/${prNumber}`;

  const syncData: PullRequestSyncData = {
    prId: prNumber,
    prTitle,
    prContent: data.pull_request.body ?? null,
    prUrl: prHtmlUrl,
    state: 'open',
    headRef: data.pull_request.head?.ref,
    headSha: data.pull_request.head?.sha,
    baseRef: data.pull_request.base?.ref
  };

  const syncResult = await syncPullRequestFromWebhook(syncData);
  if (!syncResult.success) {
    console.error('Failed to sync pull request:', syncResult.error);
    return;
  }

  console.log(`PR #${prNumber} synchronized successfully`);
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
