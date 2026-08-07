'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import api from '@/lib/api';
import { toast } from '@/components/ui';
import {
  Plus, RefreshCw, Briefcase, AlertTriangle, Search,
} from 'lucide-react';

interface Project {
  id: string;
  code: string;
  name: string;
  customer_name?: string;
  contract_value: number;
  currency: string;
  status: string;
  progress_pct: number;
  start_date?: string;
  planned_end_date?: string;
  is_overdue?: boolean;
  manager_id?: { first_name: string; last_name: string } | null;
}

const STATUS_STYLES: Record<string, string> = {
  draft:     'bg-gray-100 text-gray-600',
  active:    'bg-green-50 text-green-700',
  on_hold:   'bg-amber-50 text-amber-700',
  completed: 'bg-blue-50 text-blue-700',
  cancelled: 'bg-red-50 text-red-600',
};

const STATUSES = ['draft', 'active', 'on_hold', 'completed', 'cancelled'];
const label = (s: string) => s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
const money = (n: number, c = 'GHS') => `${c} ${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', customer_id: '', contract_value: '', retention_pct: '',
    start_date: '', planned_end_date: '', site_address: '', description: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
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
      setForm({ name: '', customer_id: '', contract_value: '', retention_pct: '', start_date: '', planned_end_date: '', site_address: '', description: '' });
      await load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not create the project');
    } finally {
      setSaving(false);
    }
  };

  const active = projects.filter(p => p.status === 'active');
  const totalContract = projects.reduce((s, p) => s + (p.contract_value || 0), 0);
  const overdue = projects.filter(p => p.is_overdue);

  return (
    <AppLayout
      title="Projects"
      subtitle="Track contract work from award to completion"
      allowedRoles={['platform_admin', 'business_owner', 'branch_manager', 'accountant']}
    >
      <div className="space-y-5">
        {/* Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Projects', value: String(projects.length), tone: 'text-gray-900' },
            { label: 'Active', value: String(active.length), tone: 'text-green-600' },
            { label: 'Contract value', value: money(totalContract), tone: 'text-gray-900' },
            { label: 'Overdue', value: String(overdue.length), tone: overdue.length ? 'text-red-600' : 'text-gray-900' },
          ].map(s => (
            <div key={s.label} className="card">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">{s.label}</p>
              <p className={`text-2xl font-extrabold mt-1 ${s.tone}`}>{s.value}</p>
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
          </div>
          <select className="form-input !w-auto" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{label(s)}</option>)}
          </select>
          <button type="button" onClick={load} className="btn-secondary" disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button type="button" onClick={() => setShowAdd(v => !v)} className="btn-primary">
            <Plus className="w-4 h-4" /> New project
          </button>
        </div>

        {/* New project */}
        {showAdd && (
          <div className="card">
            <h2 className="font-bold text-gray-900 mb-4">New project</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="form-label">Project name *</label>
                <input className="form-input" placeholder="e.g. Tema warehouse construction" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
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
                <p className="text-xs text-gray-400 mt-1">Held back by the client until completion. Leave 0 if not applicable.</p>
              </div>
              <div>
                <label className="form-label">Site / location</label>
                <input className="form-input" value={form.site_address} onChange={e => setForm(f => ({ ...f, site_address: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button type="button" className="btn-primary" onClick={create} disabled={saving}>{saving ? 'Creating…' : 'Create project'}</button>
              <button type="button" className="btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </div>
        )}

        {/* List */}
        {loading && !projects.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card animate-pulse space-y-3">
                <div className="h-3 bg-gray-100 rounded w-1/3" />
                <div className="h-4 bg-gray-100 rounded w-3/4" />
                <div className="h-2 bg-gray-100 rounded w-full" />
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="card text-center py-16">
            <Briefcase className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="font-semibold text-gray-600">{search || status ? 'No projects match' : 'No projects yet'}</p>
            <p className="text-sm text-gray-400 mt-1">
              {search || status ? 'Try a different search or status.' : 'Create one to start tracking a contract.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projects.map(p => (
              <Link key={p.id} href={`/projects/${p.id}`} className="card hover:shadow-lg hover:-translate-y-0.5 transition-all block">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <p className="text-xs font-mono text-gray-400">{p.code}</p>
                    <h3 className="font-bold text-gray-900 truncate">{p.name}</h3>
                    {p.customer_name && <p className="text-xs text-gray-500 truncate mt-0.5">{p.customer_name}</p>}
                  </div>
                  <span className={`badge ${STATUS_STYLES[p.status] || STATUS_STYLES.draft} flex-shrink-0`}>{label(p.status)}</span>
                </div>

                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-400">Progress</span>
                    <span className="font-bold text-gray-700">{Math.round(p.progress_pct || 0)}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${p.status === 'completed' ? 'bg-blue-500' : 'bg-[#0D3B6E]'}`}
                      style={{ width: `${Math.min(100, Math.max(0, p.progress_pct || 0))}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <span className="text-sm font-bold text-gray-900">{money(p.contract_value, p.currency)}</span>
                  {p.is_overdue ? (
                    <span className="text-xs font-semibold text-red-600 inline-flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Overdue
                    </span>
                  ) : p.planned_end_date ? (
                    <span className="text-xs text-gray-400">Due {new Date(p.planned_end_date).toLocaleDateString()}</span>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
