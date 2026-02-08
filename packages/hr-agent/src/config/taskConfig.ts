export const TASK_CONFIG = {
  MAX_CA_COUNT: 3,
  CA_NAME_PREFIX: process.env.HRA_CA_NAME_PREFIX ?? 'hra_',

  MONITOR_INTERVAL: 30000,

  RETRY_DELAYS: [10000, 20000, 40000],
  MAX_RETRY_COUNT: 5,

  TASK_TIMEOUT: 600000,

  LOG_DIR: process.env.TASK_LOG_DIR ?? './logs/tasks',
  LOG_LEVEL: process.env.LOG_LEVEL ?? 'info'
} as const;

export type RetryDelay = (typeof TASK_CONFIG.RETRY_DELAYS)[number];
