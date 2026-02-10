import { useState, useEffect } from 'react';
import { getSecret, setSecret, clearSecret } from '../utils/auth';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const secret = await getSecret();
      setIsAuthenticated(!!secret);
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (secret: string) => {
    await setSecret(secret);
    setIsAuthenticated(true);
  };

  const logout = () => {
    clearSecret();
    setIsAuthenticated(false);
    window.location.href = '/login';
  };

  return { isAuthenticated, isLoading, login, logout };
}
