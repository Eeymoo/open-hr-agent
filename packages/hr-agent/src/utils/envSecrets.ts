import fs from 'node:fs';

export type SecretName = `${string}_SECRET`;

function loadSecretFromFile(filePath: string): string {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content.trim();
  } catch (error) {
    throw new Error(`Failed to read secret file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function getEnvValue(key: string): string | undefined {
  const envValue = process.env[key];

  if (!envValue) {
    return undefined;
  }

  const fileKey = `${key}_FILE`;
  const filePath = process.env[fileKey];

  if (filePath) {
    return loadSecretFromFile(filePath);
  }

  return envValue;
}

export function getRequiredEnvValue(key: string): string {
  const value = getEnvValue(key);
  if (!value) {
    throw new Error(`Required environment variable ${key} or ${key}_FILE is not set`);
  }
  return value;
}

export function getOptionalEnvValue(key: string, defaultValue: string): string {
  const value = getEnvValue(key);
  return value ?? defaultValue;
}

export { getEnvValue };
