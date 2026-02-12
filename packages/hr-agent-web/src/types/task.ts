import type { Issue } from './issue';
import type { PullRequest } from './pr';
import type { CodingAgent } from './ca';

export interface Task {
  id: number;
  type: string;
  status: TaskStatus;
  priority: number;
  tags: string[];
  issueId?: number;
  issue?: Issue;
  prId?: number;
  pullRequest?: PullRequest;
  caId?: number;
  codingAgent?: CodingAgent;
  metadata?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
  completedAt: number;
  deletedAt: number;
}

export type TaskStatus =
  | 'planned'
  | 'queued'
  | 'running'
  | 'retrying'
  | 'in_development'
  | 'development_complete'
  | 'pr_submitted'
  | 'pr_merged'
  | 'pr_comments_resolved'
  | 'error'
  | 'cancelled'
  | 'timeout';

export interface CreateTaskDto {
  type: string;
  status?: TaskStatus;
  priority?: number;
  tags?: string[];
  issueId?: number;
  prId?: number;
  caId?: number;
  metadata?: Record<string, unknown>;
}

export interface UpdateTaskDto {
  status?: TaskStatus;
  priority?: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface TaskQueryParams {
  page?: number;
  pageSize?: number;
  orderBy?: string;
  status?: TaskStatus;
  priority?: number;
  type?: string;
  issueId?: number;
  prId?: number;
  caId?: number;
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  planned: '已规划',
  queued: '排队中',
  running: '运行中',
  retrying: '重试中',
  in_development: '开发中',
  development_complete: '开发完成',
  pr_submitted: 'PR已提交',
  pr_merged: 'PR已合并',
  pr_comments_resolved: 'PR评论已解决',
  error: '错误',
  cancelled: '已取消',
  timeout: '超时'
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  planned: 'default',
  queued: 'default',
  running: 'processing',
  retrying: 'warning',
  in_development: 'processing',
  development_complete: 'success',
  pr_submitted: 'processing',
  pr_merged: 'success',
  pr_comments_resolved: 'success',
  error: 'error',
  cancelled: 'default',
  timeout: 'error'
};

export const PRIORITY_LABELS: Record<number, string> = {
  0: '低',
  50: '中',
  100: '高'
};

export const PRIORITY_COLORS: Record<number, string> = {
  0: 'default',
  50: 'processing',
  100: 'error'
};
