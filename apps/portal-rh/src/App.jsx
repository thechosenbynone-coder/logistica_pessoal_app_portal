import React, { useEffect, useState } from 'react';
import { ErrorBoundary } from './components';
import HRPortalApp from './HRPortalApp.jsx';
import LoginPage from './features/auth/LoginPage.jsx';
import { getAccessToken, clearSession } from './lib/apiClient.js';

function useAuth() {
  const [user, setUser] = useState(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp * 1000 > Date.now()) {
          const savedUser = localStorage.getItem('portal_user');
          setUser(savedUser ? JSON.parse(savedUser) : { id: payload.sub });
        }
      } catch {
        clearSession();
      }
    }
    setChecked(true);
  }, []);

  useEffect(() => {
    const onExpired = () => {
      clearSession();
      localStorage.removeItem('portal_user');
      setUser(null);
    };
    window.addEventListener('portal:session-expired', onExpired);
    return () => window.removeEventListener('portal:session-expired', onExpired);
  }, []);

  const handleLoginSuccess = (userData) => {
    localStorage.setItem('portal_user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/portal/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {}
    clearSession();
    localStorage.removeItem('portal_user');
    setUser(null);
  };

  return { user, checked, handleLoginSuccess, handleLogout };
}

export default function App() {
  const { user, checked, handleLoginSuccess, handleLogout } = useAuth();


  if (!checked) return null;

  return (
    <ErrorBoundary>
      {user ? <HRPortalApp user={user} onLogout={handleLogout} /> : <LoginPage onLoginSuccess={handleLoginSuccess} />}
    </ErrorBoundary>
  );
}
