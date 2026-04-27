'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Spinner } from '@/components/ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Download, TrendingUp, Package, DollarSign, Users, ShoppingCart, Handshake, AlertTriangle } from 'lucide-react';
import api from '@/lib/api';

const COLORS = ['#0D3B6E','#1A6BB5','#2E8BC0','#60A5FA','#93C5FD','#BFDBFE'];

export default function ReportsPage() {
  const [tab, setTab] = useState<'sales'|'inventory'|'finance'|'hr'|'procurement'|'crm'>('sales');
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const endpoint = tab === 'procurement' ? '/reports/procurement'
        : tab === 'crm' ? '/reports/crm'
        : `/reports/${tab}`;
      const r = await api.get(endpoint, { params: { from: dateFrom || undefined, to: dateTo || undefined } }).catch(()=>({data:{data:{}}}));
      setData(r.data.data||{});
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [tab]);

  const fmt = (n: any) => `GHS ${parseFloat(n||0).toFixed(2)}`;

  const exportCSV = () => {
    const rows: string[][] = [['Report', tab.toUpperCase()], ['Generated', new Date().toLocaleString()], []];
    const flat = (obj: any, prefix = '') => {
      Object.entries(obj).forEach(([k, v]) => {
        if (Array.isArray(v)) {
          if (v.length > 0 && typeof v[0] === 'object') {
            rows.push([prefix + k]);
            rows.push(Object.keys(v[0]));
            v.forEach((row: any) => rows.push(Object.values(row).map(String)));
            rows.push([]);
          }
        } else if (typeof v !== 'object') {
          rows.push([prefix + k, String(v)]);
        }
      });
    };
    flat(data);
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `gthink-${tab}-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <AppLayout title="Reports" subtitle="Business intelligence and performance metrics" allowedRoles={['super_admin','accountant','hr_manager']}>
      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-5">
        {([{t:'sales',l:'Sales',icon:<TrendingUp className="w-4 h-4"/>},{t:'inventory',l:'Inventory',icon:<Package className="w-4 h-4"/>},{t:'finance',l:'Finance',icon:<DollarSign className="w-4 h-4"/>},{t:'hr',l:'HR',icon:<Users className="w-4 h-4"/>},{t:'procurement',l:'Procurement',icon:<ShoppingCart className="w-4 h-4"/>},{t:'crm',l:'CRM',icon:<Handshake className="w-4 h-4"/>}]).map(({t,l,icon}) => (
          <button key={t} onClick={() => setTab(t as any)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${tab===t?'bg-blue-700 text-white':'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}>{icon}{l}</button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <input type="date" className="form-input py-1.5 text-xs w-36" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <input type="date" className="form-input py-1.5 text-xs w-36" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          <button className="btn-primary py-1.5" onClick={load}>Apply</button>
          <button className="btn-secondary py-1.5 flex items-center gap-1" onClick={exportCSV}><Download className="w-3.5 h-3.5" />Export CSV</button>
        </div>
      </div>

      {loading ? <Spinner /> : (
        <>
          {/* Sales Report */}
          {tab==='sales' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label:'Total Revenue', value: fmt(data.total_revenue), color:'text-green-600' },
                  { label:'Total Orders', value: data.total_orders||0, color:'text-blue-600' },
                  { label:'Avg Order Value', value: fmt(data.avg_order_value), color:'text-purple-600' },
                  { label:'Paid Orders', value: data.paid_orders||0, color:'text-teal-600' },
                ].map(k => (
                  <div key={k.label} className="card"><div className={`text-2xl font-bold ${k.color}`}>{k.value}</div><div className="text-sm text-gray-500 mt-1">{k.label}</div></div>
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card">
                  <h3 className="font-semibold text-gray-800 mb-4">Revenue by Month</h3>
                  {data.monthly?.length ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={data.monthly}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="month" tick={{fontSize:11}} />
                        <YAxis tick={{fontSize:11}} tickFormatter={v=>`${(v/1000).toFixed(0)}k`} />
                        <Tooltip formatter={(v:any)=>[`GHS ${Number(v).toFixed(2)}`,'Revenue']} />
                        <Bar dataKey="revenue" fill="#1A6BB5" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <div className="h-40 flex items-center justify-center text-gray-400 text-sm">No data</div>}
                </div>
                <div className="card">
                  <h3 className="font-semibold text-gray-800 mb-4">Top Products by Revenue</h3>
                  {data.top_products?.length ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={data.top_products} dataKey="revenue" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({name,percent})=>`${name} ${((percent??0)*100).toFixed(0)}%`}>
                          {data.top_products.map((_:any,i:number) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v:any)=>[`GHS ${Number(v).toFixed(2)}`]} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <div className="h-40 flex items-center justify-center text-gray-400 text-sm">No data</div>}
                </div>
              </div>
              {/* Order status breakdown */}
              {data.by_status && (
                <div className="card">
                  <h3 className="font-semibold text-gray-800 mb-4">Orders by Status</h3>
                  <div className="flex flex-wrap gap-4">
                    {Object.entries(data.by_status).map(([status, count]:any) => (
                      <div key={status} className="flex items-center gap-2">
                        <span className="capitalize text-sm text-gray-700 font-medium">{status}:</span>
                        <span className="text-sm font-bold text-gray-900">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Inventory Report */}
          {tab==='inventory' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label:'Total Products', value: data.total_products||0, color:'text-blue-600' },
                  { label:'Total Stock Value', value: fmt(data.total_value), color:'text-green-600' },
                  { label:'Low Stock Items', value: data.low_stock_count||0, color:'text-red-600' },
                  { label:'Out of Stock', value: data.out_of_stock||0, color:'text-gray-600' },
                ].map(k => (
                  <div key={k.label} className="card"><div className={`text-2xl font-bold ${k.color}`}>{k.value}</div><div className="text-sm text-gray-500 mt-1">{k.label}</div></div>
                ))}
              </div>
              {data.by_category?.length > 0 && (
                <div className="card">
                  <h3 className="font-semibold text-gray-800 mb-4">Stock Value by Category</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data.by_category}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="category" tick={{fontSize:11}} />
                      <YAxis tick={{fontSize:11}} tickFormatter={v=>`${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v:any)=>[`GHS ${Number(v).toFixed(2)}`,'Value']} />
                      <Bar dataKey="value" fill="#0D3B6E" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              {data.low_stock?.length > 0 && (
                <div className="card">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-yellow-500"/>Low Stock Items</h3>
                  <table className="w-full text-sm">
                    <thead className="table-header"><tr><th className="px-3 py-2 text-left">Product</th><th className="px-3 py-2 text-left">SKU</th><th className="px-3 py-2 text-left">Stock</th><th className="px-3 py-2 text-left">Threshold</th></tr></thead>
                    <tbody>{data.low_stock.map((p:any) => (
                      <tr key={p.id} className="border-t"><td className="px-3 py-2 font-medium">{p.name}</td><td className="px-3 py-2 font-mono text-xs text-gray-500">{p.sku}</td><td className="px-3 py-2 text-red-600 font-semibold">{p.stock_qty}</td><td className="px-3 py-2 text-gray-500">{p.low_stock_threshold}</td></tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Finance Report */}
          {tab==='finance' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { label:'Total Revenue', value: fmt(data.revenue), color:'text-green-600' },
                  { label:'Total Expenses', value: fmt(data.total_expenses), color:'text-red-600' },
                  { label:'Net Profit', value: `GHS ${(parseFloat(data.revenue||0)-parseFloat(data.total_expenses||0)).toFixed(2)}`, color:'text-blue-600' },
                ].map(k => (
                  <div key={k.label} className="card"><div className={`text-2xl font-bold ${k.color}`}>{k.value}</div><div className="text-sm text-gray-500 mt-1">{k.label}</div></div>
                ))}
              </div>
              {data.expenses_by_category?.length > 0 && (
                <div className="card">
                  <h3 className="font-semibold text-gray-800 mb-4">Expenses by Category</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={data.expenses_by_category} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={80} label>
                        {data.expenses_by_category.map((_:any,i:number) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v:any)=>[`GHS ${Number(v).toFixed(2)}`]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* Procurement Report */}
          {tab==='procurement' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label:'Total POs', value: data.total_pos||0, color:'text-blue-600' },
                  { label:'Total Spend', value: fmt(data.total_spend), color:'text-red-600' },
                  { label:'Pending Delivery', value: data.pending_delivery||0, color:'text-yellow-600' },
                  { label:'Completed POs', value: data.completed_pos||0, color:'text-green-600' },
                ].map(k => (
                  <div key={k.label} className="card"><div className={`text-2xl font-bold ${k.color}`}>{k.value}</div><div className="text-sm text-gray-500 mt-1">{k.label}</div></div>
                ))}
              </div>
              {data.by_supplier?.length > 0 && (
                <div className="card">
                  <h3 className="font-semibold text-gray-800 mb-4">Spend by Supplier</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data.by_supplier}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="supplier" tick={{fontSize:11}} />
                      <YAxis tick={{fontSize:11}} tickFormatter={v=>`${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v:any)=>[`GHS ${Number(v).toFixed(2)}`,'Spend']} />
                      <Bar dataKey="total" fill="#0D3B6E" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              {data.recent_pos?.length > 0 && (
                <div className="card">
                  <h3 className="font-semibold text-gray-800 mb-3">Recent Purchase Orders</h3>
                  <table className="w-full text-sm">
                    <thead className="table-header"><tr><th className="px-3 py-2 text-left">PO #</th><th className="px-3 py-2 text-left">Supplier</th><th className="px-3 py-2 text-left">Total</th><th className="px-3 py-2 text-left">Status</th></tr></thead>
                    <tbody>{data.recent_pos.map((p:any) => (
                      <tr key={p.id} className="border-t"><td className="px-3 py-2 font-mono text-xs text-blue-700">{p.po_number}</td><td className="px-3 py-2">{p.supplier_name}</td><td className="px-3 py-2 font-semibold">GHS {parseFloat(p.total_cost).toFixed(2)}</td><td className="px-3 py-2 capitalize">{p.status}</td></tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* CRM Report */}
          {tab==='crm' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label:'Total Customers', value: data.total_customers||0, color:'text-blue-600' },
                  { label:'Active Leads', value: data.active_leads||0, color:'text-purple-600' },
                  { label:'Won Leads', value: data.won_leads||0, color:'text-green-600' },
                  { label:'Pipeline Value', value: fmt(data.pipeline_value), color:'text-teal-600' },
                ].map(k => (
                  <div key={k.label} className="card"><div className={`text-2xl font-bold ${k.color}`}>{k.value}</div><div className="text-sm text-gray-500 mt-1">{k.label}</div></div>
                ))}
              </div>
              {data.by_stage?.length > 0 && (
                <div className="card">
                  <h3 className="font-semibold text-gray-800 mb-4">Leads by Stage</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data.by_stage}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="stage" tick={{fontSize:11}} />
                      <YAxis tick={{fontSize:11}} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#1A6BB5" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              {data.top_customers?.length > 0 && (
                <div className="card">
                  <h3 className="font-semibold text-gray-800 mb-3">Top Customers by Orders</h3>
                  <table className="w-full text-sm">
                    <thead className="table-header"><tr><th className="px-3 py-2 text-left">Customer</th><th className="px-3 py-2 text-left">Company</th><th className="px-3 py-2 text-left">Orders</th><th className="px-3 py-2 text-left">Segment</th></tr></thead>
                    <tbody>{data.top_customers.map((c:any) => (
                      <tr key={c.id} className="border-t"><td className="px-3 py-2 font-medium">{c.name}</td><td className="px-3 py-2 text-gray-500">{c.company||'—'}</td><td className="px-3 py-2 font-semibold">{c.order_count||0}</td><td className="px-3 py-2 capitalize">{c.segment}</td></tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* HR Report */}
          {tab==='hr' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label:'Total Employees', value: data.total_employees||0, color:'text-blue-600' },
                  { label:'Active', value: data.active||0, color:'text-green-600' },
                  { label:'On Leave', value: data.on_leave||0, color:'text-yellow-600' },
                  { label:'Total Payroll (Month)', value: fmt(data.monthly_payroll), color:'text-purple-600' },
                ].map(k => (
                  <div key={k.label} className="card"><div className={`text-2xl font-bold ${k.color}`}>{k.value}</div><div className="text-sm text-gray-500 mt-1">{k.label}</div></div>
                ))}
              </div>
              {data.by_department?.length > 0 && (
                <div className="card">
                  <h3 className="font-semibold text-gray-800 mb-4">Headcount by Department</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data.by_department} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" tick={{fontSize:11}} />
                      <YAxis dataKey="department" type="category" tick={{fontSize:11}} width={100} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#1A6BB5" radius={[0,4,4,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </AppLayout>
  );
}
