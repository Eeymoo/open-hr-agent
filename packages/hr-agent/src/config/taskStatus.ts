export const TASK_STATUS = {
  PLANNED: 'planned',
  WAITING: 'waiting',
  ERROR: 'error',
  PR_SUBMITTED: 'pr_submitted',
  QUEUED: 'queued',
  RUNNING: 'running',
  RETRYING: 'retrying',
  TIMEOUT: 'timeout',
  CANCELLED: 'cancelled'
} as const;

export const VALID_TASK_STATUSES = Object.values(TASK_STATUS);
