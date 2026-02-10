import { type SecretName, getEnvValue } from './envSecrets.js';

const GLOBAL_SECRET_NAME = 'HRA_SECRET';

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

export function getDockerCASecret(): string {
  return getSecret('DOCKER_CA_SECRET');
}

export function getGitHubWebhookSecret(): string {
  return getSecret('GITHUB_WEBHOOK_SECRET');
}
