import type { Issue } from './issue';
import type { PullRequest } from './pr';
import type { CodingAgent } from './ca';

export interface Task {
  id: number;
  type: string;
  status: TaskStatus;
  priority: number;
  tags: string[];
  parentTaskId?: number;
  parent?: Task;
  subTasks?: Task[];
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
  | 'completed'
  | 'creating_ca'
  | 'connecting_ca'
  | 'ai_coding'
  | 'creating_pr'
  | 'pr_submitted'
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
  completed: '已完成',
  creating_ca: '创建CA中',
  connecting_ca: '连接CA中',
  ai_coding: 'AI编码中',
  creating_pr: '创建PR中',
  pr_submitted: 'PR已提交',
  error: '错误',
  cancelled: '已取消',
  timeout: '超时'
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  planned: 'default',
  queued: 'default',
  running: 'processing',
  retrying: 'warning',
  completed: 'success',
  creating_ca: 'processing',
  connecting_ca: 'processing',
  ai_coding: 'processing',
  creating_pr: 'processing',
  pr_submitted: 'processing',
  error: 'error',
  cancelled: 'default',
  timeout: 'error'
};

export const PRIORITY_LOW = 10;
export const PRIORITY_MEDIUM = 20;
export const PRIORITY_HIGH = 30;

export const TASK_TAG_LABELS: Record<string, string> = {
  'requires:ca': '需要CA',
  'manages:ca': '管理CA',
  'agent:coding': 'AI编码',
  'agent:review': 'AI审查',
  'agent:test': 'AI测试',
  'runtime:long': '长任务',
  subtask: '附属任务'
};

export const TASK_TAG_COLORS: Record<string, string> = {
  'requires:ca': 'blue',
  'manages:ca': 'green',
  'agent:coding': 'purple',
  'agent:review': 'orange',
  'agent:test': 'cyan',
  'runtime:long': 'red',
  subtask: 'geekblue'
};

export interface ReorderTasksDto {
  taskOrders: Array<{ taskId: number; priority: number }>;
}
