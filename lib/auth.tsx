'use client';
import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import api, { apiCache } from './api';
import { getLoginRedirect } from './productMode';
import type { CatalogMix } from './counter';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  /** Whether sign-in asks for a code from an authenticator app. */
  twofa_enabled?: boolean;
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
  /** What the catalogue holds, which decides what the counter is called. */
  sells?: CatalogMix;
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
  /** Resolves with a challenge when a second step is needed; otherwise the user is signed in. */
  login: (email: string, password: string) => Promise<{ twoFactorToken?: string }>;
  /** Re-read the signed-in user from the server (role, permissions, security settings). */
  refreshUser: (force?: boolean) => Promise<void>;
  /** Second step of sign-in: an authenticator code, or one of the saved recovery codes. */
  verifyTwoFactor: (challengeToken: string, entry: { code?: string; recovery_code?: string }) => Promise<void>;
  logout: () => void;
  isRole: (...roles: string[]) => boolean;
  allowedModules: string[];
  hasModule: (module: string) => boolean;
  // ── Branch scoping ──
  // Org-level users (no branch_id) can switch/view-all/filter by branch.
  // Branch-level users are pinned to their own branch (server-enforced).
  isOrgLevel: boolean;
  branches: Branch[];
  activeBranchId: string;              // '' = all branches
  setActiveBranch: (id: string) => void;
}

const PLAN_MODULES: Record<string, string[]> = {
  starter:    ['pos', 'inventory', 'sales', 'reports'],
  pro:        ['pos', 'inventory', 'sales', 'reports', 'online_storefront', 'procurement', 'hr', 'crm', 'projects'],
  enterprise: ['pos', 'inventory', 'sales', 'reports', 'online_storefront', 'procurement', 'hr', 'crm', 'advanced_accounting', 'projects'],
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
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeBranchId, setActiveBranchId] = useState('');
  const router = useRouter();

  // An org-level user is one not bound to a branch (branch_id === null).
  const isOrgLevel = !!user && !user.branch_id;

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
        setActiveBranchId(localStorage.getItem('gems_active_branch') || '');
      }
    } catch {
      ['gems_token','gems_user','gems_tenant','gems_branch','gems_active_branch'].forEach(k => localStorage.removeItem(k));
    } finally {
      setLoading(false);
    }
  }, []);

  // Load the tenant's branches once, but only for org-level users — they are
  // the only ones who can switch. Branch-level users are pinned server-side.
  useEffect(() => {
    if (!isOrgLevel) { setBranches([]); return; }
    api.get('/branches')
      .then((res) => setBranches((res.data.data || []).map((b: any) => ({ id: b._id || b.id, name: b.name, slug: b.slug }))))
      .catch(() => setBranches([]));
  }, [isOrgLevel]);

  // Role, permissions and branch can be changed by an administrator while this
  // person is signed in. Re-read them from the server when the app opens and
  // when the tab regains focus, so a change takes effect without logging out.
  const hasUser = !!user;
  const lastRefresh = useRef(0);
  const refreshUser = useCallback(async (force = false) => {
    if (!force && Date.now() - lastRefresh.current < 30_000) return;
    lastRefresh.current = Date.now();
    try {
      const res = await api.get('/auth/me');
      const { user: fresh, tenant: freshTenant, branch: freshBranch } = res.data.data || {};
      if (!fresh) return;
      const next = { ...fresh, id: fresh.id || fresh._id, permissions: fresh.permissions || [] };
      localStorage.setItem('gems_user', JSON.stringify(next));
      setUser(next);
      if (freshTenant) {
        const t = { ...freshTenant, removed_features: freshTenant.removed_features || [] };
        localStorage.setItem('gems_tenant', JSON.stringify(t));
        setTenant(t);
      }
      if (freshBranch) localStorage.setItem('gems_branch', JSON.stringify(freshBranch));
      else localStorage.removeItem('gems_branch');
      setBranch(freshBranch || null);
    } catch { /* offline or signed out — the 401 handler deals with the latter */ }
  }, []);
  useEffect(() => {
    if (!hasUser) return;
    refreshUser();
    const onFocus = () => { refreshUser(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [hasUser, refreshUser]);

  // Switch active branch: persist, clear cached data (keyed on plain URLs),
  // and reload so every page refetches with the new scope.
  const setActiveBranch = (id: string) => {
    if (id) localStorage.setItem('gems_active_branch', id);
    else localStorage.removeItem('gems_active_branch');
    setActiveBranchId(id);
    apiCache.clear();
    if (typeof window !== 'undefined') window.location.reload();
  };

  const completeLogin = (data: any) => {
    const { token, user, tenant, branch } = data;
    localStorage.setItem('gems_token', token);
    localStorage.setItem('gems_user', JSON.stringify({ ...user, permissions: user.permissions || [] }));
    if (tenant) localStorage.setItem('gems_tenant', JSON.stringify({ ...tenant, removed_features: tenant.removed_features || [] }));
    if (branch) localStorage.setItem('gems_branch', JSON.stringify(branch));
    setUser({ ...user, permissions: user.permissions || [] });
    setTenant(tenant || null);
    setBranch(branch || null);
    router.push(getLoginRedirect(user.role));
  };

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.two_factor_required) return { twoFactorToken: res.data.data.challenge_token as string };
    completeLogin(res.data.data);
    return {};
  };

  const verifyTwoFactor = async (challengeToken: string, entry: { code?: string; recovery_code?: string }) => {
    const res = await api.post('/auth/2fa/verify', { challenge_token: challengeToken, ...entry });
    completeLogin(res.data.data);
  };

  const logout = () => {
    localStorage.removeItem('gems_token');
    localStorage.removeItem('gems_user');
    localStorage.removeItem('gems_tenant');
    localStorage.removeItem('gems_branch');
    localStorage.removeItem('gems_active_branch');
    setUser(null);
    setTenant(null);
    setBranch(null);
    setBranches([]);
    setActiveBranchId('');
    router.push('/login');
  };

  const isRole = (...roles: string[]) => !!user && roles.includes(user.role);
  const allowedModules = getAllowedModules(tenant);
  const hasModule = (module: string) => user?.role === 'platform_admin' || allowedModules.includes(module);

  return (
    <AuthContext.Provider value={{ user, tenant, branch, loading, login, verifyTwoFactor, refreshUser, logout, isRole, allowedModules, hasModule, isOrgLevel, branches, activeBranchId, setActiveBranch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
