'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import api from './api';
import { getLoginRedirect } from './productMode';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
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
  removed_features?: string[];
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
  allowedModules: string[];
  hasModule: (module: string) => boolean;
}

const PLAN_MODULES: Record<string, string[]> = {
  starter:    ['pos', 'inventory', 'sales', 'reports'],
  pro:        ['pos', 'inventory', 'sales', 'reports', 'online_storefront', 'procurement', 'hr', 'crm'],
  enterprise: ['pos', 'inventory', 'sales', 'reports', 'online_storefront', 'procurement', 'hr', 'crm', 'advanced_accounting'],
};

function getAllowedModules(tenant: Tenant | null): string[] {
  if (!tenant) return [];
  if (tenant.subscription_status === 'trial') return Object.values(PLAN_MODULES).flat();
  if (tenant.subscription_status === 'expired' || tenant.subscription_status === 'suspended') return [];
  const base = PLAN_MODULES[tenant.plan] || PLAN_MODULES.starter;
  return base.filter(m => !(tenant.removed_features || []).includes(m));
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]     = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    try {
      const storedUser   = localStorage.getItem('gems_user');
      const storedTenant = localStorage.getItem('gems_tenant');
      const storedBranch = localStorage.getItem('gems_branch');
      const token        = localStorage.getItem('gems_token');
      if (storedUser && token) {
        const parsedUser = storedUser ? JSON.parse(storedUser) : null;
        const parsedTenant = storedTenant ? JSON.parse(storedTenant) : null;
        const parsedBranch = storedBranch ? JSON.parse(storedBranch) : null;
        if (parsedUser) setUser(parsedUser);
        if (parsedTenant) setTenant(parsedTenant);
        if (parsedBranch) setBranch(parsedBranch);
      }
    } catch {
      ['gems_token','gems_user','gems_tenant','gems_branch'].forEach(k => localStorage.removeItem(k));
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    const { token, user, tenant, branch } = res.data.data;
    localStorage.setItem('gems_token', token);
    localStorage.setItem('gems_user', JSON.stringify({ ...user, permissions: user.permissions || [] }));
    if (tenant) localStorage.setItem('gems_tenant', JSON.stringify({ ...tenant, removed_features: tenant.removed_features || [] }));
    if (branch) localStorage.setItem('gems_branch', JSON.stringify(branch));
    setUser({ ...user, permissions: user.permissions || [] });
    setTenant(tenant || null);
    setBranch(branch || null);
    router.push(getLoginRedirect(user.role));
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
  const allowedModules = getAllowedModules(tenant);
  const hasModule = (module: string) => user?.role === 'platform_admin' || allowedModules.includes(module);

  return (
    <AuthContext.Provider value={{ user, tenant, branch, loading, login, logout, isRole, allowedModules, hasModule }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
