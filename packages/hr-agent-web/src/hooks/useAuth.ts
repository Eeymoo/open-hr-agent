import { useState, useEffect } from 'react';
import { getSecret, setSecret, clearSecret } from '../utils/auth';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const secret = getSecret();
    setIsAuthenticated(!!secret);
    setIsLoading(false);
  }, []);

  const login = (secret: string) => {
    setSecret(secret);
    setIsAuthenticated(true);
  };

  const logout = () => {
    clearSecret();
    setIsAuthenticated(false);
    window.location.href = '/login';
  };

  return { isAuthenticated, isLoading, login, logout };
}
