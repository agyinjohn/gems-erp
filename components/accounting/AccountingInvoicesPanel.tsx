'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Download, RefreshCw, Trash2, FileText, Search, DollarSign } from 'lucide-react';

const CedisIcon = ({ className }: { className?: string }) => (
  <span className={`font-bold font-serif leading-none flex items-center justify-center ${className}`}>₵</span>
);
import { EmptyState, Modal, Spinner, StatCard, toast } from '@/components/ui';
import api, { apiCache } from '@/lib/api';

function fmt(n: number | string | undefined | null) {
  const v = parseFloat(String(n ?? 0));
  return `GH₵ ${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'text-gray-600',
  partially_paid: 'text-gray-600',
  paid: 'text-gray-600',
  overdue: 'text-gray-600',
  void: 'text-gray-400',
};

const EMPTY_LINE = { description: '', quantity: '1', unit_price: '', tax_rate: '0' };

interface Props {
  onDataChange?: () => void;
}

export default function AccountingInvoicesPanel({ onDataChange }: Props) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    customer_name: '',
    customer_email: '',
    due_date: '',
    notes: '',
    lines: [{ ...EMPTY_LINE }],
  });
  const [payTarget, setPayTarget] = useState<any>(null);
  const [payForm, setPayForm] = useState({ amount: '', method: 'cash', reference: '', note: '' });
  const [historyTarget, setHistoryTarget] = useState<any>(null);

  const load = useCallback(async (silent = false) => {
    const params = new URLSearchParams({ view: 'full' });
    if (search.trim()) params.set('search', search.trim());
    if (statusFilter) params.set('status', statusFilter);
    const key = `/invoices?${params.toString()}`;
    const cached = apiCache.get(key);
    if (cached) {
      setData(cached);
      setLoading(false);
      if (!apiCache.isStale(key)) return;
    }
    if (!silent) setLoading(true);
    try {
      const res = await api.get(key);
      apiCache.set(key, res.data.data);
      setData(res.data.data);
    } catch {
      if (!cached) { toast.error('Could not load invoices'); setData(null); }
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const rows = data?.rows || [];
  const summary = data?.summary || {};

  const saveInvoice = async () => {
    if (!form.customer_name.trim() || !form.due_date) {
      toast.error('Customer name and due date are required');
      return;
    }
    setSaving(true);
    try {
      const lines = form.lines.map((l) => ({
        description: l.description,
        quantity: parseFloat(l.quantity) || 1,
        unit_price: parseFloat(l.unit_price) || 0,
        tax_rate: parseFloat(l.tax_rate) || 0,
      }));
      await api.post('/invoices', { ...form, lines });
      toast.success('Invoice created');
      setCreateOpen(false);
      setForm({ customer_name: '', customer_email: '', due_date: '', notes: '', lines: [{ ...EMPTY_LINE }] });
      apiCache.invalidate('/invoices');
      apiCache.invalidate('/accounting/summary');
      load();
      onDataChange?.();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  const sendInvoice = async (id: string) => {
    try {
      await api.patch(`/invoices/${id}/send`);
      toast.success('Invoice sent — GL entry posted');
      apiCache.invalidate('/invoices');
      apiCache.invalidate('/accounting/summary');
      load();
      onDataChange?.();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Send failed');
    }
  };

  const voidInvoice = async (id: string) => {
    if (!confirm('Void this invoice?')) return;
    try {
      await api.patch(`/invoices/${id}/void`);
      toast.success('Invoice voided');
      apiCache.invalidate('/invoices');
      apiCache.invalidate('/accounting/summary');
      load();
      onDataChange?.();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Void failed');
    }
  };

  const recordPayment = async () => {
    if (!payTarget) return;
    setSaving(true);
    try {
      await api.post(`/invoices/${payTarget.id}/payments`, payForm);
      toast.success('Payment recorded');
      setPayTarget(null);
      setPayForm({ amount: '', method: 'cash', reference: '', note: '' });
      apiCache.invalidate('/invoices');
      apiCache.invalidate('/accounting/receivables');
      apiCache.invalidate('/accounting/summary');
      load();
      onDataChange?.();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Payment failed');
    } finally {
      setSaving(false);
    }
  };

  const exportCsv = () => {
    const header = ['Invoice #', 'Customer', 'Subtotal', 'Tax', 'Total', 'Amount Due', 'Issued', 'Due', 'Status'];
    const body = rows.map((inv: any) => [
      inv.invoice_number,
      inv.customer_name,
      parseFloat(inv.subtotal || 0).toFixed(2),
      parseFloat(inv.tax_amount || 0).toFixed(2),
      parseFloat(inv.total || 0).toFixed(2),
      parseFloat(inv.amount_due || 0).toFixed(2),
      new Date(inv.issue_date).toLocaleDateString(),
      new Date(inv.due_date).toLocaleDateString(),
      inv.status,
    ]);
    const csv = [header, ...body].map((r) => r.map((c: string | number) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `invoices-${Date.now()}.csv`;
    a.click();
  };

  const lineTotal = form.lines.reduce((s, l) => {
    const t = parseFloat(l.quantity || '0') * parseFloat(l.unit_price || '0');
    return s + t + t * (parseFloat(l.tax_rate || '0') / 100);
  }, 0);

  return (
    <div className={`space-y-5 relative ${loading && data ? 'opacity-60 pointer-events-none' : ''}`}>
      <div className="card space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-end gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="form-input pl-9" placeholder="Search invoice # or customer…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div>
            <label className="form-label">Status</label>
            <select className="form-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="partially_paid">Partially paid</option>
              <option value="overdue">Overdue</option>
              <option value="paid">Paid</option>
              <option value="void">Void</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary text-xs" onClick={load} disabled={loading}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <button type="button" className="btn-primary text-xs" onClick={() => setCreateOpen(true)}>
              <Plus className="w-3.5 h-3.5" /> New invoice
            </button>
            {rows.length > 0 && (
              <button type="button" className="btn-secondary text-xs" onClick={exportCsv}>
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
            )}
          </div>
        </div>
      </div>

      {loading && !data && <Spinner />}

      {data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Outstanding" value={fmt(summary.total_outstanding)} icon={<CedisIcon className="w-5 h-5 text-gray-500 text-sm" />} color="bg-gray-50" />
            <StatCard label="Overdue" value={String(summary.overdue ?? 0)} icon={<FileText className="w-5 h-5 text-gray-500" />} color="bg-gray-50" />
            <StatCard label="Draft" value={String(summary.draft ?? 0)} icon={<FileText className="w-5 h-5 text-gray-500" />} color="bg-gray-50" />
            <StatCard label="Total billed" value={fmt(summary.total_billed)} icon={<CedisIcon className="w-5 h-5 text-gray-500 text-sm" />} color="bg-gray-50" sub={`${summary.count ?? 0} invoices`} />
          </div>

          {rows.length === 0 ? (
            <EmptyState message="No invoices match your filters" icon={<FileText className="w-8 h-8 text-gray-300" />} />
          ) : (
            <div className="card p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs md:text-sm">
                  <thead className="table-header">
                    <tr>
                      {['Invoice #', 'Customer', 'Subtotal', 'Tax', 'Total', 'Due', 'Issued', 'Due date', 'Status', ''].map((h) => (
                        <th key={h} className="px-3 md:px-4 py-2 text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {rows.map((inv: any) => (
                      <tr key={inv.id} className={`hover:bg-gray-50/80 ${inv.status === 'void' ? 'opacity-50' : ''}`}>
                        <td className="px-3 md:px-4 py-2 font-mono text-xs text-[#0D3B6E]">{inv.invoice_number}</td>
                        <td className="px-3 md:px-4 py-2 font-medium">
                          <div>{inv.customer_name}</div>
                          {inv.customer_email && <div className="text-xs text-gray-400 hidden md:block">{inv.customer_email}</div>}
                        </td>
                        <td className="px-3 md:px-4 py-2 tabular-nums hidden lg:table-cell">{fmt(inv.subtotal)}</td>
                        <td className="px-3 md:px-4 py-2 tabular-nums text-gray-500 hidden lg:table-cell">{fmt(inv.tax_amount)}</td>
                        <td className="px-3 md:px-4 py-2 font-semibold tabular-nums">{fmt(inv.total)}</td>
                        <td className="px-3 md:px-4 py-2 tabular-nums font-semibold">{fmt(inv.amount_due)}</td>
                        <td className="px-3 md:px-4 py-2 text-xs text-gray-400 hidden md:table-cell">{new Date(inv.issue_date).toLocaleDateString()}</td>
                        <td className="px-3 md:px-4 py-2 text-xs text-gray-400 hidden lg:table-cell">{new Date(inv.due_date).toLocaleDateString()}</td>
                        <td className="px-3 md:px-4 py-2">
                          <span className="text-xs text-gray-600 capitalize">{inv.status.replace('_', ' ')}</span>
                        </td>
                        <td className="px-3 md:px-4 py-2">
                          <div className="flex flex-wrap gap-1 justify-end">
                            {inv.status === 'draft' && (
                              <button type="button" onClick={() => sendInvoice(inv.id)} className="text-xs font-semibold text-white bg-[#0D3B6E] hover:bg-[#1A5294] px-2 py-1 rounded-lg">Send</button>
                            )}
                            {['sent', 'partially_paid', 'overdue'].includes(inv.status) && (
                              <button type="button" onClick={() => { setPayTarget(inv); setPayForm({ amount: String(inv.amount_due), method: 'cash', reference: '', note: '' }); }} className="text-xs font-semibold text-white bg-green-600 hover:bg-green-700 px-2 py-1 rounded-lg">Pay</button>
                            )}
                            {inv.payments?.length > 0 && (
                              <button type="button" onClick={() => setHistoryTarget(inv)} className="text-xs text-[#0D3B6E] hover:bg-[#0D3B6E]/8 px-2 py-1 rounded hidden md:inline-block">History</button>
                            )}
                            {['draft', 'sent', 'overdue'].includes(inv.status) && (
                              <button type="button" onClick={() => voidInvoice(inv.id)} className="text-xs text-red-500 hover:bg-red-50 px-2 py-1 rounded hidden md:inline-block">Void</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New invoice" size="lg">
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><label className="form-label">Customer name *</label><input className="form-input" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /></div>
            <div><label className="form-label">Customer email</label><input type="email" className="form-input" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><label className="form-label">Due date *</label><input type="date" className="form-input" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
            <div><label className="form-label">Notes</label><input className="form-input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <div className="border-t pt-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-sm">Line items</h4>
              <button type="button" className="btn-secondary py-1 text-xs" onClick={() => setForm({ ...form, lines: [...form.lines, { ...EMPTY_LINE }] })}><Plus className="w-3 h-3" /> Add line</button>
            </div>
            <div className="space-y-2">
              {form.lines.map((line, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <input className="form-input col-span-12 md:col-span-5" placeholder="Description" value={line.description} onChange={(e) => { const l = [...form.lines]; l[i] = { ...l[i], description: e.target.value }; setForm({ ...form, lines: l }); }} />
                  <input type="number" className="form-input col-span-3 md:col-span-2" placeholder="Qty" value={line.quantity} onChange={(e) => { const l = [...form.lines]; l[i] = { ...l[i], quantity: e.target.value }; setForm({ ...form, lines: l }); }} />
                  <input type="number" className="form-input col-span-3 md:col-span-2" placeholder="Unit price" value={line.unit_price} onChange={(e) => { const l = [...form.lines]; l[i] = { ...l[i], unit_price: e.target.value }; setForm({ ...form, lines: l }); }} />
                  <input type="number" className="form-input col-span-3 md:col-span-2" placeholder="Tax %" value={line.tax_rate} onChange={(e) => { const l = [...form.lines]; l[i] = { ...l[i], tax_rate: e.target.value }; setForm({ ...form, lines: l }); }} />
                  <button type="button" className="col-span-3 md:col-span-1 p-1.5 hover:bg-red-50 rounded text-red-400" onClick={() => setForm({ ...form, lines: form.lines.filter((_, j) => j !== i) })} disabled={form.lines.length === 1}><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-2 text-sm font-semibold text-gray-700">Total: {fmt(lineTotal)}</div>
          </div>
        </div>
        <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end mt-6">
          <button type="button" className="btn-secondary" onClick={() => setCreateOpen(false)}>Cancel</button>
          <button type="button" className="btn-primary" onClick={saveInvoice} disabled={saving}>{saving ? 'Saving…' : 'Create invoice'}</button>
        </div>
      </Modal>

      <Modal open={!!payTarget} onClose={() => setPayTarget(null)} title={`Record payment — ${payTarget?.invoice_number}`} size="sm">
        <div className="space-y-3">
          <div><label className="form-label">Amount (GH₵) *</label><input type="number" className="form-input" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} /></div>
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
        <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end mt-6">
          <button type="button" className="btn-secondary" onClick={() => setPayTarget(null)}>Cancel</button>
          <button type="button" className="btn-primary" onClick={recordPayment} disabled={saving}>{saving ? 'Saving…' : 'Record payment'}</button>
        </div>
      </Modal>

      <Modal open={!!historyTarget} onClose={() => setHistoryTarget(null)} title={`Payment history — ${historyTarget?.invoice_number}`} size="xl">
        {historyTarget && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-gray-50 rounded-xl px-4 py-3"><div className="text-xs text-gray-500 mb-1">Total</div><div className="font-semibold">{fmt(historyTarget.total)}</div></div>
              <div className="bg-gray-50 rounded-xl px-4 py-3"><div className="text-xs text-gray-500 mb-1">Paid</div><div className="font-semibold text-gray-800">{fmt(historyTarget.amount_paid)}</div></div>
              <div className="bg-gray-50 rounded-xl px-4 py-3"><div className="text-xs text-gray-500 mb-1">Outstanding</div><div className="font-semibold text-gray-800">{fmt(historyTarget.amount_due)}</div></div>
            </div>
            {historyTarget.payments?.length > 0 ? (
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="table-header">
                    <tr>{['#', 'Date', 'Amount', 'Method', 'Reference', 'Note'].map((h) => <th key={h} className="px-4 py-2 text-left">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {historyTarget.payments.map((p: any, i: number) => (
                      <tr key={i}>
                        <td className="px-4 py-2 text-gray-400 text-xs">{i + 1}</td>
                        <td className="px-4 py-2 text-xs">{p.date ? new Date(p.date).toLocaleDateString() : '—'}</td>
                        <td className="px-4 py-2 font-semibold text-green-700">{fmt(p.amount)}</td>
                        <td className="px-4 py-2 text-xs text-gray-600">{(p.method || 'cash').replace('_', ' ')}</td>
                        <td className="px-4 py-2 font-mono text-xs">{p.reference || '—'}</td>
                        <td className="px-4 py-2 text-xs text-gray-500">{p.note || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-6">No payments recorded.</p>
            )}
          </div>
        )}
        <div className="flex justify-end mt-4"><button type="button" className="btn-secondary" onClick={() => setHistoryTarget(null)}>Close</button></div>
      </Modal>
    </div>
  );
}
