'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Spinner } from '@/components/ui';
import api from '@/lib/api';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import {
  TrendingUp, TrendingDown, ShoppingCart, CreditCard, Package,
  AlertTriangle, RefreshCw, ChevronLeft, ChevronRight, Minus,
} from 'lucide-react';

const fmt = (n: number) => `GH₵ ${(n || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (n: number | null) => n === null ? null : `${n > 0 ? '+' : ''}${n}%`;

const SOURCE_LABEL: Record<string, string> = { storefront: 'Storefront', internal: 'Internal', pos: 'POS', service_request: 'Service' };
const METHOD_LABEL: Record<string, string> = { cash: 'Cash', mobile_money: 'MoMo', card: 'Card', paystack: 'Paystack', bank_transfer: 'Bank', manual: 'Manual' };
const STATUS_COLOR: Record<string, string> = {
  paid: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  failed: 'bg-red-100 text-red-700',
  refunded: 'bg-purple-100 text-purple-700',
  delivered: 'bg-blue-100 text-blue-700',
  completed: 'bg-blue-100 text-blue-700',
  processing: 'bg-sky-100 text-sky-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function shiftDate(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDate(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function KpiCard({ label, value, sub, trend, icon: Icon, color = 'blue' }: {
  label: string; value: string; sub?: string; trend?: number | null;
  icon: any; color?: string;
}) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600', green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600', red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  return (
    <div className="card flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-500 font-medium mb-0.5">{label}</p>
        <p className="text-xl font-extrabold text-gray-900 truncate">{value}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {sub && <span className="text-xs text-gray-400">{sub}</span>}
          {trend !== null && trend !== undefined && (
            <span className={`text-xs font-semibold flex items-center gap-0.5 ${trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-500' : 'text-gray-400'}`}>
              {trend > 0 ? <TrendingUp className="w-3 h-3" /> : trend < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
              {pct(trend)} vs yesterday
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DailySalesPage() {
  const [date, setDate] = useState(todayStr());
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const res = await api.get('/reports/daily', { params: { date } });
      setData(res.data.data);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load daily sales.');
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 60s only when viewing today
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (autoRefresh && date === todayStr()) {
      intervalRef.current = setInterval(() => load(true), 60_000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, date, load]);

  const isToday = date === todayStr();
  const kpis = data?.kpis || {};

  // Fill all 24 hours so the chart always shows a full day
  const hourlyData = Array.from({ length: 24 }, (_, h) => {
    const found = (data?.by_hour || []).find((x: any) => x.hour === h);
    return { label: `${h}:00`, revenue: found?.revenue || 0, orders: found?.orders || 0 };
  });

  return (
    <AppLayout
      title="Daily Sales"
      subtitle={formatDate(date)}
      allowedRoles={['business_owner', 'branch_manager', 'sales_staff', 'accountant']}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setDate(shiftDate(date, -1))}
            className="p-2 hover:bg-gray-50 text-gray-500 hover:text-gray-800 transition-colors"
            title="Previous day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <input
            type="date"
            value={date}
            max={todayStr()}
            onChange={(e) => setDate(e.target.value)}
            className="border-0 text-sm font-medium text-gray-800 bg-transparent px-1 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setDate(shiftDate(date, 1))}
            disabled={isToday}
            className="p-2 hover:bg-gray-50 text-gray-500 hover:text-gray-800 disabled:opacity-30 transition-colors"
            title="Next day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {!isToday && (
          <button type="button" onClick={() => setDate(todayStr())} className="btn-secondary text-xs py-1.5">
            Today
          </button>
        )}

        <button type="button" onClick={() => load()} className="btn-secondary text-xs py-1.5 flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>

        {isToday && (
          <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer select-none ml-auto">
            <div
              onClick={() => setAutoRefresh(v => !v)}
              className={`w-8 h-4 rounded-full transition-colors relative cursor-pointer ${autoRefresh ? 'bg-[#0D3B6E]' : 'bg-gray-300'}`}
            >
              <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${autoRefresh ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
            Auto-refresh
          </label>
        )}
      </div>

      {loading ? (
        <div className="py-20"><Spinner /></div>
      ) : error ? (
        <div className="card text-center py-12 text-red-600">{error}</div>
      ) : (
        <div className="space-y-5">

          {/* KPI tiles */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              label="Revenue" value={fmt(kpis.revenue)} icon={TrendingUp} color="blue"
              trend={kpis.vs_yesterday?.revenue}
            />
            <KpiCard
              label="Orders" value={String(kpis.orders)} icon={ShoppingCart} color="green"
              sub={kpis.orders > 0 ? `Avg ${fmt(kpis.avg_order)}` : undefined}
              trend={kpis.vs_yesterday?.orders}
            />
            <KpiCard
              label="Expenses" value={fmt(kpis.expenses)} icon={CreditCard} color="amber"
              sub="Logged today"
            />
            <KpiCard
              label="Pending Orders" value={String(kpis.pending_orders)} icon={Package}
              color={kpis.pending_orders > 0 ? 'amber' : 'blue'}
              sub="Awaiting payment"
            />
          </div>

          {/* Secondary tiles */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="card">
              <p className="text-xs text-gray-500 font-medium mb-1">Tax Collected</p>
              <p className="text-lg font-bold text-gray-900">{fmt(kpis.tax_collected)}</p>
            </div>
            <div className="card">
              <p className="text-xs text-gray-500 font-medium mb-1">Discounts Given</p>
              <p className="text-lg font-bold text-gray-900">{fmt(kpis.discounts)}</p>
            </div>
            <div className="card col-span-2 lg:col-span-1">
              <p className="text-xs text-gray-500 font-medium mb-1">Net (Revenue − Expenses)</p>
              <p className={`text-lg font-bold ${(kpis.revenue - kpis.expenses) >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                {fmt(kpis.revenue - kpis.expenses)}
              </p>
            </div>
          </div>

          {/* Hourly chart + by source/payment */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="card lg:col-span-2">
              <h3 className="font-bold text-gray-900 mb-4">Revenue by hour</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={hourlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={2} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(v: any) => [`GH₵ ${Number(v).toFixed(2)}`, 'Revenue']}
                    labelFormatter={(l) => `Hour: ${l}`}
                  />
                  <Bar dataKey="revenue" radius={[3, 3, 0, 0]}>
                    {hourlyData.map((_, i) => (
                      <Cell key={i} fill={hourlyData[i].revenue > 0 ? '#0D3B6E' : '#e5e7eb'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-4">
              {/* By source */}
              <div className="card">
                <h3 className="font-bold text-gray-900 mb-3 text-sm">By channel</h3>
                {data?.by_source?.length ? (
                  <div className="space-y-2">
                    {data.by_source.map((s: any) => (
                      <div key={s.source} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{SOURCE_LABEL[s.source] || s.source}</span>
                        <div className="text-right">
                          <div className="font-semibold text-gray-900">{fmt(s.revenue)}</div>
                          <div className="text-xs text-gray-400">{s.orders} order{s.orders !== 1 ? 's' : ''}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-xs text-gray-400">No sales yet</p>}
              </div>

              {/* By payment */}
              <div className="card">
                <h3 className="font-bold text-gray-900 mb-3 text-sm">By payment</h3>
                {data?.by_payment?.length ? (
                  <div className="space-y-2">
                    {data.by_payment.map((p: any) => (
                      <div key={p.method} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{METHOD_LABEL[p.method] || p.method}</span>
                        <div className="text-right">
                          <div className="font-semibold text-gray-900">{fmt(p.revenue)}</div>
                          <div className="text-xs text-gray-400">{p.orders} order{p.orders !== 1 ? 's' : ''}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-xs text-gray-400">No sales yet</p>}
              </div>
            </div>
          </div>

          {/* Top products + low stock */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card">
              <h3 className="font-bold text-gray-900 mb-3">Top products today</h3>
              {data?.top_products?.length ? (
                <div className="space-y-2">
                  {data.top_products.map((p: any, i: number) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-[#0D3B6E]/10 text-[#0D3B6E] text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.units_sold} unit{p.units_sold !== 1 ? 's' : ''}</p>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 shrink-0">{fmt(p.revenue)}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-gray-400">No product sales yet</p>}
            </div>

            <div className="card">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-gray-900">Low stock alerts</h3>
              </div>
              {data?.low_stock?.length ? (
                <div className="space-y-2">
                  {data.low_stock.map((p: any) => (
                    <div key={p._id} className="flex items-center justify-between text-sm">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 truncate">{p.name}</p>
                        {p.sku && <p className="text-xs text-gray-400">{p.sku}</p>}
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ml-2 ${p.stock_qty === 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                        {p.stock_qty === 0 ? 'Out of stock' : `${p.stock_qty} left`}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> All stock levels healthy
                </p>
              )}
            </div>
          </div>

          {/* Recent orders */}
          <div className="card p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Orders today</h3>
            </div>
            {data?.recent_orders?.length ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        {['Order #', 'Customer', 'Channel', 'Payment', 'Total', 'Status', 'Time'].map((h) => (
                          <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {data.recent_orders.map((o: any) => (
                        <tr key={o.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-2.5 font-mono text-xs font-medium text-[#0D3B6E] whitespace-nowrap">{o.order_number}</td>
                          <td className="px-4 py-2.5 font-medium text-gray-800 max-w-[140px] truncate">{o.customer_name}</td>
                          <td className="px-4 py-2.5 text-gray-500 text-xs">{SOURCE_LABEL[o.source] || o.source}</td>
                          <td className="px-4 py-2.5 text-gray-500 text-xs">{METHOD_LABEL[o.payment_method] || o.payment_method || '—'}</td>
                          <td className="px-4 py-2.5 font-semibold text-gray-900 whitespace-nowrap">{fmt(o.total)}</td>
                          <td className="px-4 py-2.5">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[o.payment_status] || 'bg-gray-100 text-gray-500'}`}>
                              {o.payment_status}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-gray-400 text-xs whitespace-nowrap">
                            {new Date(o.time).toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
                  {data.recent_orders.length} order{data.recent_orders.length !== 1 ? 's' : ''} shown
                  {' · '}Total collected: <strong className="text-gray-800">{fmt(kpis.revenue)}</strong>
                </div>
              </>
            ) : (
              <div className="py-12 text-center text-gray-400 text-sm">No orders recorded for this day</div>
            )}
          </div>

        </div>
      )}
    </AppLayout>
  );
}
