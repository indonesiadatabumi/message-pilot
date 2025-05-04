import { useState, useEffect } from 'react';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null); // Start as null (loading)

  useEffect(() => {
    // This effect runs only on the client side
    const checkAuth = () => {
      const token = localStorage.getItem('authToken');
      setIsAuthenticated(!!token);
    };

    checkAuth();

    // Optional: Listen for storage changes to update auth state across tabs
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'authToken') {
        checkAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return { isAuthenticated };
}
