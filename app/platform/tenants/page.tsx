'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Spinner } from '@/components/ui';
import { Search, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { toast } from '@/components/ui';
import api from '@/lib/api';
import Link from 'next/link';

const STATUS_COLORS: Record<string, string> = {
  active:    'bg-green-100 text-green-700',
  trial:     'bg-yellow-100 text-yellow-700',
  expired:   'bg-red-100 text-red-700',
  suspended: 'bg-gray-100 text-gray-500',
};

const PLAN_COLORS: Record<string, string> = {
  starter:    'bg-blue-50 text-blue-600',
  pro:        'bg-purple-50 text-purple-600',
  enterprise: 'bg-orange-50 text-orange-600',
};

export default function TenantsPage() {
  const [tenants, setTenants]       = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPlan, setFilterPlan] = useState('');
  const [acting, setActing]         = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api.get('/platform/tenants').then(r => setTenants(r.data.data)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const filtered = tenants.filter(t =>
    (!search || t.business_name.toLowerCase().includes(search.toLowerCase()) || t.email.toLowerCase().includes(search.toLowerCase())) &&
    (!filterStatus || t.subscription_status === filterStatus) &&
    (!filterPlan   || t.plan === filterPlan)
  );

  const suspend = async (id: string, name: string) => {
    if (!confirm(`Suspend "${name}"? They will lose access immediately.`)) return;
    setActing(id);
    try {
      await api.patch(`/platform/tenants/${id}/suspend`);
      toast.success(`${name} suspended`);
      load();
    } catch { toast.error('Failed to suspend'); }
    finally { setActing(null); }
  };

  const activate = async (id: string, name: string) => {
    setActing(id);
    try {
      await api.patch(`/platform/tenants/${id}/activate`);
      toast.success(`${name} activated`);
      load();
    } catch { toast.error('Failed to activate'); }
    finally { setActing(null); }
  };

  return (
    <AppLayout title="Businesses" subtitle="All registered tenants on the platform" allowedRoles={['platform_admin']}>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="form-input pl-9" placeholder="Search business name or email…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-input w-auto" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {['active','trial','expired','suspended'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="form-input w-auto" value={filterPlan} onChange={e => setFilterPlan(e.target.value)}>
          <option value="">All Plans</option>
          {['starter','pro','enterprise'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <button onClick={load} className="btn-secondary"><RefreshCw className="w-4 h-4" /></button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 text-xs text-gray-400">
          {filtered.length} of {tenants.length} businesses
        </div>
        {loading ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No businesses found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="table-header">
                <tr>
                  {['Business','Plan','Status','Branches','Users','Expires','Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(t => {
                  const days = t.subscription_expires_at
                    ? Math.ceil((new Date(t.subscription_expires_at).getTime() - Date.now()) / 86400000)
                    : null;
                  const isSuspended = t.subscription_status === 'suspended';
                  return (
                    <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{t.business_name}</div>
                        <div className="text-xs text-gray-400">{t.email}</div>
                        <div className="text-xs text-gray-300 font-mono">{t.slug}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${PLAN_COLORS[t.plan] || 'bg-gray-100 text-gray-500'}`}>
                          {t.plan}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[t.subscription_status] || 'bg-gray-100 text-gray-500'}`}>
                          {t.subscription_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{t.branch_count ?? 0} / {t.max_branches}</td>
                      <td className="px-4 py-3 text-gray-600">{t.user_count ?? 0} / {t.max_users}</td>
                      <td className="px-4 py-3">
                        {days !== null ? (
                          <span className={`text-xs font-medium ${days <= 0 ? 'text-red-500' : days <= 7 ? 'text-orange-500' : 'text-gray-500'}`}>
                            {days <= 0 ? 'Expired' : `${days}d left`}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link href={`/platform/tenants/${t.id}`} className="text-xs text-blue-600 hover:underline font-medium">
                            View
                          </Link>
                          {isSuspended ? (
                            <button
                              onClick={() => activate(t.id, t.business_name)}
                              disabled={acting === t.id}
                              className="flex items-center gap-1 text-xs text-green-600 hover:underline font-medium disabled:opacity-50"
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Activate
                            </button>
                          ) : (
                            <button
                              onClick={() => suspend(t.id, t.business_name)}
                              disabled={acting === t.id}
                              className="flex items-center gap-1 text-xs text-red-500 hover:underline font-medium disabled:opacity-50"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Suspend
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
