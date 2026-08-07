'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import api from '@/lib/api';
import { toast } from '@/components/ui';
import {
  Plus, RefreshCw, Briefcase, AlertTriangle, Search,
  X, Calendar, MapPin, User, TrendingUp, ChevronRight,
  CheckCircle2, Clock3, PauseCircle, XCircle, FileText,
} from 'lucide-react';

interface Project {
  id: string;
  _id?: string;
  code: string;
  name: string;
  description?: string;
  customer_name?: string;
  contract_value: number;
  currency: string;
  status: string;
  progress_pct: number;
  start_date?: string;
  planned_end_date?: string;
  is_overdue?: boolean;
  site_address?: string;
  manager_id?: { name: string } | null;
}

const STATUS_STYLES: Record<string, string> = {
  draft:     'bg-gray-100 text-gray-600',
  active:    'bg-green-50 text-green-700',
  on_hold:   'bg-amber-50 text-amber-700',
  completed: 'bg-blue-50 text-blue-700',
  cancelled: 'bg-red-50 text-red-600',
};

const STATUS_BAR: Record<string, string> = {
  draft:     'bg-gray-300',
  active:    'bg-[#0D3B6E]',
  on_hold:   'bg-amber-400',
  completed: 'bg-blue-500',
  cancelled: 'bg-red-400',
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  draft:     <FileText className="w-3 h-3" />,
  active:    <TrendingUp className="w-3 h-3" />,
  on_hold:   <PauseCircle className="w-3 h-3" />,
  completed: <CheckCircle2 className="w-3 h-3" />,
  cancelled: <XCircle className="w-3 h-3" />,
};

const STATUSES = ['draft', 'active', 'on_hold', 'completed', 'cancelled'];
const label = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
const money = (n: number, c = 'GHS') =>
  `${c} ${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const EMPTY_FORM = {
  name: '', customer_id: '', contract_value: '', retention_pct: '',
  start_date: '', planned_end_date: '', site_address: '', description: '',
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (status) params.status = status;
      if (search.trim()) params.search = search.trim();
      const r = await api.get('/projects', { params });
      setProjects(r.data.data || []);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not load projects');
    } finally {
      setLoading(false);
    }
  }, [status, search]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    api.get('/customers').then(r => setCustomers(r.data.data || [])).catch(() => {});
  }, []);

  const create = async () => {
    if (!form.name.trim()) return toast.error('Give the project a name');
    setSaving(true);
    try {
      const r = await api.post('/projects', {
        ...form,
        contract_value: parseFloat(form.contract_value) || 0,
        retention_pct: parseFloat(form.retention_pct) || 0,
        customer_id: form.customer_id || undefined,
        start_date: form.start_date || undefined,
        planned_end_date: form.planned_end_date || undefined,
      });
      toast.success(`${r.data.data.code} created`);
      setShowAdd(false);
      setForm(EMPTY_FORM);
      await load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not create the project');
    } finally {
      setSaving(false);
    }
  };

  const active    = projects.filter(p => p.status === 'active');
  const completed = projects.filter(p => p.status === 'completed');
  const overdue   = projects.filter(p => p.is_overdue);
  const totalContract = projects.reduce((s, p) => s + (p.contract_value || 0), 0);

  return (
    <AppLayout
      title="Projects"
      subtitle="Track contract work from award to completion"
      allowedRoles={['platform_admin', 'business_owner', 'branch_manager', 'accountant']}
    >
      <div className="space-y-5">

        {/* Summary strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total projects',   value: String(projects.length), sub: `${completed.length} completed`,        tone: 'text-gray-900' },
            { label: 'Active',           value: String(active.length),   sub: 'currently running',                    tone: 'text-green-600' },
            { label: 'Contract value',   value: money(totalContract),    sub: 'across all projects',                  tone: 'text-gray-900' },
            { label: 'Overdue',          value: String(overdue.length),  sub: overdue.length ? 'need attention' : 'all on track', tone: overdue.length ? 'text-red-600' : 'text-gray-900' },
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
              placeholder="Search by name, code or client…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <select className="form-input !w-auto" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{label(s)}</option>)}
          </select>
          <button type="button" onClick={load} className="btn-secondary" disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button type="button" onClick={() => setShowAdd(v => !v)} className="btn-primary">
            <Plus className="w-4 h-4" /> New project
          </button>
        </div>

        {/* New project modal */}
        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowAdd(false); setForm(EMPTY_FORM); }} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
                <div>
                  <h2 className="font-bold text-gray-900 text-base">New project</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Fill in the details to create a new contract project.</p>
                </div>
                <button onClick={() => { setShowAdd(false); setForm(EMPTY_FORM); }} className="btn-icon">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="form-label">Project name *</label>
                  <input className="form-input" placeholder="e.g. Tema warehouse construction" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="sm:col-span-2">
                  <label className="form-label">Description</label>
                  <textarea rows={2} className="form-input resize-none" placeholder="Brief scope of work…" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Client</label>
                  <select className="form-input" value={form.customer_id} onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}>
                    <option value="">Not linked</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Contract value (GH₵)</label>
                  <input type="number" className="form-input" placeholder="0.00" value={form.contract_value} onChange={e => setForm(f => ({ ...f, contract_value: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Start date</label>
                  <input type="date" className="form-input" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Planned completion</label>
                  <input type="date" className="form-input" value={form.planned_end_date} onChange={e => setForm(f => ({ ...f, planned_end_date: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Retention (%)</label>
                  <input type="number" className="form-input" placeholder="0" value={form.retention_pct} onChange={e => setForm(f => ({ ...f, retention_pct: e.target.value }))} />
                  <p className="form-hint">Held back by the client until completion.</p>
                </div>
                <div>
                  <label className="form-label">Site / location</label>
                  <input className="form-input" placeholder="e.g. Tema Industrial Area" value={form.site_address} onChange={e => setForm(f => ({ ...f, site_address: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2 px-6 pb-6 pt-2 border-t border-gray-100">
                <button type="button" className="btn-primary" onClick={create} disabled={saving}>
                  {saving ? 'Creating…' : 'Create project'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => { setShowAdd(false); setForm(EMPTY_FORM); }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Project list */}
        {loading && !projects.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card animate-pulse space-y-3">
                <div className="flex justify-between">
                  <div className="h-3 bg-gray-100 rounded w-1/4" />
                  <div className="h-5 bg-gray-100 rounded-full w-16" />
                </div>
                <div className="h-4 bg-gray-100 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
                <div className="h-2 bg-gray-100 rounded-full w-full mt-2" />
                <div className="flex justify-between pt-2 border-t border-gray-50">
                  <div className="h-3 bg-gray-100 rounded w-1/3" />
                  <div className="h-3 bg-gray-100 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="card text-center py-20">
            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Briefcase className="w-7 h-7 text-gray-300" />
            </div>
            <p className="font-semibold text-gray-700 text-base">
              {search || status ? 'No projects match' : 'No projects yet'}
            </p>
            <p className="text-sm text-gray-400 mt-1 max-w-xs mx-auto">
              {search || status
                ? 'Try adjusting your search or status filter.'
                : 'Create your first project to start tracking contract work.'}
            </p>
            {!search && !status && (
              <button type="button" className="btn-primary mt-5 mx-auto" onClick={() => setShowAdd(true)}>
                <Plus className="w-4 h-4" /> New project
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projects.map(p => {
              const pid = p.id || p._id;
              const pct = Math.min(100, Math.max(0, p.progress_pct || 0));
              const daysLeft = p.planned_end_date
                ? Math.ceil((new Date(p.planned_end_date).getTime() - Date.now()) / 86400000)
                : null;

              return (
                <Link
                  key={pid}
                  href={`/projects/${pid}`}
                  className="card hover:shadow-md hover:-translate-y-0.5 transition-all block group"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-mono text-gray-400 tracking-wide">{p.code}</p>
                      <h3 className="font-bold text-gray-900 truncate mt-0.5 group-hover:text-[#0D3B6E] transition-colors">
                        {p.name}
                      </h3>
                      {p.customer_name && (
                        <p className="text-xs text-gray-500 truncate mt-0.5 flex items-center gap-1">
                          <User className="w-3 h-3 flex-shrink-0" /> {p.customer_name}
                        </p>
                      )}
                    </div>
                    <span className={`badge ${STATUS_STYLES[p.status] || STATUS_STYLES.draft} flex-shrink-0 gap-1`}>
                      {STATUS_ICON[p.status]} {label(p.status)}
                    </span>
                  </div>

                  {/* Progress */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-gray-400 font-medium">Progress</span>
                      <span className="font-bold text-gray-700">{Math.round(pct)}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${STATUS_BAR[p.status] || STATUS_BAR.draft}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Meta row */}
                  {(p.site_address || p.start_date) && (
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2.5">
                      {p.site_address && (
                        <span className="text-xs text-gray-400 flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{p.site_address}</span>
                        </span>
                      )}
                      {p.start_date && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3 flex-shrink-0" />
                          {new Date(p.start_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    <span className="text-sm font-bold text-gray-900">{money(p.contract_value, p.currency)}</span>
                    <div className="flex items-center gap-2">
                      {p.is_overdue ? (
                        <span className="text-xs font-semibold text-red-600 inline-flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Overdue
                        </span>
                      ) : daysLeft !== null && daysLeft <= 14 && daysLeft > 0 ? (
                        <span className="text-xs font-semibold text-amber-600 inline-flex items-center gap-1">
                          <Clock3 className="w-3 h-3" /> {daysLeft}d left
                        </span>
                      ) : p.planned_end_date ? (
                        <span className="text-xs text-gray-400">
                          Due {new Date(p.planned_end_date).toLocaleDateString()}
                        </span>
                      ) : null}
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#0D3B6E] transition-colors" />
                    </div>
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
