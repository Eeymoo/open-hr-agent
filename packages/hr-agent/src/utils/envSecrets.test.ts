import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';

vi.mock('node:fs', () => ({
  default: {
    readFileSync: vi.fn()
  }
}));

describe('envSecrets', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  describe('getEnvValue', () => {
    it('应该返回环境变量的值', async () => {
      process.env.TEST_KEY = 'test-value';
      const { getEnvValue } = await import('./envSecrets.js');
      expect(getEnvValue('TEST_KEY')).toBe('test-value');
    });

    it('应该在环境变量不存在时返回 undefined', async () => {
      const { getEnvValue } = await import('./envSecrets.js');
      expect(getEnvValue('NON_EXISTENT_KEY')).toBeUndefined();
    });

    it('应该从文件读取密钥', async () => {
      process.env.TEST_SECRET = 'placeholder';
      process.env.TEST_SECRET_FILE = '/run/secrets/test';
      vi.mocked(fs.readFileSync).mockReturnValue('file-secret-value');

      const { getEnvValue } = await import('./envSecrets.js');
      expect(getEnvValue('TEST_SECRET')).toBe('file-secret-value');
      expect(fs.readFileSync).toHaveBeenCalledWith('/run/secrets/test', 'utf-8');
    });
  });

  describe('getRequiredEnvValue', () => {
    it('应该返回必需的环境变量值', async () => {
      process.env.REQUIRED_KEY = 'required-value';
      const { getRequiredEnvValue } = await import('./envSecrets.js');
      expect(getRequiredEnvValue('REQUIRED_KEY')).toBe('required-value');
    });

    it('应该在缺少必需环境变量时抛出错误', async () => {
      const { getRequiredEnvValue } = await import('./envSecrets.js');
      const fn = () => getRequiredEnvValue('MISSING_REQUIRED_KEY');
      const expectedMessage =
        'Required environment variable MISSING_REQUIRED_KEY or MISSING_REQUIRED_KEY_FILE is not set';
      expect(fn).toThrow(expectedMessage);
    });
  });

  describe('getOptionalEnvValue', () => {
    it('应该返回可选环境变量的值', async () => {
      process.env.OPTIONAL_KEY = 'optional-value';
      const { getOptionalEnvValue } = await import('./envSecrets.js');
      expect(getOptionalEnvValue('OPTIONAL_KEY', 'default')).toBe('optional-value');
    });

    it('应该在可选环境变量不存在时返回默认值', async () => {
      const { getOptionalEnvValue } = await import('./envSecrets.js');
      expect(getOptionalEnvValue('MISSING_OPTIONAL_KEY', 'default-value')).toBe('default-value');
    });
  });
});
