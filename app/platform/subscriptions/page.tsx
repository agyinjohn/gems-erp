'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Spinner } from '@/components/ui';
import { Search, RefreshCw, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { toast } from '@/components/ui';
import api from '@/lib/api';

const STATUS_COLORS: Record<string, string> = {
  active:    'bg-green-100 text-green-700',
  trial:     'bg-yellow-100 text-yellow-700',
  expired:   'bg-red-100 text-red-700',
  suspended: 'bg-gray-100 text-gray-500',
};

const STATUS_ICONS: Record<string, any> = {
  active:    CheckCircle,
  trial:     Clock,
  expired:   XCircle,
  suspended: AlertTriangle,
};

const PLAN_COLORS: Record<string, string> = {
  starter:    'bg-blue-50 text-blue-600',
  pro:        'bg-purple-50 text-purple-600',
  enterprise: 'bg-orange-50 text-orange-600',
};

export default function SubscriptionsPage() {
  const [tenants, setTenants]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPlan, setFilterPlan]     = useState('');
  const [acting, setActing]     = useState<string | null>(null);
  const [renewModal, setRenewModal] = useState<any>(null);
  const [renewDays, setRenewDays]   = useState(30);

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

  const renew = async () => {
    if (!renewModal) return;
    setActing(renewModal.id);
    const newExpiry = new Date(Date.now() + renewDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    try {
      await api.patch(`/platform/tenants/${renewModal.id}/activate`, { expires_at: newExpiry });
      toast.success(`${renewModal.business_name} renewed for ${renewDays} days`);
      setRenewModal(null);
      load();
    } catch { toast.error('Failed to renew'); }
    finally { setActing(null); }
  };

  const suspend = async (t: any) => {
    if (!confirm(`Suspend "${t.business_name}"?`)) return;
    setActing(t.id);
    try {
      await api.patch(`/platform/tenants/${t.id}/suspend`);
      toast.success(`${t.business_name} suspended`);
      load();
    } catch { toast.error('Failed to suspend'); }
    finally { setActing(null); }
  };

  // Summary counts
  const counts = {
    active:    tenants.filter(t => t.subscription_status === 'active').length,
    trial:     tenants.filter(t => t.subscription_status === 'trial').length,
    expired:   tenants.filter(t => t.subscription_status === 'expired').length,
    suspended: tenants.filter(t => t.subscription_status === 'suspended').length,
  };

  return (
    <AppLayout title="Subscriptions" subtitle="Manage all tenant subscription statuses" allowedRoles={['platform_admin']}>

      {/* Summary pills */}
      <div className="flex flex-wrap gap-3 mb-5">
        {Object.entries(counts).map(([status, count]) => {
          const Icon = STATUS_ICONS[status];
          return (
            <button
              key={status}
              onClick={() => setFilterStatus(filterStatus === status ? '' : status)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                filterStatus === status ? 'border-[#0D3B6E] bg-[#0D3B6E] text-white' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {status.charAt(0).toUpperCase() + status.slice(1)}: {count}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="form-input pl-9" placeholder="Search business…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-input w-auto" value={filterPlan} onChange={e => setFilterPlan(e.target.value)}>
          <option value="">All Plans</option>
          {['starter','pro','enterprise'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <button onClick={load} className="btn-secondary"><RefreshCw className="w-4 h-4" /></button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 text-xs text-gray-400">
          {filtered.length} subscriptions
        </div>
        {loading ? (
          <Spinner />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="table-header">
                <tr>
                  {['Business','Plan','Status','Expires','Days Left','Actions'].map(h => (
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
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${PLAN_COLORS[t.plan] || 'bg-gray-100 text-gray-500'}`}>
                          {t.plan}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[t.subscription_status]}`}>
                          {t.subscription_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {t.subscription_expires_at ? new Date(t.subscription_expires_at).toLocaleDateString('en-GH', { day:'2-digit', month:'short', year:'numeric' }) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {days !== null ? (
                          <span className={`text-xs font-bold ${days <= 0 ? 'text-red-500' : days <= 7 ? 'text-orange-500' : 'text-green-600'}`}>
                            {days <= 0 ? 'Expired' : `${days} days`}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => { setRenewModal(t); setRenewDays(30); }}
                            className="text-xs text-blue-600 hover:underline font-medium"
                          >
                            Renew
                          </button>
                          {!isSuspended ? (
                            <button
                              onClick={() => suspend(t)}
                              disabled={acting === t.id}
                              className="text-xs text-red-500 hover:underline font-medium disabled:opacity-50"
                            >
                              Suspend
                            </button>
                          ) : (
                            <button
                              onClick={async () => { setActing(t.id); await api.patch(`/platform/tenants/${t.id}/activate`); toast.success('Activated'); load(); setActing(null); }}
                              disabled={acting === t.id}
                              className="text-xs text-green-600 hover:underline font-medium disabled:opacity-50"
                            >
                              Activate
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

      {/* Renew Modal */}
      {renewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setRenewModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="font-bold text-gray-900 mb-1">Renew Subscription</h2>
            <p className="text-sm text-gray-500 mb-5">{renewModal.business_name}</p>
            <label className="form-label">Extend by (days)</label>
            <div className="flex gap-2 mb-4">
              {[7, 30, 90, 365].map(d => (
                <button
                  key={d}
                  onClick={() => setRenewDays(d)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                    renewDays === d ? 'border-[#0D3B6E] bg-[#0D3B6E] text-white' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {d === 365 ? '1yr' : `${d}d`}
                </button>
              ))}
            </div>
            <input
              type="number"
              className="form-input mb-5"
              value={renewDays}
              min={1}
              onChange={e => setRenewDays(parseInt(e.target.value))}
            />
            <p className="text-xs text-gray-400 mb-5">
              New expiry: <strong>{new Date(Date.now() + renewDays * 86400000).toLocaleDateString('en-GH', { day:'2-digit', month:'short', year:'numeric' })}</strong>
            </p>
            <div className="flex gap-3">
              <button className="btn-secondary flex-1" onClick={() => setRenewModal(null)}>Cancel</button>
              <button className="btn-primary flex-1" onClick={renew} disabled={acting === renewModal.id}>
                {acting === renewModal.id ? 'Renewing…' : 'Confirm Renew'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
