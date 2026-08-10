'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { toast } from '@/components/ui';
import {
  Plus, RefreshCw, FileSignature, Search, X,
  ChevronRight, Calendar, User, CheckCircle2,
  PauseCircle, XCircle, FileText, Activity,
} from 'lucide-react';

interface Contract {
  id: string;
  contract_number: string;
  title: string;
  description?: string;
  customer_name?: string;
  value: number;
  currency: string;
  status: string;
  contract_type: string;
  start_date?: string;
  end_date?: string;
  project_count?: number;
}

const STATUS_STYLE: Record<string, string> = {
  draft:      'bg-gray-100 text-gray-600',
  active:     'bg-green-50 text-green-700',
  on_hold:    'bg-amber-50 text-amber-700',
  completed:  'bg-blue-50 text-blue-700',
  terminated: 'bg-red-50 text-red-600',
};
const STATUS_ICON: Record<string, React.ReactNode> = {
  draft:      <FileText className="w-3 h-3" />,
  active:     <Activity className="w-3 h-3" />,
  on_hold:    <PauseCircle className="w-3 h-3" />,
  completed:  <CheckCircle2 className="w-3 h-3" />,
  terminated: <XCircle className="w-3 h-3" />,
};

const STATUSES      = ['draft', 'active', 'on_hold', 'completed', 'terminated'];
const CONTRACT_TYPES = ['service', 'supply', 'maintenance', 'retainer', 'partnership', 'other'];
const label = (s: string) => (s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
const money = (n: number, c = 'GHS') =>
  `${c} ${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dateVal = (d?: string | null) => (d ? String(d).slice(0, 10) : '');

const EMPTY_FORM = {
  title: '', description: '', customer_id: '', contract_type: 'service',
  value: '', currency: 'GHS', status: 'draft',
  signed_date: '', start_date: '', end_date: '',
};

export default function ContractsPage() {
  const { user } = useAuth();
  const canManage = ['platform_admin', 'business_owner', 'branch_manager', 'accountant'].includes(user?.role || '');

  const [rows, setRows]         = useState<Contract[]>([]);
  const [customers, setCustomers] = useState<{ id: string; name: string; company?: string }[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter]     = useState('');
  const [showAdd, setShowAdd]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [form, setForm]         = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      if (typeFilter)   params.contract_type = typeFilter;
      const r = await api.get('/contracts', { params });
      let data: Contract[] = r.data.data || [];
      if (search.trim()) {
        const q = search.toLowerCase();
        data = data.filter(c =>
          c.title.toLowerCase().includes(q) ||
          c.contract_number.toLowerCase().includes(q) ||
          (c.customer_name || '').toLowerCase().includes(q),
        );
      }
      setRows(data);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not load contracts');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, search]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    api.get('/customers').then(r => setCustomers(r.data.data || [])).catch(() => {});
  }, []);

  const create = async () => {
    if (!form.title.trim()) return toast.error('A contract title is required');
    setSaving(true);
    try {
      const r = await api.post('/contracts', {
        ...form,
        value: parseFloat(form.value) || 0,
        customer_id: form.customer_id || undefined,
        signed_date: form.signed_date || undefined,
        start_date:  form.start_date  || undefined,
        end_date:    form.end_date    || undefined,
      });
      toast.success(`${r.data.data.contract_number} created`);
      setShowAdd(false);
      setForm(EMPTY_FORM);
      await load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not create contract');
    } finally {
      setSaving(false);
    }
  };

  const active    = rows.filter(c => c.status === 'active').length;
  const totalVal  = rows.reduce((s, c) => s + (c.value || 0), 0);
  const expiring  = rows.filter(c => {
    if (!c.end_date || c.status !== 'active') return false;
    const days = Math.ceil((new Date(c.end_date).getTime() - Date.now()) / 86400000);
    return days >= 0 && days <= 30;
  }).length;

  return (
    <AppLayout
      title="Contracts"
      subtitle="Formal agreements with clients and partners"
      allowedRoles={['platform_admin', 'business_owner', 'branch_manager', 'accountant']}
    >
      <div className="space-y-5">

        {/* Summary strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total',    value: String(rows.length), sub: 'all contracts',          tone: 'text-gray-900' },
            { label: 'Active',   value: String(active),      sub: 'currently running',       tone: 'text-green-600' },
            { label: 'Value',    value: money(totalVal),     sub: 'combined contract value', tone: 'text-gray-900' },
            { label: 'Expiring', value: String(expiring),    sub: 'within 30 days',          tone: expiring ? 'text-amber-600' : 'text-gray-900' },
          ].map(s => (
            <div key={s.label} className="card">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">{s.label}</p>
              <p className={`text-2xl font-extrabold mt-1 ${s.tone}`}>{s.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="form-input pl-9"
              placeholder="Search by title, number or client…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <select className="form-input !w-auto" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{label(s)}</option>)}
          </select>
          <select className="form-input !w-auto" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">All types</option>
            {CONTRACT_TYPES.map(t => <option key={t} value={t}>{label(t)}</option>)}
          </select>
          <button type="button" onClick={load} className="btn-secondary" disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          {canManage && (
            <button type="button" onClick={() => setShowAdd(v => !v)} className="btn-primary">
              <Plus className="w-4 h-4" /> New contract
            </button>
          )}
        </div>

        {/* New contract modal */}
        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowAdd(false); setForm(EMPTY_FORM); }} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
                <div>
                  <h2 className="font-bold text-gray-900 text-base">New contract</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Record a formal agreement with a client or partner.</p>
                </div>
                <button onClick={() => { setShowAdd(false); setForm(EMPTY_FORM); }} className="btn-icon">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="form-label">Title *</label>
                  <input className="form-input" placeholder="e.g. Sentinel IT Support Agreement" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                </div>
                <div className="sm:col-span-2">
                  <label className="form-label">Description</label>
                  <textarea rows={2} className="form-input resize-none" placeholder="Brief scope…" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Client</label>
                  <select className="form-input" value={form.customer_id} onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}>
                    <option value="">Not linked</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.company || c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Type</label>
                  <select className="form-input" value={form.contract_type} onChange={e => setForm(f => ({ ...f, contract_type: e.target.value }))}>
                    {CONTRACT_TYPES.map(t => <option key={t} value={t}>{label(t)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Value (GH₵)</label>
                  <input type="number" min={0} className="form-input" placeholder="0.00" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Status</label>
                  <select className="form-input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    {STATUSES.map(s => <option key={s} value={s}>{label(s)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Signed date</label>
                  <input type="date" className="form-input" value={form.signed_date} onChange={e => setForm(f => ({ ...f, signed_date: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Start date</label>
                  <input type="date" className="form-input" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">End date</label>
                  <input type="date" className="form-input" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2 px-6 pb-6 pt-2 border-t border-gray-100">
                <button type="button" className="btn-primary" onClick={create} disabled={saving}>
                  {saving ? 'Creating…' : 'Create contract'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => { setShowAdd(false); setForm(EMPTY_FORM); }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* List */}
        {loading && !rows.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card animate-pulse space-y-3">
                <div className="flex justify-between"><div className="h-3 bg-gray-100 rounded w-1/4" /><div className="h-5 bg-gray-100 rounded-full w-16" /></div>
                <div className="h-4 bg-gray-100 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
                <div className="flex justify-between pt-2 border-t border-gray-50"><div className="h-3 bg-gray-100 rounded w-1/3" /><div className="h-3 bg-gray-100 rounded w-1/4" /></div>
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="card text-center py-20">
            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileSignature className="w-7 h-7 text-gray-300" />
            </div>
            <p className="font-semibold text-gray-700 text-base">
              {search || statusFilter || typeFilter ? 'No contracts match' : 'No contracts yet'}
            </p>
            <p className="text-sm text-gray-400 mt-1 max-w-xs mx-auto">
              {search || statusFilter || typeFilter
                ? 'Try adjusting your filters.'
                : 'Record your first formal agreement to start tracking it here.'}
            </p>
            {!search && !statusFilter && !typeFilter && canManage && (
              <button type="button" className="btn-primary mt-5 mx-auto" onClick={() => setShowAdd(true)}>
                <Plus className="w-4 h-4" /> New contract
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {rows.map(c => {
              const daysLeft = c.end_date
                ? Math.ceil((new Date(c.end_date).getTime() - Date.now()) / 86400000)
                : null;
              const expiringSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 30 && c.status === 'active';

              return (
                <Link
                  key={c.id}
                  href={`/contracts/${c.id}`}
                  className="card hover:shadow-md hover:-translate-y-0.5 transition-all block group"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[11px] font-mono text-gray-400 tracking-wide">{c.contract_number}</p>
                        <span className="text-[10px] uppercase tracking-wide font-semibold text-gray-400">{label(c.contract_type)}</span>
                      </div>
                      <h3 className="font-bold text-gray-900 truncate mt-0.5 group-hover:text-[#0D3B6E] transition-colors">
                        {c.title}
                      </h3>
                      {c.customer_name && (
                        <p className="text-xs text-gray-500 truncate mt-0.5 flex items-center gap-1">
                          <User className="w-3 h-3 flex-shrink-0" /> {c.customer_name}
                        </p>
                      )}
                    </div>
                    <span className={`badge ${STATUS_STYLE[c.status] || STATUS_STYLE.draft} flex-shrink-0 gap-1`}>
                      {STATUS_ICON[c.status]} {label(c.status)}
                    </span>
                  </div>

                  {c.end_date && (
                    <p className={`text-xs flex items-center gap-1 mb-2 ${expiringSoon ? 'text-amber-600 font-semibold' : 'text-gray-400'}`}>
                      <Calendar className="w-3 h-3 flex-shrink-0" />
                      {expiringSoon ? `Expires in ${daysLeft}d` : `Ends ${new Date(c.end_date).toLocaleDateString()}`}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    <div>
                      <span className="text-sm font-bold text-gray-900">{money(c.value, c.currency)}</span>
                      {(c.project_count ?? 0) > 0 && (
                        <span className="ml-2 text-xs text-gray-400">{c.project_count} project{c.project_count === 1 ? '' : 's'}</span>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#0D3B6E] transition-colors" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
