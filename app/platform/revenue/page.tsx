'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Spinner } from '@/components/ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import api from '@/lib/api';

const PLAN_PRICES: Record<string, number> = { starter: 29, pro: 79, enterprise: 199 };
const PLAN_COLORS: Record<string, string> = { starter: '#3B82F6', pro: '#8B5CF6', enterprise: '#F97316' };

export default function RevenuePage() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/platform/tenants').then(r => setTenants(r.data.data)).finally(() => setLoading(false));
  }, []);

  const activeTenants = tenants.filter(t => ['active','trial'].includes(t.subscription_status));

  // MRR calculation
  const mrr = activeTenants.reduce((sum, t) => sum + (PLAN_PRICES[t.plan] || 0), 0);
  const arr  = mrr * 12;

  // Revenue by plan
  const byPlan = ['starter','pro','enterprise'].map(plan => ({
    plan: plan.charAt(0).toUpperCase() + plan.slice(1),
    count: tenants.filter(t => t.plan === plan && t.subscription_status === 'active').length,
    mrr: tenants.filter(t => t.plan === plan && t.subscription_status === 'active').length * PLAN_PRICES[plan],
    color: PLAN_COLORS[plan],
  }));

  // Tenant status breakdown for pie
  const statusData = [
    { name: 'Active',    value: tenants.filter(t => t.subscription_status === 'active').length,    color: '#22C55E' },
    { name: 'Trial',     value: tenants.filter(t => t.subscription_status === 'trial').length,     color: '#EAB308' },
    { name: 'Expired',   value: tenants.filter(t => t.subscription_status === 'expired').length,   color: '#EF4444' },
    { name: 'Suspended', value: tenants.filter(t => t.subscription_status === 'suspended').length, color: '#9CA3AF' },
  ].filter(d => d.value > 0);

  const stats = [
    { label: 'Monthly Recurring Revenue', value: `$${mrr.toLocaleString()}`, sub: 'Active subscriptions only' },
    { label: 'Annual Recurring Revenue',  value: `$${arr.toLocaleString()}`, sub: 'MRR × 12' },
    { label: 'Paying Tenants',            value: tenants.filter(t => t.subscription_status === 'active').length, sub: 'Active plans' },
    { label: 'Total Tenants',             value: tenants.length, sub: 'All statuses' },
  ];

  return (
    <AppLayout title="Revenue" subtitle="Platform revenue and subscription metrics" allowedRoles={['platform_admin']}>
      {loading ? (
        <Spinner />
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {stats.map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-5">
                <div className="text-2xl font-extrabold text-gray-900 mb-1">{s.value}</div>
                <div className="text-sm font-semibold text-gray-700">{s.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{s.sub}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">

            {/* Revenue by plan bar chart */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="font-bold text-gray-900 mb-4">MRR by Plan</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={byPlan} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="plan" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: any) => [`$${v}`, 'MRR']} />
                  <Bar dataKey="mrr" radius={[6,6,0,0]}>
                    {byPlan.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Tenant status pie */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="font-bold text-gray-900 mb-4">Tenant Status Breakdown</h2>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                    {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Plan breakdown table */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Plan Breakdown</h2>
            </div>
            <table className="w-full text-sm">
              <thead className="table-header">
                <tr>
                  {['Plan','Price/mo','Active Tenants','MRR','ARR'].map(h => (
                    <th key={h} className="px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {byPlan.map(p => (
                  <tr key={p.plan} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-semibold" style={{ color: p.color }}>{p.plan}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">${PLAN_PRICES[p.plan.toLowerCase()]}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{p.count}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">${p.mrr.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-600">${(p.mrr * 12).toLocaleString()}</td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-bold">
                  <td className="px-4 py-3 text-gray-900" colSpan={2}>Total</td>
                  <td className="px-4 py-3 text-gray-900">{byPlan.reduce((s,p) => s + p.count, 0)}</td>
                  <td className="px-4 py-3 text-gray-900">${mrr.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-900">${arr.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </AppLayout>
  );
}
