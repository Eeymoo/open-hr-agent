export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
export const CA_BASE_URL = import.meta.env.VITE_CA_BASE_URL || 'http://localhost:4096';
export const POLLING_INTERVAL = Number(import.meta.env.VITE_POLLING_INTERVAL) || 60000;

export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  TASKS: '/tasks',
  TASK_DETAIL: '/tasks/:id'
} as const;

export const TASK_COLUMNS = [
  'ID',
  '类型',
  '状态',
  '优先级',
  'Issue',
  'PR',
  'CA',
  '创建时间',
  '更新时间'
] as const;

export const KANBAN_COLUMNS = {
  QUEUED: 'queued',
  RUNNING: 'running',
  COMPLETED: 'pr_merged',
  ERROR: 'error',
  CANCELLED: 'cancelled',
  TIMEOUT: 'timeout'
} as const;

export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;
