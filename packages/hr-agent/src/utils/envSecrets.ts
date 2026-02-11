import fs from 'node:fs';

/** 密钥名称类型 */
export type SecretName = `${string}_SECRET`;

/**
 * 从文件加载密钥
 * @param filePath - 文件路径
 * @returns 密钥内容
 * @throws 文件读取失败时抛出错误
 */
function loadSecretFromFile(filePath: string): string {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content.trim();
  } catch (error) {
    throw new Error(
      `Failed to read secret file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * 获取环境变量的值，支持从文件读取
 * @param key - 环境变量键
 * @returns 环境变量值，未设置则返回 undefined
 */
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

/**
 * 获取必需的环境变量值
 * @param key - 环境变量键
 * @returns 环境变量值
 * @throws 环境变量未设置时抛出错误
 */
export function getRequiredEnvValue(key: string): string {
  const value = getEnvValue(key);
  if (!value) {
    throw new Error(`Required environment variable ${key} or ${key}_FILE is not set`);
  }
  return value;
}

/**
 * 获取可选的环境变量值
 * @param key - 环境变量键
 * @param defaultValue - 默认值
 * @returns 环境变量值或默认值
 */
export function getOptionalEnvValue(key: string, defaultValue: string): string {
  const value = getEnvValue(key);
  return value ?? defaultValue;
}

/** 导出 getEnvValue 供其他模块使用 */
export { getEnvValue };
