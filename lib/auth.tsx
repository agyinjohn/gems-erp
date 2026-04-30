'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import api from './api';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  tenant_id: string | null;
  branch_id: string | null;
  is_active: boolean;
}

interface Tenant {
  id: string;
  business_name: string;
  slug: string;
  plan: string;
  subscription_status: string;
  subscription_expires_at: string;
}

interface Branch {
  id: string;
  name: string;
  slug: string;
}

interface AuthContextType {
  user: User | null;
  tenant: Tenant | null;
  branch: Branch | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isRole: (...roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]     = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedUser   = localStorage.getItem('gems_user');
    const storedTenant = localStorage.getItem('gems_tenant');
    const storedBranch = localStorage.getItem('gems_branch');
    const token        = localStorage.getItem('gems_token');
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
      if (storedTenant) setTenant(JSON.parse(storedTenant));
      if (storedBranch) setBranch(JSON.parse(storedBranch));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    const { token, user, tenant, branch } = res.data.data;
    localStorage.setItem('gems_token', token);
    localStorage.setItem('gems_user', JSON.stringify(user));
    if (tenant) localStorage.setItem('gems_tenant', JSON.stringify(tenant));
    if (branch) localStorage.setItem('gems_branch', JSON.stringify(branch));
    setUser(user);
    setTenant(tenant || null);
    setBranch(branch || null);
    router.push(user.role === 'platform_admin' ? '/platform' : '/dashboard');
  };

  const logout = () => {
    localStorage.removeItem('gems_token');
    localStorage.removeItem('gems_user');
    localStorage.removeItem('gems_tenant');
    localStorage.removeItem('gems_branch');
    setUser(null);
    setTenant(null);
    setBranch(null);
    router.push('/login');
  };

  const isRole = (...roles: string[]) => !!user && roles.includes(user.role);

  return (
    <AuthContext.Provider value={{ user, tenant, branch, loading, login, logout, isRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
