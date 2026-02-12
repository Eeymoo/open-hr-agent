import { getDockerCASecret } from '../utils/secretManager.js';
import { TASK_CONFIG } from './taskConfig.js';

const MAX_PORT_NUMBER = 65536;
const DEFAULT_DOCKER_BASE_PORT = 5000;

const basePortInput = parseInt(
  process.env.DOCKER_BASE_PORT ?? String(DEFAULT_DOCKER_BASE_PORT),
  10
);
const BASE_PORT =
  Number.isFinite(basePortInput) && basePortInput > 0 && basePortInput < MAX_PORT_NUMBER
    ? basePortInput
    : DEFAULT_DOCKER_BASE_PORT;

export const DOCKER_CONFIG = {
  IMAGE: process.env.DOCKER_CA_IMAGE ?? 'ghcr.io/eeymoo/open-hr-agent-ca:main',
  PORT: process.env.DOCKER_CA_PORT ?? '4096',
  BASE_PORT,
  NETWORK: process.env.DOCKER_NETWORK ?? 'hr-network',
  SECRET: getDockerCASecret(),
  HR_NETWORK: process.env.HR_NETWORK ?? 'hr-network',
  NAME_PREFIX: TASK_CONFIG.CA_NAME_PREFIX
} as const;
