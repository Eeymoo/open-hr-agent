import { encrypt, decrypt, clearEncryptionKey } from './crypto';

const SECRET_KEY = 'hra_secret';

export const setSecret = async (secret: string): Promise<void> => {
  const encrypted = await encrypt(secret);
  sessionStorage.setItem(SECRET_KEY, encrypted);
};

export const getSecret = async (): Promise<string | null> => {
  const encrypted = sessionStorage.getItem(SECRET_KEY);
  if (!encrypted) {
    return null;
  }
  const decrypted = await decrypt(encrypted);
  return decrypted;
};

export const clearSecret = (): void => {
  sessionStorage.removeItem(SECRET_KEY);
  clearEncryptionKey();
};

export const isAuthenticated = async (): Promise<boolean> => {
  const secret = await getSecret();
  return !!secret;
};
