'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Search, Download, ArrowUpCircle, AlertTriangle, Eye, DollarSign,
} from 'lucide-react';
import { Modal, EmptyState, Spinner, StatCard, toast } from '@/components/ui';
import api from '@/lib/api';

function fmt(n: number | string | undefined) {
  const v = parseFloat(String(n ?? 0));
  return `GH₵ ${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const SOURCE_COLORS: Record<string, string> = {
  purchase: 'bg-orange-100 text-orange-800',
  vendor_bill: 'bg-blue-100 text-blue-800',
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

export default function AccountingPayablesPanel({ onDataChange }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [agingFilter, setAgingFilter] = useState('');

  const [payTarget, setPayTarget] = useState<any>(null);
  const [payForm, setPayForm] = useState({ amount: '', method: 'bank_transfer', reference: '', note: '' });
  const [paySaving, setPaySaving] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (sourceFilter) params.set('source', sourceFilter);
      if (agingFilter) params.set('aging_bucket', agingFilter);
      const res = await api.get(`/accounting/payables?${params.toString()}`);
      setData(res.data.data);
    } catch {
      toast.error('Could not load payables');
    } finally {
      setLoading(false);
    }
  }, [search, sourceFilter, agingFilter]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const canPay = (e: any) => e.po_id || e.bill_id;

  const recordPayment = async () => {
    if (!payTarget) return;
    setPaySaving(true);
    try {
      if (payTarget.document_type === 'vendor_bill' && payTarget.bill_id) {
        await api.post(`/vendor-bills/${payTarget.bill_id}/payments`, payForm);
      } else if (payTarget.po_id) {
        await api.patch(`/purchase-orders/${payTarget.po_id}/pay`, payForm);
      } else {
        throw new Error('No payable document linked');
      }
      toast.success('Supplier payment recorded — GL updated (Dr AP, Cr Cash)');
      setPayTarget(null);
      setPayForm({ amount: '', method: 'bank_transfer', reference: '', note: '' });
      load();
      onDataChange?.();
    } catch (e: any) {
      toast.error(e.response?.data?.message || e.message || 'Payment failed');
    } finally {
      setPaySaving(false);
    }
  };

  const exportCsv = () => {
    const rows = data?.entries || [];
    const header = ['Reference', 'Supplier', 'Document', 'Source', 'Outstanding', 'Due', 'Days Past Due'];
    const body = rows.map((e: any) => [
      e.reference,
      e.supplier || '',
      e.document_number || '',
      e.source,
      e.outstanding.toFixed(2),
      e.due_date ? new Date(e.due_date).toLocaleDateString() : '',
      e.days_past_due,
    ]);
    const csv = [header, ...body].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `payables-${Date.now()}.csv`;
    a.click();
  };

  if (loading && !data) return <Spinner />;

  const summary = data?.summary || {};
  const entries: any[] = data?.entries || [];
  const sources = data?.sources || [];
  const aging = summary.aging || {};

  return (
    <div className={`space-y-5 relative ${loading ? 'opacity-60 pointer-events-none' : ''}`}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Open payables" value={String(summary.count ?? 0)} icon={<ArrowUpCircle className="w-5 h-5 text-orange-600" />} color="bg-orange-50" sub="GL account 2001" />
        <StatCard label="Total outstanding" value={fmt(summary.total_outstanding)} icon={<DollarSign className="w-5 h-5 text-red-600" />} color="bg-red-50" sub="Amount still owed" />
        <StatCard label="Overdue" value={String(summary.overdue_count ?? 0)} icon={<AlertTriangle className="w-5 h-5 text-amber-600" />} color="bg-amber-50" sub="Past expected due date" />
        <StatCard label="GL AP (2001)" value={fmt(summary.gl_accounts_payable)} icon={<ArrowUpCircle className="w-5 h-5 text-indigo-600" />} color="bg-indigo-50" sub="General ledger balance" />
      </div>

      {Math.abs(summary.gl_vs_entries_diff || 0) > 0.02 && (
        <div className="card flex items-start gap-3 border-l-4 border-l-amber-500 py-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-gray-700">
            Open payables ({fmt(summary.total_outstanding)}) differ from GL AP ({fmt(summary.gl_accounts_payable)}) by {fmt(summary.gl_vs_entries_diff)}.
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
            <div className="text-xs mt-1">{aging[key]?.count || 0} item{(aging[key]?.count || 0) !== 1 ? 's' : ''}</div>
          </button>
        ))}
      </div>

      <div className="card space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input className="form-input pl-9" placeholder="Search supplier, reference, PO/bill…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="form-input w-full lg:w-44" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
            <option value="">All sources</option>
            {sources.map((s: any) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <button type="button" className="btn-secondary text-xs" onClick={exportCsv} disabled={!entries.length}>
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        {entries.length === 0 ? (
          <EmptyState message="No outstanding payables" description="Posted purchase orders and vendor bills with open balances appear here." icon={<ArrowUpCircle className="w-8 h-8 text-gray-300" />} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs md:text-sm">
              <thead className="table-header">
                <tr>
                  {['Reference', 'Supplier', 'Document', 'Outstanding', 'Due', 'Age', 'Source', ''].map((h) => (
                    <th key={h || 'actions'} className="px-3 md:px-4 py-2 md:py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {entries.map((e) => {
                  const ageColor = e.days_past_due > 90 ? 'text-red-600 font-bold' : e.days_past_due > 60 ? 'text-orange-500 font-semibold' : e.days_past_due > 30 ? 'text-yellow-600' : 'text-green-600';
                  return (
                    <tr key={e.id} className="hover:bg-gray-50/80">
                      <td className="px-3 md:px-4 py-2 md:py-3 font-mono text-xs text-blue-700">{e.reference}</td>
                      <td className="px-3 md:px-4 py-2 md:py-3 font-medium">{e.supplier || '—'}</td>
                      <td className="px-3 md:px-4 py-2 md:py-3 font-mono text-xs hidden md:table-cell">{e.document_number || '—'}</td>
                      <td className="px-3 md:px-4 py-2 md:py-3 font-semibold text-red-600 tabular-nums">{fmt(e.outstanding)}</td>
                      <td className="px-3 md:px-4 py-2 md:py-3 text-gray-500 whitespace-nowrap hidden lg:table-cell">{e.due_date ? new Date(e.due_date).toLocaleDateString() : '—'}</td>
                      <td className={`px-3 md:px-4 py-2 md:py-3 tabular-nums ${ageColor}`}>{e.days_past_due}d</td>
                      <td className="px-3 md:px-4 py-2 md:py-3 hidden sm:table-cell">
                        <span className={`badge text-xs ${SOURCE_COLORS[e.source] || 'bg-gray-100 text-gray-700'}`}>{e.source === 'vendor_bill' ? 'Vendor bill' : 'PO'}</span>
                      </td>
                      <td className="px-3 md:px-4 py-2 md:py-3">
                        <div className="flex gap-1 justify-end">
                          {e.payments?.length > 0 && (
                            <button type="button" onClick={() => setHistoryTarget(e)} className="p-1.5 hover:bg-gray-100 rounded text-gray-500" title="Payment history">
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canPay(e) && (
                            <button
                              type="button"
                              onClick={() => {
                                setPayTarget(e);
                                setPayForm({ amount: e.outstanding.toFixed(2), method: 'bank_transfer', reference: '', note: '' });
                              }}
                              className="text-xs font-semibold text-white bg-green-600 hover:bg-green-700 px-2 py-1 rounded-lg"
                            >
                              Pay
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-semibold border-t-2 border-gray-200">
                  <td className="px-3 md:px-4 py-2 md:py-3" colSpan={3}>Total outstanding</td>
                  <td className="px-3 md:px-4 py-2 md:py-3 text-red-600 tabular-nums">{fmt(summary.total_outstanding)}</td>
                  <td colSpan={4} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400">
        Payables are derived from GL account 2001. Payments post Dr Accounts Payable, Cr Cash &amp; Bank (1001).
      </p>

      <Modal open={!!payTarget} onClose={() => setPayTarget(null)} title={`Pay supplier — ${payTarget?.document_number || payTarget?.reference}`} size="sm">
        {payTarget && (
          <div className="space-y-3">
            <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-gray-500">Supplier</span><span className="font-medium">{payTarget.supplier || '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Outstanding</span><span className="font-semibold text-red-600">{fmt(payTarget.outstanding)}</span></div>
            </div>
            <div>
              <label className="form-label">Amount (GH₵) *</label>
              <input type="number" step="0.01" className="form-input" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} max={payTarget.outstanding} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="form-label">Method</label>
                <select className="form-input" value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value })}>
                  {['bank_transfer', 'cash', 'cheque', 'mobile_money', 'card'].map((m) => (
                    <option key={m} value={m}>{m.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div><label className="form-label">Reference</label><input className="form-input" value={payForm.reference} onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })} /></div>
            </div>
            <div><label className="form-label">Note</label><input className="form-input" value={payForm.note} onChange={(e) => setPayForm({ ...payForm, note: e.target.value })} /></div>
          </div>
        )}
        <div className="flex gap-3 justify-end mt-6">
          <button type="button" className="btn-secondary" onClick={() => setPayTarget(null)}>Cancel</button>
          <button type="button" className="btn-primary" onClick={recordPayment} disabled={paySaving || !parseFloat(payForm.amount || '0')}>{paySaving ? 'Processing…' : 'Record payment'}</button>
        </div>
      </Modal>

      <Modal open={!!historyTarget} onClose={() => setHistoryTarget(null)} title={`Payments — ${historyTarget?.document_number || historyTarget?.reference}`} size="md">
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
