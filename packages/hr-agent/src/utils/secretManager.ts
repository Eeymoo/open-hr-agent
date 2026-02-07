export type SecretName = `${string}_SECRET`;

const GLOBAL_SECRET_NAME = 'HRA_SECRET';

export function getSecret(secretName: SecretName): string {
  if (secretName === GLOBAL_SECRET_NAME) {
    return process.env[GLOBAL_SECRET_NAME] ?? '';
  }

  const specificSecret = process.env[secretName];
  if (specificSecret !== undefined && specificSecret !== '') {
    return specificSecret;
  }

  return process.env[GLOBAL_SECRET_NAME] ?? '';
}

export function getDockerCASecret(): string {
  return getSecret('DOCKER_CA_SECRET');
}

export function getGitHubWebhookSecret(): string {
  return getSecret('GITHUB_WEBHOOK_SECRET');
}
