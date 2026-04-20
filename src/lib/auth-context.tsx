import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { isLoggedIn, login as apiLogin, register as apiRegister, logout as apiLogout, getCurrentUser } from './api';

export interface AuthUser {
  token: string;
  userId?: string;
  tenantId?: string;
  username?: string;
  display_name?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username: string, displayName: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('sentient_token');
        const userId = localStorage.getItem('sentient_user_id');
        const tenantId = localStorage.getItem('sentient_tenant_id');
        const username = localStorage.getItem('sentient_username');
        const displayName = localStorage.getItem('sentient_display_name');

        if (token && isLoggedIn()) {
          setUser({
            token,
            userId: userId || undefined,
            tenantId: tenantId || undefined,
            username: username || undefined,
            display_name: displayName || undefined,
          });
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const token = await apiLogin(email, password);
    const userData = await getCurrentUser();

    localStorage.setItem('sentient_token', token);
    localStorage.setItem('sentient_user_id', userData.user_id || '');
    localStorage.setItem('sentient_tenant_id', userData.tenant_id || '');
    localStorage.setItem('sentient_username', userData.username || '');
    localStorage.setItem('sentient_display_name', userData.display_name || '');

    setUser({
      token,
      userId: userData.user_id,
      tenantId: userData.tenant_id,
      username: userData.username,
      display_name: userData.display_name,
    });
  };

  const register = async (email: string, password: string, username: string, displayName: string) => {
    await apiRegister(email, password);
    const token = await apiLogin(email, password);

    localStorage.setItem('sentient_token', token);
    localStorage.setItem('sentient_username', username);
    localStorage.setItem('sentient_display_name', displayName);

    setUser({
      token,
      username,
      display_name: displayName,
    });
  };

  const logout = () => {
    apiLogout();
    localStorage.removeItem('sentient_user_id');
    localStorage.removeItem('sentient_tenant_id');
    localStorage.removeItem('sentient_username');
    localStorage.removeItem('sentient_display_name');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
