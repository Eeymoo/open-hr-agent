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
  tags?: string[];
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

export const PRIORITY_LOW = 10;
export const PRIORITY_MEDIUM = 20;
export const PRIORITY_HIGH = 30;

export const PRIORITY_LABELS: Record<number, string> = {
  [PRIORITY_LOW]: '低',
  [PRIORITY_MEDIUM]: '中',
  [PRIORITY_HIGH]: '高'
};

export const PRIORITY_COLORS: Record<number, string> = {
  [PRIORITY_LOW]: 'default',
  [PRIORITY_MEDIUM]: 'processing',
  [PRIORITY_HIGH]: 'error'
};

export const TASK_TAG_LABELS: Record<string, string> = {
  'requires:ca': '需要CA',
  'manages:ca': '管理CA',
  'agent:coding': 'AI编码',
  'agent:review': 'AI审查',
  'agent:test': 'AI测试',
  'runtime:long': '长任务'
};

export const TASK_TAG_COLORS: Record<string, string> = {
  'requires:ca': 'blue',
  'manages:ca': 'green',
  'agent:coding': 'purple',
  'agent:review': 'orange',
  'agent:test': 'cyan',
  'runtime:long': 'red'
};

export interface ReorderTasksDto {
  taskOrders: Array<{ taskId: number; priority: number }>;
}
