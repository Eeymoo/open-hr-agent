export const DOCKER_CONFIG = {
  IMAGE: process.env.DOCKER_CA_IMAGE ?? 'ghcr.io/eeymoo/open-hr-agent-ca:main',
  PORT: process.env.DOCKER_CA_PORT ?? '4096',
  BASE_PORT: parseInt(process.env.DOCKER_BASE_PORT ?? '5000', 10),
  NETWORK: process.env.DOCKER_NETWORK ?? 'hr-network',
  SECRET: process.env.DOCKER_CA_SECRET ?? '',
  HR_NETWORK: process.env.HR_NETWORK ?? 'default'
} as const;
