import { type SecretName, getEnvValue } from './envSecrets.js';

/** 全局密钥名称 */
const GLOBAL_SECRET_NAME = 'HRA_SECRET';

/**
 * 获取指定名称的密钥
 * 优先使用特定密钥，不存在则回退到全局密钥
 * @param secretName - 密钥名称
 * @returns 密钥值
 */
export function getSecret(secretName: SecretName): string {
  if (secretName === GLOBAL_SECRET_NAME) {
    return getEnvValue(GLOBAL_SECRET_NAME) ?? 'hr-agent-secret';
  }

  const specificSecret = getEnvValue(secretName);
  if (specificSecret !== undefined && specificSecret !== '') {
    return specificSecret;
  }

  return getEnvValue(GLOBAL_SECRET_NAME) ?? 'hr-agent-secret';
}

/**
 * 获取 Docker CA 密钥
 * @returns Docker CA 密钥
 */
export function getDockerCASecret(): string {
  return getSecret('DOCKER_CA_SECRET');
}

/**
 * 获取 GitHub Webhook 密钥
 * @returns GitHub Webhook 密钥
 */
export function getGitHubWebhookSecret(): string {
  return getSecret('GITHUB_WEBHOOK_SECRET');
}
