'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { StatCard, Badge, Spinner } from '@/components/ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Package, ShoppingCart, Users, AlertTriangle, TrendingUp, UserCheck, Truck, ClipboardList, ArrowDown, ArrowUp, RefreshCw, Building2, Wallet, Cake, Award, FileText } from 'lucide-react';
import HrReport from '@/components/hr/HrReport';

const CedisIcon = ({ className }: { className?: string }) => (
  <span className={`font-bold leading-none flex items-center justify-center ${className}`} style={{ fontFamily: 'serif' }}>₵</span>
);
import api, { apiCache } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const fmt = (n: number) => n >= 1000 ? `GH₵ ${(n/1000).toFixed(1)}k` : `GH₵ ${n?.toFixed(2) || '0.00'}`;

const ALL_ROLES = ['super_admin','business_owner','branch_manager','warehouse_staff','accountant','hr_manager','procurement_officer'];

export default function DashboardPage() {
  const { user, tenant } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showHrReport, setShowHrReport] = useState(false);
  const role = user?.role || '';

  const can = (...roles: string[]) => roles.includes(role);
  const isAdmin = can('super_admin', 'business_owner', 'branch_manager');

  useEffect(() => {
    const cached = apiCache.get('/dashboard');
    if (cached) {
      setData(cached);
      setLoading(false);
      if (apiCache.isStale('/dashboard')) {
        api.get('/dashboard').then(r => {
          apiCache.set('/dashboard', r.data.data);
          setData(r.data.data);
        }).catch(console.error);
      }
    } else {
      api.get('/dashboard')
        .then(r => { apiCache.set('/dashboard', r.data.data); setData(r.data.data); })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, []);

  if (loading) return <AppLayout title="Dashboard" allowedRoles={ALL_ROLES}><Spinner /></AppLayout>;

  const kpis = data?.kpis || {};

  const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const payrollTrend = (data?.payroll_trend || []).map((t: any) => ({ label: `${MONTHS_SHORT[t.month - 1]} ${String(t.year).slice(2)}`, total: t.total }));
  const upcomingPeople = [
    ...(data?.upcoming_birthdays || []).map((b: any) => ({ ...b, kind: 'birthday' as const })),
    ...(data?.upcoming_anniversaries || []).map((a: any) => ({ ...a, kind: 'anniversary' as const })),
  ].sort((a, b) => a.days_until - b.days_until);

  // ── WAREHOUSE STAFF — dedicated layout ──────────────────────────────────────
  if (role === 'warehouse_staff') {
    const movements: any[] = data?.recent_movements || [];
    const lowStockItems: any[] = data?.low_stock_items || [];
    const stockTrend: any[] = data?.stock_trend || [];
    const topMoved: any[] = data?.top_moved_products || [];
    const byType: any[] = data?.movements_by_type || [];
    const typeColors: Record<string, string> = {
      sale:       'bg-red-100 text-red-700',
      purchase:   'bg-green-100 text-green-700',
      adjustment: 'bg-[#0D3B6E]/8 text-[#0D3B6E]',
      transfer:   'bg-purple-100 text-purple-700',
    };
    return (
      <AppLayout title="Dashboard" subtitle="Here's your inventory overview." allowedRoles={ALL_ROLES}>
        <div className="min-w-0 max-w-full">

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <StatCard label="Total Products"    value={kpis.total_products ?? '—'} icon={<Package className="w-6 h-6 text-[#0D3B6E]" />}       color="bg-[#0D3B6E]/8" sub="Active SKUs" />
          <StatCard label="Healthy Stock"     value={kpis.healthy_stock  ?? '—'} icon={<Package className="w-6 h-6 text-[#0D3B6E]" />}       color="bg-[#0D3B6E]/8" sub="Above threshold" />
          <StatCard label="Low Stock"         value={kpis.low_stock      ?? '—'} icon={<AlertTriangle className="w-6 h-6 text-amber-500" />}  color="bg-amber-50"    sub="Below threshold" />
          <StatCard label="Out of Stock"      value={kpis.out_of_stock   ?? '—'} icon={<AlertTriangle className="w-6 h-6 text-red-500" />}    color="bg-red-50"      sub="Zero quantity" />
          <StatCard label="Inventory Value"   value={`GH₵ ${(kpis.stock_value || 0).toLocaleString('en-GH', { minimumFractionDigits: 0 })}`} icon={<CedisIcon className="w-6 h-6 text-[#0D3B6E] text-xl" />} color="bg-[#0D3B6E]/8" sub="At cost price" />
          <StatCard label="Pending Deliveries" value={kpis.pending_pos ?? '—'} icon={<Truck className="w-6 h-6 text-[#0D3B6E]" />}           color="bg-[#0D3B6E]/8" sub="POs awaiting receipt" />
        </div>

        {/* ── Stock Health Donut + 7-day Trend ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">

          {/* Stock health breakdown */}
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4">Stock Health Overview</h3>
            <div className="space-y-3">
              {[
                { label: 'Healthy',     value: kpis.healthy_stock  || 0, color: 'bg-green-500',  pct: kpis.total_products ? Math.round(((kpis.healthy_stock  || 0) / kpis.total_products) * 100) : 0 },
                { label: 'Low Stock',   value: kpis.low_stock      || 0, color: 'bg-yellow-400', pct: kpis.total_products ? Math.round(((kpis.low_stock      || 0) / kpis.total_products) * 100) : 0 },
                { label: 'Out of Stock',value: kpis.out_of_stock   || 0, color: 'bg-red-500',    pct: kpis.total_products ? Math.round(((kpis.out_of_stock   || 0) / kpis.total_products) * 100) : 0 },
              ].map(row => (
                <div key={row.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 font-medium">{row.label}</span>
                    <span className="font-bold text-gray-900">{row.value} <span className="text-gray-400 font-normal">({row.pct}%)</span></span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${row.color}`} style={{ width: `${row.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Movement type breakdown */}
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Movements This Month</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {byType.length ? byType.map((t: any) => (
                  <div key={t._id} className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-medium ${typeColors[t._id] || 'bg-gray-100 text-gray-600'}`}>
                    <span className="capitalize shrink-0">{t._id}</span>
                    <span className="font-bold text-right truncate">{t.count} moves · {t.qty} units</span>
                  </div>
                )) : <p className="text-xs text-gray-400 col-span-2">No movements this month</p>}
              </div>
            </div>
          </div>

          {/* 7-day in/out trend chart */}
          <div className="card min-w-0 overflow-hidden">
            <h3 className="font-semibold text-gray-800 mb-4">7-Day Stock Movement Trend</h3>
            {stockTrend.length ? (
              <ResponsiveContainer width="100%" height={220} minWidth={0}>
                <BarChart data={stockTrend} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="in"  name="Stock In"  fill="#22c55e" radius={[3,3,0,0]} />
                  <Bar dataKey="out" name="Stock Out" fill="#ef4444" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-52 flex flex-col items-center justify-center text-gray-400">
                <RefreshCw className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm">No movements in the last 7 days</p>
              </div>
            )}
            <div className="flex items-center gap-4 mt-2 justify-center">
              <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-3 h-3 rounded-sm bg-green-500 inline-block" /> Stock In</span>
              <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-3 h-3 rounded-sm bg-red-500 inline-block" /> Stock Out</span>
            </div>
          </div>
        </div>

        {/* ── Low Stock Alerts + Top Moved Products ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">

          {/* Low Stock Alerts */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Low Stock Alerts</h3>
              <a href="/inventory" className="text-xs text-[#0D3B6E] hover:underline">View all →</a>
            </div>
            {lowStockItems.length ? (
              <div className="space-y-3">
                {lowStockItems.map((p: any) => {
                  const pct = p.low_stock_threshold > 0 ? Math.min(Math.round((p.stock_qty / p.low_stock_threshold) * 100), 100) : 0;
                  const isOut = p.stock_qty === 0;
                  return (
                    <div key={p._id} className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isOut ? 'bg-red-100' : 'bg-yellow-100'}`}>
                        <Package className={`w-4 h-4 ${isOut ? 'text-red-600' : 'text-yellow-600'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-900 truncate">{p.name}</span>
                          <span className={`text-xs font-bold ml-2 flex-shrink-0 ${isOut ? 'text-red-600' : 'text-yellow-600'}`}>{p.stock_qty} / {p.low_stock_threshold}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${isOut ? 'bg-red-500' : 'bg-yellow-400'}`} style={{ width: `${pct}%` }} />
                        </div>
                        {p.sku && <span className="text-xs text-gray-400">SKU: {p.sku}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-10 text-center">
                <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Package className="w-6 h-6 text-green-500" />
                </div>
                <p className="text-sm text-gray-400">All stock levels are healthy</p>
              </div>
            )}
          </div>

          {/* Top Moved Products */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Most Active Products</h3>
              <span className="text-xs text-gray-400">Last 30 days</span>
            </div>
            {topMoved.length ? (
              <div className="space-y-4">
                {topMoved.map((p: any, i: number) => {
                  const maxQty = topMoved[0]?.qty || 1;
                  const pct = Math.round((p.qty / maxQty) * 100);
                  const rankColors = ['bg-yellow-400','bg-gray-300','bg-orange-400'];
                  return (
                    <div key={p._id}>
                      <div className="flex items-center gap-3 mb-1">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${i < 3 ? rankColors[i] : 'bg-gray-200 !text-gray-500'}`}>{i + 1}</div>
                        <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-gray-900 truncate">{p.name}</span>
                          <span className="text-xs text-gray-500 flex-shrink-0">{p.qty} units · {p.moves} moves</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-6 flex-shrink-0" />
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-[#0D3B6E] rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className={`text-xs flex-shrink-0 font-medium px-2 py-0.5 rounded-full ${p.stock_qty === 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                          {p.stock_qty} in stock
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : <p className="text-gray-400 text-sm text-center py-8">No movement data yet</p>}
          </div>
        </div>

        {/* ── Recent Movements + Quick Actions ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Recent Stock Movements</h3>
              <a href="/inventory" className="text-xs text-[#0D3B6E] hover:underline">Inventory →</a>
            </div>
            {movements.length ? (
              <div className="space-y-2">
                {movements.map((m: any) => {
                  const isIn = m.quantity > 0;
                  return (
                    <div key={m._id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isIn ? 'bg-green-50' : 'bg-red-50'}`}>
                        {isIn ? <ArrowDown className="w-4 h-4 text-green-600" /> : <ArrowUp className="w-4 h-4 text-red-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{m.product_name}</div>
                        <div className="text-xs text-gray-400 capitalize">{m.type} · {m.reference}</div>
                      </div>
                      <div className={`text-sm font-bold flex-shrink-0 ${isIn ? 'text-green-600' : 'text-red-500'}`}>
                        {isIn ? '+' : ''}{m.quantity}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : <p className="text-gray-400 text-sm text-center py-8">No stock movements yet</p>}
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              {[
                { label: 'View Inventory',  href: '/inventory',   icon: <Package className="w-5 h-5" /> },
                { label: 'Adjust Stock',    href: '/inventory',   icon: <RefreshCw className="w-5 h-5" /> },
                { label: 'Low Stock Items', href: '/inventory',   icon: <AlertTriangle className="w-5 h-5" /> },
                { label: 'Receive Goods',   href: '/procurement', icon: <Truck className="w-5 h-5" /> },
              ].map(a => (
                <a key={a.label} href={a.href} className="flex flex-col items-center gap-2 px-4 py-5 rounded-xl text-sm font-medium text-center bg-[#0D3B6E]/8 text-[#0D3B6E] hover:bg-[#0D3B6E]/15 transition-colors">
                  {a.icon}{a.label}
                </a>
              ))}
            </div>
          </div>
        </div>
        </div>

      </AppLayout>
    );
  }
  // ────────────────────────────────────────────────────────────────────────────

  const subtitle: Record<string, string> = {
    super_admin:          "Here's your full business overview.",
    business_owner:       "Here's your full business overview.",
    branch_manager:       "Here's your branch overview.",
    sales_staff:          "Here's your sales overview.",
    warehouse_staff:      "Here's your inventory overview.",
    accountant:           "Here's your finance overview.",
    hr_manager:           "Here's your HR overview.",
    procurement_officer:  "Here's your procurement overview.",
  };

  return (
    <AppLayout title="Dashboard" subtitle={subtitle[role] || "Welcome back!"} allowedRoles={ALL_ROLES}>
      <div className="min-w-0 max-w-full space-y-0">

      {/* ── ROW 1: KPIs visible to admin + relevant roles ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">

        {/* Revenue — admin, sales (accountant has own dashboard) */}
        {can('super_admin','business_owner','branch_manager','sales_staff') && (
          <StatCard label="Total Revenue" value={fmt(kpis.total_revenue)} icon={<CedisIcon className="w-6 h-6 text-[#0D3B6E] text-xl" />} color="bg-[#0D3B6E]/8" sub="All time paid orders" />
        )}

        {can('super_admin','business_owner','branch_manager','sales_staff') && (
          <StatCard label="Total Orders" value={kpis.total_orders} icon={<ShoppingCart className="w-6 h-6 text-[#0D3B6E]" />} color="bg-[#0D3B6E]/8" sub="Paid orders" />
        )}

        {can('super_admin','business_owner','branch_manager','warehouse_staff') && (
          <StatCard label="Products" value={kpis.total_products} icon={<Package className="w-6 h-6 text-[#0D3B6E]" />} color="bg-[#0D3B6E]/8" sub={`${kpis.low_stock_items} low stock`} />
        )}

        {can('super_admin','business_owner','branch_manager','sales_staff') && (
          <StatCard label="Customers" value={kpis.total_customers} icon={<UserCheck className="w-6 h-6 text-[#0D3B6E]" />} color="bg-[#0D3B6E]/8" sub={`${kpis.active_leads} active leads`} />
        )}

        {can('super_admin','business_owner','branch_manager','hr_manager') && (
          <StatCard label="Employees" value={kpis.total_employees} icon={<Users className="w-6 h-6 text-[#0D3B6E]" />} color="bg-[#0D3B6E]/8" sub="Active staff" />
        )}

        {can('super_admin','business_owner','branch_manager') && (
          <StatCard label="Monthly Expenses" value={fmt(kpis.monthly_expenses)} icon={<CedisIcon className="w-6 h-6 text-red-500 text-xl" />} color="bg-red-50" sub="This month" />
        )}

        {can('super_admin','business_owner','branch_manager','sales_staff') && (
          <StatCard label="Active Leads" value={kpis.active_leads} icon={<TrendingUp className="w-6 h-6 text-[#0D3B6E]" />} color="bg-[#0D3B6E]/8" sub="In pipeline" />
        )}

        {can('super_admin','business_owner','branch_manager','warehouse_staff') && (
          <StatCard label="Low Stock Alerts" value={kpis.low_stock_items} icon={<AlertTriangle className="w-6 h-6 text-amber-500" />} color="bg-amber-50" sub="Need reorder" />
        )}

        {can('procurement_officer') && (
          <>
            <StatCard label="Total POs"       value={kpis.total_pos       ?? '—'} icon={<ClipboardList className="w-6 h-6 text-[#0D3B6E]" />}  color="bg-[#0D3B6E]/8" sub="All purchase orders" />
            <StatCard label="Pending Action"  value={kpis.pending_pos     ?? '—'} icon={<AlertTriangle className="w-6 h-6 text-amber-500" />} color="bg-amber-50"    sub="Draft, approved & sent" />
            <StatCard label="Active Suppliers" value={kpis.total_suppliers ?? '—'} icon={<Building2 className="w-6 h-6 text-[#0D3B6E]" />}    color="bg-[#0D3B6E]/8" sub="Registered suppliers" />
            <StatCard label="Total Spend"     value={fmt(kpis.total_spend || 0)}   icon={<CedisIcon className="w-6 h-6 text-[#0D3B6E] text-xl" />} color="bg-[#0D3B6E]/8" sub="Completed POs" />
          </>
        )}

        {/* On Leave/Pending Leave/Outstanding Loans — Employees is already shown above for these roles */}
        {can('business_owner', 'hr_manager') && (
          <>
            <StatCard label="On Leave"        value={kpis.on_leave        ?? '—'} icon={<AlertTriangle className="w-6 h-6 text-amber-500" />} color="bg-amber-50"    sub="Currently away" />
            <StatCard label="Pending Leave"   value={kpis.pending_leave   ?? '—'} icon={<AlertTriangle className="w-6 h-6 text-red-500" />}   color="bg-red-50"     sub="Awaiting approval" />
            <StatCard label="Outstanding Loans" value={fmt(data?.outstanding_loans_total || 0)} icon={<Wallet className="w-6 h-6 text-[#0D3B6E]" />} color="bg-[#0D3B6E]/8" sub={`${data?.outstanding_loans_count ?? 0} active`} />
          </>
        )}
      </div>

      {/* ── ACCOUNTANT DASHBOARD ── */}
      {can('accountant') && (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <StatCard label="Total Revenue"    value={fmt(data?.kpis?.total_revenue  || 0)} icon={<CedisIcon className="w-6 h-6 text-[#0D3B6E] text-xl" />} color="bg-[#0D3B6E]/8" sub="All paid orders" />
            <StatCard label="Total Expenses"   value={fmt(data?.kpis?.total_expenses || 0)} icon={<CedisIcon className="w-6 h-6 text-red-500 text-xl" />}     color="bg-red-50"      sub="All time" />
            <StatCard label="Net Profit"        value={fmt(data?.kpis?.net_profit     || 0)} icon={<TrendingUp className="w-6 h-6 text-[#0D3B6E]" />}           color="bg-[#0D3B6E]/8" sub="Revenue minus expenses" />
            <StatCard label="This Month Spend" value={fmt(data?.kpis?.month_expenses || 0)} icon={<CedisIcon className="w-6 h-6 text-amber-500 text-xl" />}    color="bg-amber-50"    sub="Current month" />
          </div>

          {/* Revenue chart + Expenses by category */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
            <div className="card min-w-0 overflow-hidden">
              <h3 className="font-semibold text-gray-800 mb-4">Revenue — Last 6 Months</h3>
              {data?.monthly_revenue?.length ? (
                <ResponsiveContainer width="100%" height={200} minWidth={0}>
                  <BarChart data={data.monthly_revenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: any) => [`GH₵ ${Number(v).toLocaleString()}`, 'Revenue']} />
                    <Bar dataKey="revenue" fill="#1A6BB5" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No revenue data yet</div>}
            </div>

            <div className="card">
              <h3 className="font-semibold text-gray-800 mb-4">Expenses by Category</h3>
              {data?.expenses_by_category?.length ? (() => {
                const max = Math.max(...data.expenses_by_category.map((c: any) => c.total));
                const total = data.expenses_by_category.reduce((s: number, c: any) => s + c.total, 0);
                return (
                  <div className="space-y-3">
                    {data.expenses_by_category.map((c: any) => {
                      const pct = max > 0 ? Math.round((c.total / max) * 100) : 0;
                      const share = total > 0 ? ((c.total / total) * 100).toFixed(1) : '0';
                      return (
                        <div key={c.category}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-700 font-medium">{c.category}</span>
                            <span className="text-gray-900 font-semibold">{fmt(c.total)} <span className="text-gray-400 font-normal text-xs">({share}%)</span></span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-[#0D3B6E] rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })() : <p className="text-gray-400 text-sm text-center py-8">No expense data yet</p>}
            </div>
          </div>

          {/* Recent expenses + Quick links */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800">Recent Expenses</h3>
                <a href="/accounting/expenses" className="text-xs text-[#0D3B6E] hover:underline">View all →</a>
              </div>
              {data?.recent_expenses?.length ? (
                <div className="space-y-2">
                  {data.recent_expenses.map((e: any, i: number) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{e.title}</div>
                        <div className="text-xs text-gray-400">{e.category || 'Uncategorized'} · {new Date(e.expense_date).toLocaleDateString()}</div>
                      </div>
                      <span className="text-sm font-semibold text-red-600">GH₵ {parseFloat(e.amount).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-gray-400 text-sm text-center py-8">No expenses recorded</p>}
            </div>

            <div className="card">
              <h3 className="font-semibold text-gray-800 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Record Expense', href: '/accounting/expenses' },
                  { label: 'Journal Entry',  href: '/accounting/journal' },
                  { label: 'Balance Sheet',  href: '/accounting/bs' },
                  { label: 'P&L Report',     href: '/accounting/pl' },
                  { label: 'Trial Balance',  href: '/accounting/trial-balance' },
                  { label: 'Approvals',      href: '/approvals' },
                ].map(a => (
                  <a key={a.label} href={a.href} className="flex items-center justify-between px-3 py-3 rounded-xl text-sm font-medium bg-[#0D3B6E]/8 text-[#0D3B6E] hover:bg-[#0D3B6E]/15 transition-colors">
                    {a.label} <span className="text-xs">→</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── CHARTS — admin, sales only (not accountant — has own section above) ── */}
      {can('super_admin','business_owner','branch_manager','sales_staff') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
          <div className="card min-w-0 overflow-hidden">
            <h3 className="font-semibold text-gray-800 mb-4">Monthly Revenue</h3>
            {data?.monthly_sales?.length ? (
              <ResponsiveContainer width="100%" height={200} minWidth={0}>
                <BarChart data={data.monthly_sales}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => [`GH₵ ${Number(v).toFixed(2)}`, 'Revenue']} />
                  <Bar dataKey="revenue" fill="#1A6BB5" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No sales data yet</div>}
          </div>

          <div className="card min-w-0 overflow-hidden">
            <h3 className="font-semibold text-gray-800 mb-4">Order Volume</h3>
            {data?.monthly_sales?.length ? (
              <ResponsiveContainer width="100%" height={200} minWidth={0}>
                <LineChart data={data.monthly_sales}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="orders" stroke="#0D3B6E" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No order data yet</div>}
          </div>
        </div>
      )}

      {/* ── BOTTOM SECTION ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">

        {/* Recent Orders — admin, sales, procurement */}
        {can('super_admin','business_owner','branch_manager','sales_staff','procurement_officer') && (
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4">Recent Orders</h3>
            {data?.recent_orders?.length ? (
              <div className="space-y-3">
                {data.recent_orders.map((o: any) => (
                  <div key={o.id} className="flex items-center justify-between gap-3 py-2 border-b border-gray-50 last:border-0 min-w-0">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{o.order_number}</div>
                      <div className="text-xs text-gray-500 truncate">{o.customer_name}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-semibold text-gray-900">GH₵ {parseFloat(o.total).toFixed(2)}</div>
                      <Badge status={o.payment_status} />
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-gray-400 text-sm text-center py-8">No orders yet</p>}
          </div>
        )}

        {/* Top Products — admin, sales, warehouse */}
        {can('super_admin','business_owner','branch_manager','sales_staff','warehouse_staff') && (
          <div className="card">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-gray-800">Top Selling Products</h3>
              <span className="text-xs text-gray-400">by revenue</span>
            </div>
            {data?.top_products?.length ? (() => {
              const maxRev = Math.max(...data.top_products.map((p: any) => parseFloat(p.revenue)));
              const rankColors = ['bg-yellow-400', 'bg-gray-300', 'bg-orange-400'];
              return (
                <div className="space-y-4">
                  {data.top_products.map((p: any, i: number) => {
                    const pct = Math.round((parseFloat(p.revenue) / maxRev) * 100);
                    return (
                      <div key={i}>
                        <div className="flex items-center gap-3 mb-1.5">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white ${
                            i < 3 ? rankColors[i] : 'bg-gray-200 !text-gray-500'
                          }`}>{i + 1}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium text-gray-900 truncate">{p.name}</span>
                              <span className="text-sm font-bold text-gray-900 flex-shrink-0">GH₵ {Number(p.revenue).toLocaleString('en-GH', { minimumFractionDigits: 0 })}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-6 flex-shrink-0" />
                          <div className="flex-1 flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-[#0D3B6E] rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-gray-400 flex-shrink-0 w-16 text-right">{p.units_sold} units</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })() : <p className="text-gray-400 text-sm text-center py-8">No sales data yet</p>}
          </div>
        )}

        {/* HR: recent leave requests + quick actions */}
        {can('business_owner', 'hr_manager') && (
          <>
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800">Recent Leave Requests</h3>
                <a href="/hr/employees" className="text-xs text-[#0D3B6E] hover:underline">View all →</a>
              </div>
              {data?.recent_leave?.length ? (
                <div className="space-y-2">
                  {data.recent_leave.map((l: any) => (
                    <div key={l._id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{l.employee_name}</div>
                        <div className="text-xs text-gray-400 capitalize">{l.leave_type} · {new Date(l.start_date).toLocaleDateString()} – {new Date(l.end_date).toLocaleDateString()}</div>
                      </div>
                      <Badge status={l.status} />
                    </div>
                  ))}
                </div>
              ) : <p className="text-gray-400 text-sm text-center py-8">No leave requests yet</p>}
            </div>
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800">Quick Actions</h3>
                <div className="text-right">
                  <div className="text-lg font-extrabold text-gray-900">{fmt(kpis.month_payroll || 0)}</div>
                  <div className="text-xs text-gray-400">Payroll this month</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Manage Employees', href: '/hr/employees',  icon: <Users className="w-5 h-5" /> },
                  { label: 'Leave Requests',   href: '/hr/leave',      icon: <ClipboardList className="w-5 h-5" /> },
                  { label: 'Run Payroll',      href: '/hr/payroll',    icon: <CedisIcon className="w-5 h-5 text-lg" /> },
                  { label: 'Mark Attendance',  href: '/hr/attendance', icon: <UserCheck className="w-5 h-5" /> },
                ].map(a => (
                  <a key={a.label} href={a.href} className="flex flex-col items-center gap-2 px-4 py-5 rounded-xl text-sm font-medium text-center bg-[#0D3B6E]/8 text-[#0D3B6E] hover:bg-[#0D3B6E]/15 transition-colors">
                    {a.icon}{a.label}
                  </a>
                ))}
                <button onClick={() => setShowHrReport(true)} className="flex flex-col items-center gap-2 px-4 py-5 rounded-xl text-sm font-medium text-center bg-[#0D3B6E]/8 text-[#0D3B6E] hover:bg-[#0D3B6E]/15 transition-colors">
                  <FileText className="w-5 h-5" />Generate HR Report
                </button>
              </div>
            </div>

            <div className="card">
              <h3 className="font-semibold text-gray-800 mb-4">Payroll Trend</h3>
              {payrollTrend.length ? (
                <ResponsiveContainer width="100%" height={200} minWidth={0}>
                  <BarChart data={payrollTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: any) => [`GH₵ ${Number(v).toLocaleString()}`, 'Net pay']} />
                    <Bar dataKey="total" fill="#0D3B6E" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-gray-400 text-sm text-center py-8">No approved payroll runs yet</p>}
            </div>

            <div className="card">
              <h3 className="font-semibold text-gray-800 mb-4">Headcount by Department</h3>
              {data?.department_breakdown?.length ? (
                <ResponsiveContainer width="100%" height={200} minWidth={0}>
                  <BarChart data={data.department_breakdown} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis dataKey="department" type="category" tick={{ fontSize: 11 }} width={100} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#0D3B6E" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-gray-400 text-sm text-center py-8">No active employees yet</p>}
            </div>

            <div className="card">
              <h3 className="font-semibold text-gray-800 mb-4">Workforce Mix</h3>
              {data?.employment_type_breakdown?.length ? (
                <div className="space-y-3">
                  {data.employment_type_breakdown.map((t: any) => {
                    const pct = kpis.total_employees ? Math.round((t.count / kpis.total_employees) * 100) : 0;
                    return (
                      <div key={t.type}>
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="text-gray-600 font-medium capitalize">{t.type.replace(/_/g, ' ')}</span>
                          <span className="font-semibold text-gray-900 tabular-nums">{t.count} <span className="text-gray-400 font-normal">({pct}%)</span></span>
                        </div>
                        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-[#0D3B6E]" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : <p className="text-gray-400 text-sm text-center py-8">No active employees yet</p>}
            </div>

            <div className="card">
              <h3 className="font-semibold text-gray-800 mb-4">Upcoming Birthdays & Anniversaries</h3>
              {upcomingPeople.length ? (
                <div className="space-y-2">
                  {upcomingPeople.map((p: any, i: number) => (
                    <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-2 min-w-0">
                        {p.kind === 'birthday'
                          ? <Cake className="w-4 h-4 text-[#0D3B6E] flex-shrink-0" />
                          : <Award className="w-4 h-4 text-[#0D3B6E] flex-shrink-0" />}
                        <span className="text-sm text-gray-700 truncate">
                          {p.name} {p.kind === 'anniversary' ? `— ${p.years}-year anniversary` : '— Birthday'}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">{p.days_until === 0 ? 'Today' : `in ${p.days_until}d`}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-gray-400 text-sm text-center py-8">Nothing in the next 30 days</p>}
            </div>
          </>
        )}



        {/* Procurement: recent POs + quick actions */}
        {can('procurement_officer') && (
          <>
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800">Recent Purchase Orders</h3>
                <a href="/procurement" className="text-xs text-[#0D3B6E] hover:underline">View all →</a>
              </div>
              {data?.recent_pos?.length ? (
                <div className="space-y-2">
                  {data.recent_pos.map((po: any) => (
                    <div key={po.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div>
                        <div className="text-sm font-medium text-gray-900 font-mono">{po.po_number}</div>
                        <div className="text-xs text-gray-400">{po.supplier_name}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-gray-900">GH₵ {parseFloat(po.total_cost || 0).toFixed(2)}</div>
                        <Badge status={po.status} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-gray-400 text-sm text-center py-8">No purchase orders yet</p>}
            </div>
            <div className="card">
              <h3 className="font-semibold text-gray-800 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'New Purchase Order', href: '/procurement', icon: <ClipboardList className="w-5 h-5" /> },
                  { label: 'View Suppliers',     href: '/procurement', icon: <Building2 className="w-5 h-5" /> },
                  { label: 'Receive Goods',      href: '/procurement', icon: <Truck className="w-5 h-5" /> },
                  { label: 'Pending Approvals',  href: '/procurement', icon: <AlertTriangle className="w-5 h-5" /> },
                ].map(a => (
                  <a key={a.label} href={a.href} className="flex flex-col items-center gap-2 px-4 py-5 rounded-xl text-sm font-medium text-center bg-[#0D3B6E]/8 text-[#0D3B6E] hover:bg-[#0D3B6E]/15 transition-colors">
                    {a.icon}{a.label}
                  </a>
                ))}
              </div>
            </div>
          </>
        )}

      </div>
      </div>

      {showHrReport && (
        <HrReport businessName={tenant?.business_name} onClose={() => setShowHrReport(false)} />
      )}
    </AppLayout>
  );
}
