const SECRET_KEY = 'hra_secret';

export const setSecret = (secret: string): void => {
  localStorage.setItem(SECRET_KEY, secret);
};

export const getSecret = (): string | null => {
  return localStorage.getItem(SECRET_KEY);
};

export const clearSecret = (): void => {
  localStorage.removeItem(SECRET_KEY);
};

export const isAuthenticated = (): boolean => {
  return !!getSecret();
};
