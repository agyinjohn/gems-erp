import axios from 'axios';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// ── In-memory cache ──
interface CacheEntry { data: any; ts: number; }
const cache = new Map<string, CacheEntry>();
const DEFAULT_TTL = 5 * 60_000; // 5 minutes

export const apiCache = {
  // Always returns data if it exists (stale-while-revalidate).
  // Use isStale() to decide whether to revalidate in the background.
  get: (key: string) => {
    const entry = cache.get(key);
    return entry ? entry.data : null;
  },
  isStale: (key: string, ttl = DEFAULT_TTL) => {
    const entry = cache.get(key);
    if (!entry) return true;
    return Date.now() - entry.ts > ttl;
  },
  set: (key: string, data: any) => cache.set(key, { data, ts: Date.now() }),
  invalidate: (prefix: string) => {
    cache.forEach((_, key) => { if (key.startsWith(prefix)) cache.delete(key); });
  },
  clear: () => cache.clear(),
};
const api = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token + active branch scope to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('gems_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    // Organizational-level users can scope requests to a chosen branch.
    // Branch-level users are pinned server-side regardless, so sending this
    // is harmless for them. Empty / unset means "all branches".
    // Don't override a branch_id a caller passed explicitly (e.g. the Reports
    // page has its own branch selector).
    const activeBranch = localStorage.getItem('gems_active_branch');
    const hasExplicitBranch = config.params && 'branch_id' in config.params;
    if (activeBranch && !hasExplicitBranch) {
      config.params = { ...(config.params || {}), branch_id: activeBranch };
    }
  }
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('gems_token');
      localStorage.removeItem('gems_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Public API — no auth token, no redirect — for storefront use
export const publicApi = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
});

export default api;
