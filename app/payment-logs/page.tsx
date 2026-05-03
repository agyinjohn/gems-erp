'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import api from '@/lib/api';
import { CreditCard, ShoppingCart, Monitor, Truck, Users, RefreshCw } from 'lucide-react';

const SOURCE_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  storefront:       { label: 'Storefront',      color: 'bg-blue-100 text-blue-700',    icon: ShoppingCart },
  pos:              { label: 'POS',             color: 'bg-green-100 text-green-700',  icon: Monitor },
  internal_order:   { label: 'Internal Order',  color: 'bg-purple-100 text-purple-700',icon: ShoppingCart },
  purchase_order:   { label: 'Purchase Order',  color: 'bg-orange-100 text-orange-700',icon: Truck },
  payroll:          { label: 'Payroll',         color: 'bg-pink-100 text-pink-700',    icon: Users },
};

const STATUS_COLORS: Record<string, string> = {
  success:  'bg-green-100 text-green-700',
  failed:   'bg-red-100 text-red-700',
  pending:  'bg-yellow-100 text-yellow-700',
  refunded: 'bg-gray-100 text-gray-600',
};

const METHOD_LABELS: Record<string, string> = {
  paystack:      'Paystack',
  cash:          'Cash',
  mobile_money:  'Mobile Money',
  bank_transfer: 'Bank Transfer',
  card:          'Card',
  manual:        'Manual',
};

export default function PaymentLogsPage() {
  const [logs, setLogs]         = useState<any[]>([]);
  const [summary, setSummary]   = useState<any[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [pages, setPages]       = useState(1);
  const [loading, setLoading]   = useState(true);
  const [source, setSource]     = useState('');
  const [status, setStatus]     = useState('');
  const [from, setFrom]         = useState('');
  const [to, setTo]             = useState('');

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const params: any = { page: p, limit: 50 };
      if (source) params.source = source;
      if (status) params.status = status;
      if (from)   params.from   = from;
      if (to)     params.to     = to;
      const r = await api.get('/payment-logs', { params });
      setLogs(r.data.data);
      setTotal(r.data.total);
      setPages(r.data.pages);
      setSummary(r.data.summary || []);
      setPage(p);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(1); }, [source, status, from, to]);

  return (
    <AppLayout title="Payment Logs" subtitle="All payment transactions across the system" allowedRoles={['business_owner','accountant']}>
      <div className="space-y-6">

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-wrap gap-3 items-end">
          <div>
            <label className="form-label">Source</label>
            <select className="form-input" value={source} onChange={e => setSource(e.target.value)}>
              <option value="">All Sources</option>
              {Object.entries(SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Status</label>
            <select className="form-input" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
          <div>
            <label className="form-label">From</label>
            <input type="date" className="form-input" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="form-label">To</label>
            <input type="date" className="form-input" value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <button onClick={() => { setSource(''); setStatus(''); setFrom(''); setTo(''); }} className="text-xs text-red-500 hover:underline">Clear</button>
          <button onClick={() => load(1)} className="ml-auto flex items-center gap-1.5 text-xs text-blue-600 hover:underline">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Transactions <span className="text-gray-400 font-normal text-sm">({total})</span></h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center">
              <CreditCard className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No payment records found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-5 py-3 text-left">Date</th>
                    <th className="px-5 py-3 text-left">Reference</th>
                    <th className="px-5 py-3 text-left">Source</th>
                    <th className="px-5 py-3 text-left">Payer</th>
                    <th className="px-5 py-3 text-left">Method</th>
                    <th className="px-5 py-3 text-left">Status</th>
                    <th className="px-5 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {logs.map(log => {
                    const src = SOURCE_LABELS[log.source];
                    return (
                      <tr key={log._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleDateString()}<br />
                          <span className="text-xs text-gray-400">{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </td>
                        <td className="px-5 py-3 font-mono text-xs text-gray-700">{log.reference}</td>
                        <td className="px-5 py-3">
                          {src && (
                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${src.color}`}>
                              {log.source.replace('_', ' ')}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <div className="text-gray-800 font-medium">{log.payer_name || '—'}</div>
                          {log.payer_email && <div className="text-xs text-gray-400">{log.payer_email}</div>}
                        </td>
                        <td className="px-5 py-3 text-gray-600">{METHOD_LABELS[log.method] || log.method}</td>
                        <td className="px-5 py-3">
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_COLORS[log.status] || 'bg-gray-100 text-gray-600'}`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right font-bold text-gray-900">
                          {log.currency === 'USD' ? '$' : 'GHS'} {parseFloat(log.amount).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pages > 1 && (
            <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between text-sm">
              <span className="text-gray-400">Page {page} of {pages}</span>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => load(page - 1)} className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-gray-50">Prev</button>
                <button disabled={page >= pages} onClick={() => load(page + 1)} className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-gray-50">Next</button>
              </div>
            </div>
          )}
        </div>

      </div>
    </AppLayout>
  );
}
