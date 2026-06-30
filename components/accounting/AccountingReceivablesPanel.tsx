'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Search, Download, ArrowDownCircle, AlertTriangle, Eye, DollarSign,
} from 'lucide-react';
import { Modal, EmptyState, Spinner, StatCard, toast } from '@/components/ui';
import api from '@/lib/api';

function fmt(n: number | string | undefined) {
  const v = parseFloat(String(n ?? 0));
  return `GH₵ ${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const STATUS_COLORS: Record<string, string> = {
  sent: 'bg-blue-100 text-blue-700',
  partially_paid: 'bg-yellow-100 text-yellow-700',
  overdue: 'bg-red-100 text-red-700',
};

const AGING_LABELS: Record<string, string> = {
  current: 'Current (0–30d)',
  days_31_60: '31–60 days',
  days_61_90: '61–90 days',
  over_90: '90+ days',
};

const AGING_COLORS: Record<string, string> = {
  current: 'bg-green-50 border-green-200 text-green-700',
  days_31_60: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  days_61_90: 'bg-orange-50 border-orange-200 text-orange-700',
  over_90: 'bg-red-50 border-red-200 text-red-700',
};

interface Props {
  onDataChange?: () => void;
}

export default function AccountingReceivablesPanel({ onDataChange }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [agingFilter, setAgingFilter] = useState('');

  const [payTarget, setPayTarget] = useState<any>(null);
  const [payForm, setPayForm] = useState({ amount: '', method: 'cash', reference: '', note: '' });
  const [paySaving, setPaySaving] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<any>(null);
  const [detailTarget, setDetailTarget] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter) params.set('status', statusFilter);
      if (agingFilter) params.set('aging_bucket', agingFilter);
      const res = await api.get(`/accounting/receivables?${params.toString()}`);
      setData(res.data.data);
    } catch {
      toast.error('Could not load receivables');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, agingFilter]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const recordPayment = async () => {
    if (!payTarget) return;
    setPaySaving(true);
    try {
      await api.post(`/invoices/${payTarget.id}/payments`, payForm);
      toast.success('Payment recorded — GL updated (Dr Cash, Cr AR)');
      setPayTarget(null);
      setPayForm({ amount: '', method: 'cash', reference: '', note: '' });
      load();
      onDataChange?.();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Payment failed');
    } finally {
      setPaySaving(false);
    }
  };

  const exportCsv = () => {
    const rows = data?.invoices || [];
    const header = ['Invoice #', 'Customer', 'Amount Due', 'Total', 'Issued', 'Due', 'Days Past Due', 'Status'];
    const body = rows.map((inv: any) => [
      inv.invoice_number,
      inv.customer_name,
      parseFloat(inv.amount_due || 0).toFixed(2),
      parseFloat(inv.total || 0).toFixed(2),
      new Date(inv.issue_date).toLocaleDateString(),
      new Date(inv.due_date).toLocaleDateString(),
      inv.days_past_due,
      inv.status,
    ]);
    const csv = [header, ...body].map((r) => r.map((c: string | number) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `receivables-${Date.now()}.csv`;
    a.click();
  };

  if (loading && !data) return <Spinner />;

  const summary = data?.summary || {};
  const invoices: any[] = data?.invoices || [];
  const aging = summary.aging || {};

  return (
    <div className={`space-y-5 relative ${loading ? 'opacity-60 pointer-events-none' : ''}`}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Open invoices" value={String(summary.count ?? 0)} icon={<ArrowDownCircle className="w-5 h-5 text-blue-600" />} color="bg-blue-50" sub="Outstanding receivables" />
        <StatCard label="Total outstanding" value={fmt(summary.total_outstanding)} icon={<DollarSign className="w-5 h-5 text-red-600" />} color="bg-red-50" sub="Invoice amount due" />
        <StatCard label="Overdue" value={String(summary.overdue_count ?? 0)} icon={<AlertTriangle className="w-5 h-5 text-orange-600" />} color="bg-orange-50" sub="Past due date" />
        <StatCard label="GL AR (1110)" value={fmt(summary.gl_accounts_receivable)} icon={<ArrowDownCircle className="w-5 h-5 text-indigo-600" />} color="bg-indigo-50" sub="General ledger balance" />
      </div>

      {Math.abs(summary.gl_vs_invoice_diff || 0) > 0.02 && (
        <div className="card flex items-start gap-3 border-l-4 border-l-amber-500 py-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-gray-700">
            Invoice total ({fmt(summary.total_outstanding)}) differs from GL AR ({fmt(summary.gl_accounts_receivable)}) by {fmt(summary.gl_vs_invoice_diff)}.
            Check for unsent invoices or manual journal adjustments.
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {(['current', 'days_31_60', 'days_61_90', 'over_90'] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setAgingFilter(agingFilter === key ? '' : key)}
            className={`rounded-xl border p-4 text-left transition-opacity ${AGING_COLORS[key]} ${agingFilter === key ? 'ring-2 ring-blue-400' : 'hover:opacity-90'}`}
          >
            <div className="text-xs font-medium mb-1">{AGING_LABELS[key]}</div>
            <div className="text-xl font-bold">{fmt(aging[key]?.amount)}</div>
            <div className="text-xs mt-1">{aging[key]?.count || 0} invoice{(aging[key]?.count || 0) !== 1 ? 's' : ''}</div>
          </button>
        ))}
      </div>

      <div className="card space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input className="form-input pl-9" placeholder="Search invoice # or customer…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="form-input w-full lg:w-44" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            <option value="sent">Sent</option>
            <option value="partially_paid">Partially paid</option>
            <option value="overdue">Overdue</option>
          </select>
          <button type="button" className="btn-secondary text-xs" onClick={exportCsv} disabled={!invoices.length}>
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        {invoices.length === 0 ? (
          <EmptyState message="No outstanding receivables" description="Sent invoices with a balance due appear here." icon={<ArrowDownCircle className="w-8 h-8 text-gray-300" />} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs md:text-sm">
              <thead className="table-header">
                <tr>
                  {['Invoice #', 'Customer', 'Amount Due', 'Due Date', 'Days past due', 'Status', ''].map((h) => (
                    <th key={h || 'actions'} className="px-3 md:px-4 py-2 md:py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {invoices.map((inv) => {
                  const ageColor = inv.days_past_due > 90 ? 'text-red-600 font-bold' : inv.days_past_due > 60 ? 'text-orange-500 font-semibold' : inv.days_past_due > 30 ? 'text-yellow-600' : 'text-green-600';
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50/80">
                      <td className="px-3 md:px-4 py-2 md:py-3 font-mono text-xs text-blue-700">{inv.invoice_number}</td>
                      <td className="px-3 md:px-4 py-2 md:py-3">
                        <div className="font-medium">{inv.customer_name}</div>
                        {inv.customer_email && <div className="text-xs text-gray-400 truncate max-w-[140px]">{inv.customer_email}</div>}
                      </td>
                      <td className="px-3 md:px-4 py-2 md:py-3 font-semibold text-red-600 tabular-nums">{fmt(inv.amount_due)}</td>
                      <td className="px-3 md:px-4 py-2 md:py-3 text-gray-500 whitespace-nowrap hidden md:table-cell">{new Date(inv.due_date).toLocaleDateString()}</td>
                      <td className={`px-3 md:px-4 py-2 md:py-3 tabular-nums ${ageColor}`}>{inv.days_past_due}d</td>
                      <td className="px-3 md:px-4 py-2 md:py-3">
                        <span className={`badge text-xs ${STATUS_COLORS[inv.status] || 'bg-gray-100 text-gray-600'}`}>{inv.status.replace('_', ' ')}</span>
                      </td>
                      <td className="px-3 md:px-4 py-2 md:py-3">
                        <div className="flex gap-1 justify-end">
                          <button type="button" onClick={() => setDetailTarget(inv)} className="p-1.5 hover:bg-gray-100 rounded text-gray-500" title="View">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => { setPayTarget(inv); setPayForm({ amount: String(inv.amount_due), method: 'cash', reference: '', note: '' }); }}
                            className="text-xs font-semibold text-white bg-green-600 hover:bg-green-700 px-2 py-1 rounded-lg"
                          >
                            Pay
                          </button>
                          {inv.payments?.length > 0 && (
                            <button type="button" onClick={() => setHistoryTarget(inv)} className="text-xs text-blue-600 hover:bg-blue-50 px-2 py-1 rounded hidden sm:inline-block">History</button>
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

      <p className="text-xs text-gray-400">
        Aging is based on days past the due date. Customer payments post Dr Cash &amp; Bank (1001), Cr Accounts Receivable (1110).
      </p>

      <Modal open={!!payTarget} onClose={() => setPayTarget(null)} title={`Record payment — ${payTarget?.invoice_number}`} size="sm">
        <div className="space-y-3">
          <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm flex justify-between">
            <span className="text-gray-500">Amount due</span>
            <span className="font-semibold text-red-600">{fmt(payTarget?.amount_due)}</span>
          </div>
          <div><label className="form-label">Amount (GH₵) *</label><input type="number" step="0.01" className="form-input" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} /></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="form-label">Method</label>
              <select className="form-input" value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value })}>
                {['cash', 'bank_transfer', 'cheque', 'mobile_money', 'card'].map((m) => (
                  <option key={m} value={m}>{m.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div><label className="form-label">Reference</label><input className="form-input" value={payForm.reference} onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })} /></div>
          </div>
          <div><label className="form-label">Note</label><input className="form-input" value={payForm.note} onChange={(e) => setPayForm({ ...payForm, note: e.target.value })} /></div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button type="button" className="btn-secondary" onClick={() => setPayTarget(null)}>Cancel</button>
          <button type="button" className="btn-primary" onClick={recordPayment} disabled={paySaving || !parseFloat(payForm.amount || '0')}>{paySaving ? 'Saving…' : 'Record payment'}</button>
        </div>
      </Modal>

      <Modal open={!!detailTarget} onClose={() => setDetailTarget(null)} title={detailTarget?.invoice_number} size="md">
        {detailTarget && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-gray-500">Customer</span><p className="font-medium">{detailTarget.customer_name}</p></div>
              <div><span className="text-gray-500">Status</span><p className="capitalize">{detailTarget.status.replace('_', ' ')}</p></div>
              <div><span className="text-gray-500">Total</span><p>{fmt(detailTarget.total)}</p></div>
              <div><span className="text-gray-500">Amount due</span><p className="text-red-600 font-semibold">{fmt(detailTarget.amount_due)}</p></div>
              <div><span className="text-gray-500">Issued</span><p>{new Date(detailTarget.issue_date).toLocaleDateString()}</p></div>
              <div><span className="text-gray-500">Due</span><p>{new Date(detailTarget.due_date).toLocaleDateString()}</p></div>
            </div>
            {detailTarget.lines?.length > 0 && (
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="table-header"><tr><th className="px-3 py-2 text-left">Description</th><th className="px-3 py-2 text-right">Total</th></tr></thead>
                  <tbody>
                    {detailTarget.lines.map((l: any, i: number) => (
                      <tr key={i} className="border-t"><td className="px-3 py-2">{l.description}</td><td className="px-3 py-2 text-right tabular-nums">{fmt(l.total)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal open={!!historyTarget} onClose={() => setHistoryTarget(null)} title={`Payments — ${historyTarget?.invoice_number}`} size="md">
        {historyTarget?.payments?.length > 0 && (
          <div className="overflow-x-auto border rounded-xl">
            <table className="w-full text-xs md:text-sm">
              <thead className="table-header"><tr>{['Date', 'Amount', 'Method', 'Reference'].map((h) => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-50">
                {historyTarget.payments.map((p: any, i: number) => (
                  <tr key={i}>
                    <td className="px-3 py-2">{new Date(p.date).toLocaleDateString()}</td>
                    <td className="px-3 py-2 text-green-700 font-semibold">{fmt(p.amount)}</td>
                    <td className="px-3 py-2 capitalize">{p.method?.replace('_', ' ')}</td>
                    <td className="px-3 py-2 text-gray-500">{p.reference || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </div>
  );
}
