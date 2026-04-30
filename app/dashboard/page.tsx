'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { StatCard, Badge, Spinner } from '@/components/ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Package, ShoppingCart, Users, DollarSign, AlertTriangle, TrendingUp, UserCheck, Receipt } from 'lucide-react';
import api from '@/lib/api';

const fmt = (n: number) => n >= 1000 ? `GHS ${(n/1000).toFixed(1)}k` : `GHS ${n?.toFixed(2) || '0.00'}`;

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard').then(r => setData(r.data.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <AppLayout title="Dashboard" allowedRoles={['business_owner','branch_manager','sales_staff','warehouse_staff','accountant','hr_manager','procurement_officer']}><Spinner /></AppLayout>;

  const kpis = data?.kpis || {};

  return (
    <AppLayout title="Dashboard" subtitle="Welcome back! Here's your business overview." allowedRoles={['business_owner','branch_manager','sales_staff','warehouse_staff','accountant','hr_manager','procurement_officer']}>
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Revenue" value={fmt(kpis.total_revenue)} icon={<DollarSign className="w-6 h-6 text-green-600" />} color="bg-green-50" sub="All time paid orders" />
        <StatCard label="Total Orders" value={kpis.total_orders} icon={<ShoppingCart className="w-6 h-6 text-blue-600" />} color="bg-blue-50" sub="Paid orders" />
        <StatCard label="Products" value={kpis.total_products} icon={<Package className="w-6 h-6 text-purple-600" />} color="bg-purple-50" sub={`${kpis.low_stock_items} low stock`} />
        <StatCard label="Customers" value={kpis.total_customers} icon={<UserCheck className="w-6 h-6 text-orange-600" />} color="bg-orange-50" sub={`${kpis.active_leads} active leads`} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Employees" value={kpis.total_employees} icon={<Users className="w-6 h-6 text-indigo-600" />} color="bg-indigo-50" sub="Active staff" />
        <StatCard label="Monthly Expenses" value={fmt(kpis.monthly_expenses)} icon={<Receipt className="w-6 h-6 text-red-600" />} color="bg-red-50" sub="This month" />
        <StatCard label="Active Leads" value={kpis.active_leads} icon={<TrendingUp className="w-6 h-6 text-teal-600" />} color="bg-teal-50" sub="In pipeline" />
        <StatCard label="Low Stock Alerts" value={kpis.low_stock_items} icon={<AlertTriangle className="w-6 h-6 text-yellow-600" />} color="bg-yellow-50" sub="Need reorder" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
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

      {/* Bottom section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
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

        {/* Top Products */}
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
      </div>
    </AppLayout>
  );
}
