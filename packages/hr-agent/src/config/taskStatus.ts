export const TASK_STATUS = {
  PLANNED: 'planned',
  WAITING: 'waiting',
  ERROR: 'error',
  PR_SUBMITTED: 'pr_submitted',
  QUEUED: 'queued',
  RUNNING: 'running',
  RETRYING: 'retrying',
  TIMEOUT: 'timeout',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  CREATING_CA: 'creating_ca',
  CONNECTING_CA: 'connecting_ca',
  AI_CODING: 'ai_coding',
  CREATING_PR: 'creating_pr'
} as const;

export const VALID_TASK_STATUSES = Object.values(TASK_STATUS);
