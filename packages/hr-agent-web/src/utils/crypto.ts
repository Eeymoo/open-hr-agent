const ENCRYPTION_KEY_NAME = 'hra_encryption_key';
const AES_GCM_IV_LENGTH = 12;

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

async function generateAndStoreKey(): Promise<CryptoKey> {
  const key = await generateKey();
  const exportedKey = await window.crypto.subtle.exportKey('jwk', key);
  sessionStorage.setItem(ENCRYPTION_KEY_NAME, JSON.stringify(exportedKey));
  return key;
}

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

export function clearEncryptionKey(): void {
  sessionStorage.removeItem(ENCRYPTION_KEY_NAME);
}
