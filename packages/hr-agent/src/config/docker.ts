import { getDockerCASecret } from '../utils/secretManager.js';

const basePortInput = parseInt(process.env.DOCKER_BASE_PORT ?? '5000', 10);
const BASE_PORT =
  Number.isFinite(basePortInput) && basePortInput > 0 && basePortInput < 65536
    ? basePortInput
    : 5000;

export const DOCKER_CONFIG = {
  IMAGE: process.env.DOCKER_CA_IMAGE ?? 'ghcr.io/eeymoo/open-hr-agent-ca:main',
  PORT: process.env.DOCKER_CA_PORT ?? '4096',
  BASE_PORT,
  NETWORK: process.env.DOCKER_NETWORK ?? 'hr-network',
  SECRET: getDockerCASecret(),
  HR_NETWORK: process.env.HR_NETWORK ?? 'default'
} as const;
