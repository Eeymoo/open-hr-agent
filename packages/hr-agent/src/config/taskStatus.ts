export const TASK_STATUS = {
  PLANNED: 'planned',
  WAITING: 'waiting',
  IN_DEVELOPMENT: 'in_development',
  DEVELOPMENT_COMPLETE: 'development_complete',
  ERROR: 'error',
  PR_SUBMITTED: 'pr_submitted',
  PR_MERGED: 'pr_merged',
  PR_COMMENTS_RESOLVED: 'pr_comments_resolved'
} as const;

export const VALID_TASK_STATUSES = Object.values(TASK_STATUS);
