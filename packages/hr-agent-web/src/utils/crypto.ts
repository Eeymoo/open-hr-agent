const ENCRYPTION_KEY_NAME = 'hra_encryption_key';
const AES_GCM_IV_LENGTH = 12;

/**
 * 生成 AES-GCM 加密密钥
 * @returns 加密密钥
 */
function generateKey(): Promise<CryptoKey> {
  return window.crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256
    },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * 获取或生成加密密钥
 * @returns 加密密钥
 */
async function getEncryptionKey(): Promise<CryptoKey> {
  const storedKey = sessionStorage.getItem(ENCRYPTION_KEY_NAME);

  if (storedKey) {
    try {
      const keyData = JSON.parse(storedKey);
      return window.crypto.subtle.importKey(
        'jwk',
        keyData,
        {
          name: 'AES-GCM'
        },
        true,
        ['encrypt', 'decrypt']
      );
    } catch {
      return generateAndStoreKey();
    }
  }

  return generateAndStoreKey();
}

/**
 * 生成并存储加密密钥
 * @returns 加密密钥
 */
async function generateAndStoreKey(): Promise<CryptoKey> {
  const key = await generateKey();
  const exportedKey = await window.crypto.subtle.exportKey('jwk', key);
  sessionStorage.setItem(ENCRYPTION_KEY_NAME, JSON.stringify(exportedKey));
  return key;
}

/**
 * 使用 AES-GCM 加密数据
 * @param data - 要加密的字符串
 * @returns Base64 编码的加密数据（格式：iv:encryptedData）
 */
export async function encrypt(data: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    const iv = window.crypto.getRandomValues(new Uint8Array(AES_GCM_IV_LENGTH));
    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv
      },
      key,
      new TextEncoder().encode(data)
    );

    const ivBase64 = btoa(String.fromCharCode(...iv));
    const encryptedBase64 = btoa(String.fromCharCode(...new Uint8Array(encrypted)));

    return `${ivBase64}:${encryptedBase64}`;
  } catch {
    return data;
  }
}

/**
 * 使用 AES-GCM 解密数据
 * @param data - Base64 编码的加密数据（格式：iv:encryptedData）
 * @returns 解密后的字符串，失败则返回 null
 */
export async function decrypt(data: string): Promise<string | null> {
  try {
    const key = await getEncryptionKey();
    const [ivBase64, encryptedBase64] = data.split(':');

    const iv = new Uint8Array(atob(ivBase64).split('').map((c) => c.charCodeAt(0)));
    const encrypted = new Uint8Array(atob(encryptedBase64).split('').map((c) => c.charCodeAt(0)));

    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv
      },
      key,
      encrypted
    );

    return new TextDecoder().decode(decrypted);
  } catch {
    return null;
  }
}

/**
 * 清除存储的加密密钥
 */
export function clearEncryptionKey(): void {
  sessionStorage.removeItem(ENCRYPTION_KEY_NAME);
}
