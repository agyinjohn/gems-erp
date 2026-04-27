'use client';
import { useEffect, useRef, useState } from 'react';
import { Bell, Search, X, Package, ShoppingCart, Users, AlertTriangle, Info, LogOut, KeyRound, ChevronDown } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { toast } from '@/components/ui';

interface Props { title: string; subtitle?: string; }

interface SearchResult { type: string; label: string; sub: string; link: string; }
interface Notification { id: string; type: 'warning' | 'info'; title: string; message: string; link: string; }

export default function Header({ title, subtitle }: Props) {
  const { user, logout } = useAuth();
  const router = useRouter();

  // ── Search ──────────────────────────────────────────────────────────────────
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const [products, orders, customers] = await Promise.all([
          api.get(`/products?search=${query}`).catch(() => ({ data: { data: [] } })),
          api.get(`/orders?search=${query}`).catch(() => ({ data: { data: [] } })),
          api.get(`/customers?search=${query}`).catch(() => ({ data: { data: [] } })),
        ]);
        const r: SearchResult[] = [
          ...products.data.data.slice(0, 3).map((p: any) => ({ type: 'product', label: p.name, sub: `SKU: ${p.sku} · Stock: ${p.stock_qty}`, link: '/inventory' })),
          ...orders.data.data.slice(0, 3).map((o: any) => ({ type: 'order', label: o.order_number, sub: `${o.customer_name} · GHS ${parseFloat(o.total).toFixed(2)}`, link: '/orders' })),
          ...customers.data.data.slice(0, 3).map((c: any) => ({ type: 'customer', label: c.name, sub: c.company || c.email || '—', link: '/crm' })),
        ];
        setResults(r);
      } finally { setSearchLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const typeIcon: Record<string, any> = { product: <Package className="w-3.5 h-3.5 text-blue-500" />, order: <ShoppingCart className="w-3.5 h-3.5 text-green-500" />, customer: <Users className="w-3.5 h-3.5 text-purple-500" /> };

  // ── Notifications ───────────────────────────────────────────────────────────
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const notifRef = useRef<HTMLDivElement>(null);

  const loadNotifications = async () => {
    setNotifLoading(true);
    try {
      const r = await api.get('/notifications');
      setNotifications(r.data.data);
    } finally { setNotifLoading(false); }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const visible = notifications.filter(n => !dismissed.has(n.id));

  // ── Profile ─────────────────────────────────────────────────────────────────
  const [profileOpen, setProfileOpen] = useState(false);
  const [pwModal, setPwModal] = useState(false);
  const [logoutModal, setLogoutModal] = useState(false);
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const changePassword = async () => {
    if (pwForm.new_password !== pwForm.confirm_password) { toast.error('New passwords do not match'); return; }
    if (pwForm.new_password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (!/[A-Z]/.test(pwForm.new_password)) { toast.error('Password must contain at least one uppercase letter'); return; }
    if (!/[0-9]/.test(pwForm.new_password)) { toast.error('Password must contain at least one number'); return; }
    if (!/[^A-Za-z0-9]/.test(pwForm.new_password)) { toast.error('Password must contain at least one special character'); return; }
    setPwSaving(true);
    try {
      await api.post('/auth/change-password', { current_password: pwForm.current_password, new_password: pwForm.new_password });
      toast.success('Password changed — please log in again');
      setPwModal(false);
      setPwForm({ current_password: '', new_password: '', confirm_password: '' });
      setTimeout(() => logout(), 1500);
    } catch(e: any) { toast.error(e.response?.data?.message || 'Failed to change password'); }
    finally { setPwSaving(false); }
  };

  const roleLabels: Record<string, string> = {
    super_admin: 'Super Admin', sales_staff: 'Sales Staff', warehouse_staff: 'Warehouse Staff',
    accountant: 'Accountant', hr_manager: 'HR Manager', procurement_officer: 'Procurement Officer',
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">

        {/* Search */}
        <div ref={searchRef} className="relative hidden md:block">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 w-56 focus:w-72 transition-all"
            placeholder="Search products, orders, customers…"
            value={query}
            onChange={e => { setQuery(e.target.value); setSearchOpen(true); }}
            onFocus={() => setSearchOpen(true)}
          />
          {query && <button onClick={() => { setQuery(''); setResults([]); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>}

          {/* Dropdown */}
          {searchOpen && query.trim() && (
            <div className="absolute top-full mt-2 left-0 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
              {searchLoading ? (
                <div className="px-4 py-6 text-center text-sm text-gray-400">Searching…</div>
              ) : results.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-gray-400">No results for "{query}"</div>
              ) : (
                <div>
                  {results.map((r, i) => (
                    <button key={i} onClick={() => { router.push(r.link); setSearchOpen(false); setQuery(''); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left border-b border-gray-50 last:border-0">
                      <div className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0">{typeIcon[r.type]}</div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-800 truncate">{r.label}</div>
                        <div className="text-xs text-gray-400 truncate">{r.sub}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button onClick={() => setNotifOpen(o => !o)} className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <Bell className="w-5 h-5 text-gray-500" />
            {visible.length > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center">
                {visible.length > 9 ? '9+' : visible.length}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="font-semibold text-gray-800 text-sm">Notifications</span>
                <div className="flex items-center gap-2">
                  {visible.length > 0 && <button onClick={() => setDismissed(new Set(notifications.map(n => n.id)))} className="text-xs text-blue-600 hover:underline">Clear all</button>}
                  <button onClick={() => setNotifOpen(false)}><X className="w-4 h-4 text-gray-400" /></button>
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {notifLoading ? (
                  <div className="px-4 py-6 text-center text-sm text-gray-400">Loading…</div>
                ) : visible.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <Bell className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">All caught up!</p>
                  </div>
                ) : (
                  visible.map(n => (
                    <div key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${n.type === 'warning' ? 'bg-yellow-100' : 'bg-blue-100'}`}>
                        {n.type === 'warning' ? <AlertTriangle className="w-3.5 h-3.5 text-yellow-600" /> : <Info className="w-3.5 h-3.5 text-blue-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-gray-700">{n.title}</div>
                        <div className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.message}</div>
                        <button onClick={() => { router.push(n.link); setNotifOpen(false); }} className="text-xs text-blue-600 hover:underline mt-1">View →</button>
                      </div>
                      <button onClick={() => setDismissed(d => new Set([...d, n.id]))} className="text-gray-300 hover:text-gray-500 flex-shrink-0"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Avatar + Profile Dropdown */}
        <div ref={profileRef} className="relative">
          <button onClick={() => setProfileOpen(o => !o)} className="flex items-center gap-2 hover:bg-gray-100 rounded-lg px-2 py-1.5 transition-colors">
            <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center text-white text-sm font-bold">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-semibold text-gray-800 leading-tight">{user?.name}</div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 hidden md:block" />
          </button>

          {profileOpen && (
            <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
              {/* User info */}
              <div className="px-4 py-4 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-700 flex items-center justify-center text-white font-bold">
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{user?.name}</div>
                    <div className="text-xs text-gray-500">{user?.email}</div>
                    <div className="text-xs text-blue-600 font-medium mt-0.5">{roleLabels[user?.role || ''] || user?.role}</div>
                  </div>
                </div>
              </div>
              {/* Actions */}
              <div className="py-1">
                <button onClick={() => { setProfileOpen(false); setPwModal(true); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                  <KeyRound className="w-4 h-4 text-gray-400" />
                  Change Password
                </button>
                <div className="border-t border-gray-100 my-1" />
                <button onClick={() => { setProfileOpen(false); setLogoutModal(true); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Change Password Modal */}
      {pwModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setPwModal(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Change Password</h3>
              <button onClick={() => setPwModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="form-label">Current Password</label>
                <input type="password" className="form-input" value={pwForm.current_password} onChange={e => setPwForm({...pwForm, current_password: e.target.value})} />
              </div>
              <div>
                <label className="form-label">New Password</label>
                <input type="password" className="form-input" value={pwForm.new_password} onChange={e => setPwForm({...pwForm, new_password: e.target.value})} />
                <div className="mt-1.5 flex gap-1">
                  {[
                    { label: '8+ chars', ok: pwForm.new_password.length >= 8 },
                    { label: 'Uppercase', ok: /[A-Z]/.test(pwForm.new_password) },
                    { label: 'Number', ok: /[0-9]/.test(pwForm.new_password) },
                    { label: 'Special', ok: /[^A-Za-z0-9]/.test(pwForm.new_password) },
                  ].map(r => (
                    <span key={r.label} className={`text-xs px-2 py-0.5 rounded-full ${r.ok ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>{r.label}</span>
                  ))}
                </div>
              </div>
              <div>
                <label className="form-label">Confirm New Password</label>
                <input type="password" className="form-input" value={pwForm.confirm_password} onChange={e => setPwForm({...pwForm, confirm_password: e.target.value})} />
              </div>
            </div>
            <div className="flex gap-3 justify-end px-6 py-4 border-t border-gray-100">
              <button className="btn-secondary" onClick={() => setPwModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={changePassword} disabled={pwSaving}>{pwSaving ? 'Saving…' : 'Change Password'}</button>
            </div>
          </div>
        </div>
      )}
      {/* Logout Confirmation Modal */}
      {logoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setLogoutModal(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm">
            <div className="px-6 py-5 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <LogOut className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="font-semibold text-gray-900 text-lg mb-1">Sign Out</h3>
              <p className="text-sm text-gray-500">Are you sure you want to sign out of GThink ERP?</p>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button className="btn-secondary flex-1" onClick={() => setLogoutModal(false)}>Cancel</button>
              <button className="btn-danger flex-1" onClick={() => { setLogoutModal(false); logout(); }}>Sign Out</button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
