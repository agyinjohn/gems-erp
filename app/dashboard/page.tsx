'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { StatCard, Badge, Spinner } from '@/components/ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Package, ShoppingCart, Users, DollarSign, AlertTriangle, TrendingUp, UserCheck, Receipt, Truck, ClipboardList, ArrowDown, ArrowUp, RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';

const fmt = (n: number) => n >= 1000 ? `GHS ${(n/1000).toFixed(1)}k` : `GHS ${n?.toFixed(2) || '0.00'}`;

const ALL_ROLES = ['super_admin','business_owner','branch_manager','warehouse_staff','accountant','hr_manager','procurement_officer'];

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const role = user?.role || '';

  const can = (...roles: string[]) => roles.includes(role);
  const isAdmin = can('super_admin', 'business_owner', 'branch_manager');

  useEffect(() => {
    api.get('/dashboard').then(r => setData(r.data.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <AppLayout title="Dashboard" allowedRoles={ALL_ROLES}><Spinner /></AppLayout>;

  const kpis = data?.kpis || {};

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
      adjustment: 'bg-blue-100 text-blue-700',
      transfer:   'bg-purple-100 text-purple-700',
    };
    return (
      <AppLayout title="Dashboard" subtitle="Here's your inventory overview." allowedRoles={ALL_ROLES}>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <StatCard label="Total Products"  value={kpis.total_products ?? '—'} icon={<Package className="w-6 h-6 text-blue-600" />}        color="bg-blue-50"   sub="Active SKUs" />
          <StatCard label="Healthy Stock"   value={kpis.healthy_stock  ?? '—'} icon={<Package className="w-6 h-6 text-green-600" />}       color="bg-green-50"  sub="Above threshold" />
          <StatCard label="Low Stock"        value={kpis.low_stock      ?? '—'} icon={<AlertTriangle className="w-6 h-6 text-yellow-600" />} color="bg-yellow-50" sub="Below threshold" />
          <StatCard label="Out of Stock"     value={kpis.out_of_stock   ?? '—'} icon={<Package className="w-6 h-6 text-red-600" />}         color="bg-red-50"    sub="Zero quantity" />
          <StatCard label="Inventory Value"  value={`GHS ${(kpis.stock_value || 0).toLocaleString('en-GH', { minimumFractionDigits: 0 })}`} icon={<DollarSign className="w-6 h-6 text-indigo-600" />} color="bg-indigo-50" sub="At cost price" />
          <StatCard label="Pending Deliveries" value={kpis.pending_pos ?? '—'} icon={<Truck className="w-6 h-6 text-cyan-600" />}          color="bg-cyan-50"   sub="POs awaiting receipt" />
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
              <div className="grid grid-cols-2 gap-2">
                {byType.length ? byType.map((t: any) => (
                  <div key={t._id} className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium ${typeColors[t._id] || 'bg-gray-100 text-gray-600'}`}>
                    <span className="capitalize">{t._id}</span>
                    <span className="font-bold">{t.count} moves · {t.qty} units</span>
                  </div>
                )) : <p className="text-xs text-gray-400 col-span-2">No movements this month</p>}
              </div>
            </div>
          </div>

          {/* 7-day in/out trend chart */}
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4">7-Day Stock Movement Trend</h3>
            {stockTrend.length ? (
              <ResponsiveContainer width="100%" height={220}>
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
              <a href="/inventory" className="text-xs text-blue-600 hover:underline">View all →</a>
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
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
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
              <a href="/inventory" className="text-xs text-blue-600 hover:underline">Inventory →</a>
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
                { label: 'View Inventory',    href: '/inventory',   color: 'bg-blue-50 text-blue-700',    icon: <Package className="w-5 h-5" /> },
                { label: 'Adjust Stock',      href: '/inventory',   color: 'bg-yellow-50 text-yellow-700', icon: <RefreshCw className="w-5 h-5" /> },
                { label: 'Low Stock Items',   href: '/inventory',   color: 'bg-red-50 text-red-700',      icon: <AlertTriangle className="w-5 h-5" /> },
                { label: 'Receive Goods',     href: '/procurement', color: 'bg-green-50 text-green-700',  icon: <Truck className="w-5 h-5" /> },
              ].map(a => (
                <a key={a.label} href={a.href} className={`flex flex-col items-center gap-2 px-4 py-5 rounded-xl text-sm font-medium text-center ${a.color} hover:opacity-80 transition-opacity`}>
                  {a.icon}{a.label}
                </a>
              ))}
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

      {/* ── ROW 1: KPIs visible to admin + relevant roles ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">

        {/* Revenue — admin, accountant, sales */}
        {can('super_admin','business_owner','branch_manager','accountant','sales_staff') && (
          <StatCard label="Total Revenue" value={fmt(kpis.total_revenue)} icon={<DollarSign className="w-6 h-6 text-green-600" />} color="bg-green-50" sub="All time paid orders" />
        )}

        {/* Orders — admin, sales */}
        {can('super_admin','business_owner','branch_manager','sales_staff') && (
          <StatCard label="Total Orders" value={kpis.total_orders} icon={<ShoppingCart className="w-6 h-6 text-blue-600" />} color="bg-blue-50" sub="Paid orders" />
        )}

        {/* Products — admin, warehouse */}
        {can('super_admin','business_owner','branch_manager','warehouse_staff') && (
          <StatCard label="Products" value={kpis.total_products} icon={<Package className="w-6 h-6 text-purple-600" />} color="bg-purple-50" sub={`${kpis.low_stock_items} low stock`} />
        )}

        {/* Customers — admin, sales */}
        {can('super_admin','business_owner','branch_manager','sales_staff') && (
          <StatCard label="Customers" value={kpis.total_customers} icon={<UserCheck className="w-6 h-6 text-orange-600" />} color="bg-orange-50" sub={`${kpis.active_leads} active leads`} />
        )}

        {/* Employees — admin, hr */}
        {can('super_admin','business_owner','branch_manager','hr_manager') && (
          <StatCard label="Employees" value={kpis.total_employees} icon={<Users className="w-6 h-6 text-indigo-600" />} color="bg-indigo-50" sub="Active staff" />
        )}

        {/* Monthly Expenses — admin, accountant */}
        {can('super_admin','business_owner','branch_manager','accountant') && (
          <StatCard label="Monthly Expenses" value={fmt(kpis.monthly_expenses)} icon={<Receipt className="w-6 h-6 text-red-600" />} color="bg-red-50" sub="This month" />
        )}

        {/* Active Leads — admin, sales */}
        {can('super_admin','business_owner','branch_manager','sales_staff') && (
          <StatCard label="Active Leads" value={kpis.active_leads} icon={<TrendingUp className="w-6 h-6 text-teal-600" />} color="bg-teal-50" sub="In pipeline" />
        )}

        {/* Low Stock — admin, warehouse */}
        {can('super_admin','business_owner','branch_manager','warehouse_staff') && (
          <StatCard label="Low Stock Alerts" value={kpis.low_stock_items} icon={<AlertTriangle className="w-6 h-6 text-yellow-600" />} color="bg-yellow-50" sub="Need reorder" />
        )}

        {/* Procurement KPIs */}
        {can('procurement_officer') && (
          <>
            <StatCard label="Total Orders" value={kpis.total_orders} icon={<ShoppingCart className="w-6 h-6 text-blue-600" />} color="bg-blue-50" sub="Paid orders" />
            <StatCard label="Products" value={kpis.total_products} icon={<Package className="w-6 h-6 text-purple-600" />} color="bg-purple-50" sub="Active products" />
            <StatCard label="Low Stock" value={kpis.low_stock_items} icon={<AlertTriangle className="w-6 h-6 text-yellow-600" />} color="bg-yellow-50" sub="Need reorder" />
            <StatCard label="Monthly Expenses" value={fmt(kpis.monthly_expenses)} icon={<Truck className="w-6 h-6 text-cyan-600" />} color="bg-cyan-50" sub="This month" />
          </>
        )}

        {/* HR-only KPIs */}
        {can('hr_manager') && (
          <>
            <StatCard label="Active Leads" value={kpis.active_leads} icon={<ClipboardList className="w-6 h-6 text-teal-600" />} color="bg-teal-50" sub="In pipeline" />
            <StatCard label="Monthly Expenses" value={fmt(kpis.monthly_expenses)} icon={<Receipt className="w-6 h-6 text-red-600" />} color="bg-red-50" sub="This month" />
          </>
        )}
      </div>

      {/* ── CHARTS — admin, sales, accountant ── */}
      {can('super_admin','business_owner','branch_manager','sales_staff','accountant') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4">Monthly Revenue</h3>
            {data?.monthly_sales?.length ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.monthly_sales}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => [`GHS ${Number(v).toFixed(2)}`, 'Revenue']} />
                  <Bar dataKey="revenue" fill="#1A6BB5" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No sales data yet</div>}
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4">Order Volume</h3>
            {data?.monthly_sales?.length ? (
              <ResponsiveContainer width="100%" height={200}>
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
                  <div key={o.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{o.order_number}</div>
                      <div className="text-xs text-gray-500">{o.customer_name}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900">GHS {parseFloat(o.total).toFixed(2)}</div>
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
                              <span className="text-sm font-bold text-gray-900 flex-shrink-0">GHS {Number(p.revenue).toLocaleString('en-GH', { minimumFractionDigits: 0 })}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-6 flex-shrink-0" />
                          <div className="flex-1 flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
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

        {/* HR: show a welcome card for hr_manager with quick links */}
        {can('hr_manager') && (
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              {[
                { label: 'Manage Employees', href: '/hr', color: 'bg-indigo-50 text-indigo-700' },
                { label: 'Review Leave Requests', href: '/hr', color: 'bg-yellow-50 text-yellow-700' },
                { label: 'Run Payroll', href: '/hr', color: 'bg-green-50 text-green-700' },
                { label: 'Mark Attendance', href: '/hr', color: 'bg-blue-50 text-blue-700' },
              ].map(a => (
                <a key={a.label} href={a.href} className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium ${a.color} hover:opacity-80 transition-opacity`}>
                  {a.label} <span>→</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Accountant: recent expenses */}
        {can('accountant') && (
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              {[
                { label: 'View Expenses', href: '/accounting', color: 'bg-red-50 text-red-700' },
                { label: 'Journal Entries', href: '/accounting', color: 'bg-purple-50 text-purple-700' },
                { label: 'Balance Sheet', href: '/accounting', color: 'bg-green-50 text-green-700' },
                { label: 'P&L Report', href: '/reports', color: 'bg-blue-50 text-blue-700' },
              ].map(a => (
                <a key={a.label} href={a.href} className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium ${a.color} hover:opacity-80 transition-opacity`}>
                  {a.label} <span>→</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Procurement: quick actions */}
        {can('procurement_officer') && (
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              {[
                { label: 'Create Purchase Order', href: '/procurement', color: 'bg-blue-50 text-blue-700' },
                { label: 'View Suppliers', href: '/procurement', color: 'bg-cyan-50 text-cyan-700' },
                { label: 'Pending Approvals', href: '/procurement', color: 'bg-yellow-50 text-yellow-700' },
                { label: 'Receive Goods', href: '/procurement', color: 'bg-green-50 text-green-700' },
              ].map(a => (
                <a key={a.label} href={a.href} className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium ${a.color} hover:opacity-80 transition-opacity`}>
                  {a.label} <span>→</span>
                </a>
              ))}
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
