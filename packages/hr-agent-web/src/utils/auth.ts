import { encrypt, decrypt, clearEncryptionKey } from './crypto';

const SECRET_KEY = 'hra_secret';

/**
 * 设置用户密钥
 * @param secret - 密钥值
 */
export const setSecret = async (secret: string): Promise<void> => {
  const encrypted = await encrypt(secret);
  sessionStorage.setItem(SECRET_KEY, encrypted);
};

/**
 * 获取用户密钥
 * @returns 解密后的密钥，不存在则返回 null
 */
export const getSecret = async (): Promise<string | null> => {
  const encrypted = sessionStorage.getItem(SECRET_KEY);
  if (!encrypted) {
    return null;
  }
  const decrypted = await decrypt(encrypted);
  return decrypted;
};

/**
 * 清除用户密钥
 */
export const clearSecret = (): void => {
  sessionStorage.removeItem(SECRET_KEY);
  clearEncryptionKey();
};

/**
 * 检查用户是否已认证
 * @returns 是否已认证
 */
export const isAuthenticated = async (): Promise<boolean> => {
  const secret = await getSecret();
  return !!secret;
};
