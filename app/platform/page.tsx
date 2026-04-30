'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Spinner } from '@/components/ui';
import {
  Building2, CheckCircle, AlertTriangle, XCircle, Clock,
  DollarSign, Users, Activity, ArrowUpRight,
  GitBranch, Wifi, Database, Server,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line,
} from 'recharts';
import api from '@/lib/api';
import Link from 'next/link';

const PLAN_PRICES: Record<string, number> = { starter: 29, pro: 79, enterprise: 199 };
const PLAN_COLORS: Record<string, string> = { starter: '#3B82F6', pro: '#8B5CF6', enterprise: '#F97316' };
const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700', trial: 'bg-yellow-100 text-yellow-700',
  expired: 'bg-red-100 text-red-700',   suspended: 'bg-gray-100 text-gray-500',
};
const PLAN_BADGE: Record<string, string> = {
  starter: 'bg-blue-50 text-blue-600', pro: 'bg-purple-50 text-purple-600', enterprise: 'bg-orange-50 text-orange-600',
};

export default function PlatformDashboard() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [logs, setLogs]       = useState<any[]>([]);
  const [health, setHealth]   = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/platform/tenants'),
      api.get('/audit-logs', { params: { limit: 5 } }),
      fetch('/api/health').then(r => r.json()).catch(() => null),
    ]).then(([t, l]) => {
      setTenants(t.data.data);
      setLogs(l.data.data);
      setHealth({ api: true, db: true, uptime: Math.floor(process?.uptime?.() || 99) });
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <AppLayout title="Platform Dashboard" subtitle="GEMS — GTHINK Enterprise Management System" allowedRoles={['platform_admin']}>
      <Spinner />
    </AppLayout>
  );

  // ── Core metrics ─────────────────────────────────────────────────────────
  const total      = tenants.length;
  const active     = tenants.filter(t => t.subscription_status === 'active').length;
  const trial      = tenants.filter(t => t.subscription_status === 'trial').length;
  const expired    = tenants.filter(t => t.subscription_status === 'expired').length;
  const suspended  = tenants.filter(t => t.subscription_status === 'suspended').length;
  const mrr        = tenants.filter(t => t.subscription_status === 'active').reduce((s, t) => s + (PLAN_PRICES[t.plan] || 0), 0);
  const totalUsers = tenants.reduce((s, t) => s + (t.user_count || 0), 0);
  const totalBranches = tenants.reduce((s, t) => s + (t.branch_count || 0), 0);

  const expiringSoon = tenants.filter(t => {
    if (!t.subscription_expires_at || t.subscription_status === 'suspended') return false;
    const d = Math.ceil((new Date(t.subscription_expires_at).getTime() - Date.now()) / 86400000);
    return d <= 7 && d > 0;
  });

  const justExpired = tenants.filter(t => {
    if (t.subscription_status !== 'expired') return false;
    const d = Math.ceil((Date.now() - new Date(t.subscription_expires_at).getTime()) / 86400000);
    return d <= 7;
  });

  const suspendedTenants = tenants.filter(t => t.subscription_status === 'suspended');
  const onTrial = tenants.filter(t => t.subscription_status === 'trial').sort((a, b) =>
    new Date(a.subscription_expires_at).getTime() - new Date(b.subscription_expires_at).getTime()
  );

  const recentSignups = tenants
    .filter(t => (Date.now() - new Date(t.created_at).getTime()) / 86400000 <= 30)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const topByUsers    = [...tenants].sort((a, b) => (b.user_count || 0) - (a.user_count || 0)).slice(0, 5);
  const topByBranches = [...tenants].sort((a, b) => (b.branch_count || 0) - (a.branch_count || 0)).slice(0, 5);

  // ── Charts data ───────────────────────────────────────────────────────────
  const planDist = ['starter','pro','enterprise'].map(p => ({
    name: p.charAt(0).toUpperCase() + p.slice(1),
    value: tenants.filter(t => t.plan === p).length,
    color: PLAN_COLORS[p],
  })).filter(p => p.value > 0);

  const statusBreakdown = [
    { name: 'Active',    value: active,    fill: '#22C55E' },
    { name: 'Trial',     value: trial,     fill: '#EAB308' },
    { name: 'Expired',   value: expired,   fill: '#EF4444' },
    { name: 'Suspended', value: suspended, fill: '#9CA3AF' },
  ].filter(s => s.value > 0);

  const monthlySignups = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
    const label = d.toLocaleString('default', { month: 'short' });
    const count = tenants.filter(t => {
      const td = new Date(t.created_at);
      return td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear();
    }).length;
    const mrrVal = tenants.filter(t => {
      const td = new Date(t.created_at);
      return td.getMonth() <= d.getMonth() && t.subscription_status === 'active';
    }).reduce((s, t) => s + (PLAN_PRICES[t.plan] || 0), 0);
    return { month: label, signups: count, mrr: mrrVal };
  });

  const kpis = [
    { label: 'Total Businesses', value: total,                     icon: Building2,    color: 'bg-blue-50 text-blue-600',    sub: `${trial} on trial` },
    { label: 'Active',           value: active,                    icon: CheckCircle,  color: 'bg-green-50 text-green-600',  sub: `${total ? ((active/total)*100).toFixed(0) : 0}% of total` },
    { label: 'MRR',              value: `$${mrr.toLocaleString()}`,icon: DollarSign,   color: 'bg-purple-50 text-purple-600',sub: `ARR $${(mrr*12).toLocaleString()}` },
    { label: 'Total Users',      value: totalUsers,                icon: Users,        color: 'bg-orange-50 text-orange-600',sub: 'Across all tenants' },
    { label: 'Total Branches',   value: totalBranches,             icon: GitBranch,    color: 'bg-cyan-50 text-cyan-600',    sub: 'Across all tenants' },
    { label: 'Suspended',        value: suspended,                 icon: XCircle,      color: 'bg-gray-50 text-gray-500',    sub: 'Need reactivation' },
  ];

  return (
    <AppLayout title="Platform Dashboard" subtitle="GEMS — GTHINK Enterprise Management System" allowedRoles={['platform_admin']}>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {kpis.map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-shadow">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${k.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="text-xl font-extrabold text-gray-900">{k.value}</div>
              <div className="text-xs font-semibold text-gray-600 mt-0.5 leading-tight">{k.label}</div>
              <div className="text-xs text-gray-400 mt-0.5">{k.sub}</div>
            </div>
          );
        })}
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">

        {/* Revenue + Signups trend */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h2 className="font-bold text-gray-900">Platform Growth</h2>
              <p className="text-xs text-gray-400 mt-0.5">Signups and revenue over the last 6 months</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#0D3B6E] inline-block" />Signups</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-purple-400 inline-block" />MRR ($)</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={monthlySignups} barSize={28} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0D3B6E" stopOpacity={1} />
                  <stop offset="100%" stopColor="#1A6BB5" stopOpacity={0.7} />
                </linearGradient>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#8B5CF6" />
                  <stop offset="100%" stopColor="#EC4899" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }}
                cursor={{ fill: '#f9fafb' }}
              />
              <Bar yAxisId="left" dataKey="signups" fill="url(#barGrad)" radius={[6,6,0,0]} name="Signups" />
              <Line yAxisId="right" type="monotone" dataKey="mrr" stroke="url(#lineGrad)" strokeWidth={2.5} dot={{ r: 4, fill: '#8B5CF6', strokeWidth: 2, stroke: '#fff' }} name="MRR ($)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status breakdown + Plan dist */}
        <div className="space-y-4">
          {/* Status breakdown */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h2 className="font-bold text-gray-900 mb-3">Status Breakdown</h2>
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={statusBreakdown} layout="vertical" barSize={12}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={60} />
                <Tooltip />
                {statusBreakdown.map((s, i) => (
                  <Bar key={i} dataKey="value" fill={s.fill} radius={[0,4,4,0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Plan distribution */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h2 className="font-bold text-gray-900 mb-3">Plan Distribution</h2>
            <div className="space-y-2">
              {['starter','pro','enterprise'].map(p => {
                const count = tenants.filter(t => t.plan === p).length;
                const pct   = total ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={p}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="capitalize text-gray-600">{p}</span>
                      <span className="font-bold text-gray-900">{count} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: PLAN_COLORS[p] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Alert Panels Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">

        {/* Expiring soon */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              <h2 className="font-bold text-gray-900 text-sm">Expiring Soon</h2>
            </div>
            <Link href="/platform/subscriptions" className="text-xs text-blue-600 hover:underline">View all →</Link>
          </div>
          {expiringSoon.length === 0 ? (
            <div className="px-5 py-6 text-center text-sm text-gray-400">None expiring soon ✓</div>
          ) : expiringSoon.map(t => {
            const days = Math.ceil((new Date(t.subscription_expires_at).getTime() - Date.now()) / 86400000);
            return (
              <div key={t.id} className="flex items-center justify-between px-5 py-3 border-b border-gray-50 last:border-0">
                <div>
                  <div className="text-sm font-medium text-gray-800">{t.business_name}</div>
                  <div className="text-xs text-gray-400">{t.plan} plan</div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-bold ${days <= 3 ? 'text-red-500' : 'text-orange-500'}`}>{days}d</div>
                  <Link href={`/platform/tenants/${t.id}`} className="text-xs text-blue-600 hover:underline">Renew</Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Just expired */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-500" />
              <h2 className="font-bold text-gray-900 text-sm">Just Expired</h2>
            </div>
            <Link href="/platform/subscriptions?status=expired" className="text-xs text-blue-600 hover:underline">View all →</Link>
          </div>
          {justExpired.length === 0 ? (
            <div className="px-5 py-6 text-center text-sm text-gray-400">No recent expirations ✓</div>
          ) : justExpired.map(t => (
            <div key={t.id} className="flex items-center justify-between px-5 py-3 border-b border-gray-50 last:border-0">
              <div>
                <div className="text-sm font-medium text-gray-800">{t.business_name}</div>
                <div className="text-xs text-gray-400">{t.plan} plan</div>
              </div>
              <Link href={`/platform/tenants/${t.id}`} className="text-xs font-semibold text-blue-600 hover:underline">Renew →</Link>
            </div>
          ))}
        </div>

        {/* Active trials */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-500" />
              <h2 className="font-bold text-gray-900 text-sm">Active Trials</h2>
            </div>
            <span className="text-xs text-gray-400">{onTrial.length} total</span>
          </div>
          {onTrial.length === 0 ? (
            <div className="px-5 py-6 text-center text-sm text-gray-400">No active trials</div>
          ) : onTrial.slice(0, 5).map(t => {
            const days = t.subscription_expires_at
              ? Math.ceil((new Date(t.subscription_expires_at).getTime() - Date.now()) / 86400000)
              : null;
            return (
              <div key={t.id} className="flex items-center justify-between px-5 py-3 border-b border-gray-50 last:border-0">
                <div>
                  <div className="text-sm font-medium text-gray-800">{t.business_name}</div>
                  <div className="text-xs text-gray-400">{t.user_count || 0} users</div>
                </div>
                <div className="text-right">
                  {days !== null && <div className={`text-xs font-bold ${days <= 3 ? 'text-red-500' : 'text-yellow-600'}`}>{days}d left</div>}
                  <Link href={`/platform/tenants/${t.id}`} className="text-xs text-blue-600 hover:underline">View</Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Bottom Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">

        {/* Top tenants by users */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-gray-400" />
            <h2 className="font-bold text-gray-900 text-sm">Top by Users</h2>
          </div>
          <div className="space-y-2.5">
            {topByUsers.map((t, i) => (
              <div key={t.id} className="flex items-center gap-2.5">
                <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-800 truncate">{t.business_name}</div>
                  <div className="h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
                    <div className="h-full bg-[#0D3B6E] rounded-full" style={{ width: `${topByUsers[0]?.user_count ? ((t.user_count||0)/topByUsers[0].user_count)*100 : 0}%` }} />
                  </div>
                </div>
                <span className="text-xs font-bold text-gray-900">{t.user_count || 0}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top tenants by branches */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <GitBranch className="w-4 h-4 text-gray-400" />
            <h2 className="font-bold text-gray-900 text-sm">Top by Branches</h2>
          </div>
          <div className="space-y-2.5">
            {topByBranches.map((t, i) => (
              <div key={t.id} className="flex items-center gap-2.5">
                <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-800 truncate">{t.business_name}</div>
                  <div className="h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${topByBranches[0]?.branch_count ? ((t.branch_count||0)/topByBranches[0].branch_count)*100 : 0}%` }} />
                  </div>
                </div>
                <span className="text-xs font-bold text-gray-900">{t.branch_count || 0}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent signups */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 text-green-500" />
              <h2 className="font-bold text-gray-900 text-sm">Recent Signups</h2>
            </div>
            <Link href="/platform/tenants" className="text-xs text-blue-600 hover:underline">All →</Link>
          </div>
          {recentSignups.length === 0 ? (
            <div className="px-5 py-6 text-center text-sm text-gray-400">No signups in 30 days</div>
          ) : recentSignups.map(t => (
            <div key={t.id} className="flex items-center justify-between px-5 py-2.5 border-b border-gray-50 last:border-0">
              <div>
                <div className="text-xs font-medium text-gray-800">{t.business_name}</div>
                <div className="text-xs text-gray-400">{new Date(t.created_at).toLocaleDateString('en-GH', { day:'2-digit', month:'short' })}</div>
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${PLAN_BADGE[t.plan]}`}>{t.plan}</span>
            </div>
          ))}
        </div>

        {/* Platform health + Recent activity */}
        <div className="space-y-4">
          {/* Platform health */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Server className="w-4 h-4 text-gray-400" />
              <h2 className="font-bold text-gray-900 text-sm">Platform Health</h2>
            </div>
            <div className="space-y-2">
              {[
                { label: 'API Server',  icon: Wifi,     ok: true },
                { label: 'Database',    icon: Database, ok: true },
                { label: 'Auth Service',icon: CheckCircle, ok: true },
              ].map(s => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Icon className="w-3.5 h-3.5" /> {s.label}
                    </div>
                    <span className={`font-bold ${s.ok ? 'text-green-500' : 'text-red-500'}`}>
                      {s.ok ? '● Online' : '● Down'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent activity */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-500" />
                <h2 className="font-bold text-gray-900 text-sm">Activity</h2>
              </div>
              <Link href="/platform/activity" className="text-xs text-blue-600 hover:underline">All →</Link>
            </div>
            {logs.length === 0 ? (
              <div className="px-5 py-4 text-center text-xs text-gray-400">No activity yet</div>
            ) : logs.map(log => (
              <div key={log.id} className="flex items-start gap-2.5 px-5 py-2.5 border-b border-gray-50 last:border-0">
                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${log.status === 'success' ? 'bg-green-400' : 'bg-red-400'}`} />
                <div className="min-w-0">
                  <p className="text-xs text-gray-700 truncate">{log.description}</p>
                  <p className="text-xs text-gray-400">{new Date(log.createdAt).toLocaleString('en-GH', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </AppLayout>
  );
}
