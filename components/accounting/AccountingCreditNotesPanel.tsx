'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Plus, Search, Download, FileText, RotateCcw, Eye, DollarSign,
} from 'lucide-react';

const CedisIcon = ({ className }: { className?: string }) => (
  <span className={`font-bold font-serif leading-none flex items-center justify-center ${className}`}>₵</span>
);
import { Modal, EmptyState, Spinner, StatCard, toast } from '@/components/ui';
import api, { apiCache } from '@/lib/api';
import HrConfirmModal from '@/components/hr/HrConfirmModal';

function fmt(n: number | string | undefined) {
  const v = parseFloat(String(n ?? 0));
  return `GH₵ ${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface Props {
  onDataChange?: () => void;
}

export default function AccountingCreditNotesPanel({ onDataChange }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ invoice_id: '', amount: '', reason: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [detailTarget, setDetailTarget] = useState<any>(null);

  const load = useCallback(async (silent = false) => {
    const params = new URLSearchParams({ view: 'full' });
    if (search.trim()) params.set('search', search.trim());
    const key = `/credit-notes?${params.toString()}`;
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
      if (!cached) toast.error('Could not load credit notes');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const selectedInvoice = (data?.eligible_invoices || []).find((i: any) => i.id === form.invoice_id);

  const openAdd = () => {
    setForm({ invoice_id: '', amount: '', reason: '' });
    setError('');
    setModalOpen(true);
  };

  const requestSubmit = () => {
    if (!form.invoice_id || !form.amount || !form.reason.trim()) {
      setError('Invoice, amount, and reason are required.');
      return;
    }
    const amt = parseFloat(form.amount);
    if (amt <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    if (selectedInvoice && amt > parseFloat(selectedInvoice.amount_paid)) {
      setError(`Amount cannot exceed paid amount (${fmt(selectedInvoice.amount_paid)}).`);
      return;
    }
    setError('');
    setConfirmOpen(true);
  };

  const submit = async () => {
    setSaving(true);
    try {
      await api.post('/credit-notes', {
        invoice_id: form.invoice_id,
        amount: parseFloat(form.amount),
        reason: form.reason.trim(),
      });
      toast.success('Credit note applied — GL reversal posted');
      setConfirmOpen(false);
      setModalOpen(false);
      setForm({ invoice_id: '', amount: '', reason: '' });
      apiCache.invalidate('/credit-notes');
      apiCache.invalidate('/accounting/summary');
      load();
      onDataChange?.();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed');
      throw e;
    } finally {
      setSaving(false);
    }
  };

  const exportCsv = () => {
    const rows = data?.credit_notes || [];
    const header = ['Credit note', 'Invoice', 'Customer', 'Amount', 'Reason', 'Date', 'GL ref'];
    const body = rows.map((n: any) => [
      n.credit_note_number,
      n.invoice_number || '',
      n.customer_name,
      parseFloat(n.amount || 0).toFixed(2),
      n.reason,
      new Date(n.createdAt).toLocaleDateString(),
      n.gl_reference || '',
    ]);
    const csv = [header, ...body].map((r) => r.map((c: string | number) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `credit-notes-${Date.now()}.csv`;
    a.click();
  };

  if (loading && !data) return <Spinner />;

  const summary = data?.summary || {};
  const notes: any[] = data?.credit_notes || [];
  const eligibleInvoices: any[] = data?.eligible_invoices || [];

  return (
    <div className={`space-y-5 relative ${loading ? 'opacity-60 pointer-events-none' : ''}`}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Credit notes" value={String(summary.count ?? 0)} icon={<RotateCcw className="w-5 h-5 text-purple-600" />} color="bg-purple-50" sub={`${summary.applied ?? 0} applied`} />
        <StatCard label="Total credited" value={fmt(summary.total_credited)} icon={<CedisIcon className="w-5 h-5 text-red-600 text-sm" />} color="bg-red-50" sub="All time" />
        <StatCard label="Month to date" value={String(summary.mtd_count ?? 0)} icon={<FileText className="w-5 h-5 text-[#0D3B6E]" />} color="bg-[#0D3B6E]/8" sub={fmt(summary.mtd_amount)} />
        <StatCard label="Eligible invoices" value={String(eligibleInvoices.length)} icon={<FileText className="w-5 h-5 text-[#0D3B6E]" />} color="bg-[#0D3B6E]/8" sub="With payments to refund" />
      </div>

      <div className="card space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input className="form-input pl-9" placeholder="Search credit note, invoice, customer…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary text-xs" onClick={exportCsv} disabled={!notes.length}>
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button type="button" className="btn-primary text-xs" onClick={openAdd} disabled={!eligibleInvoices.length}>
              <Plus className="w-3.5 h-3.5" /> New credit note
            </button>
          </div>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        {notes.length === 0 ? (
          <EmptyState
            message="No credit notes yet"
            description="Issue a credit note against a paid invoice to reverse revenue and refund cash."
            icon={<RotateCcw className="w-8 h-8 text-gray-300" />}
            action={eligibleInvoices.length ? { label: 'New credit note', onClick: openAdd } : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs md:text-sm">
              <thead className="table-header">
                <tr>
                  {['Credit note', 'Invoice', 'Customer', 'Amount', 'Reason', 'Date', 'GL', ''].map((h) => (
                    <th key={h || 'actions'} className="px-3 md:px-4 py-2 md:py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {notes.map((n) => (
                  <tr key={n.id} className="hover:bg-gray-50/80">
                    <td className="px-3 md:px-4 py-2 md:py-3 font-mono text-xs text-[#0D3B6E]">{n.credit_note_number}</td>
                    <td className="px-3 md:px-4 py-2 md:py-3 font-mono text-xs text-[#0D3B6E]">{n.invoice_number || '—'}</td>
                    <td className="px-3 md:px-4 py-2 md:py-3 font-medium">{n.customer_name}</td>
                    <td className="px-3 md:px-4 py-2 md:py-3 font-semibold text-red-600 tabular-nums">{fmt(n.amount)}</td>
                    <td className="px-3 md:px-4 py-2 md:py-3 text-gray-500 max-w-[160px] truncate hidden md:table-cell">{n.reason}</td>
                    <td className="px-3 md:px-4 py-2 md:py-3 text-gray-400 whitespace-nowrap hidden sm:table-cell">{new Date(n.createdAt).toLocaleDateString()}</td>
                    <td className="px-3 md:px-4 py-2 md:py-3 font-mono text-xs hidden lg:table-cell">{n.gl_reference || '—'}</td>
                    <td className="px-3 md:px-4 py-2 md:py-3">
                      <button type="button" onClick={() => setDetailTarget(n)} className="p-1.5 hover:bg-gray-100 rounded text-gray-500">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400">
        Credit notes reverse revenue (Dr 4001), VAT if applicable, and refund cash (Cr 1001). Invoice paid balance is reduced.
      </p>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New credit note" size="md">
        {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm mb-4">{error}</div>}
        <div className="space-y-3">
          <div>
            <label className="form-label">Invoice (with payments) *</label>
            <select className="form-input" value={form.invoice_id} onChange={(e) => {
              const inv = eligibleInvoices.find((i: any) => i.id === e.target.value);
              setForm({ ...form, invoice_id: e.target.value, amount: inv ? String(inv.amount_paid) : '' });
            }}>
              <option value="">Select invoice</option>
              {eligibleInvoices.map((i: any) => (
                <option key={i.id} value={i.id}>
                  {i.invoice_number} — {i.customer_name} (paid {fmt(i.amount_paid)})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Credit amount (GH₵) *</label>
            <input type="number" step="0.01" className="form-input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} max={selectedInvoice?.amount_paid} />
            {selectedInvoice && (
              <p className="text-xs text-gray-400 mt-1">Max refund: {fmt(selectedInvoice.amount_paid)}</p>
            )}
          </div>
          <div>
            <label className="form-label">Reason *</label>
            <textarea className="form-input" rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="e.g. Goods returned — defective batch" />
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
          <button type="button" className="btn-primary" onClick={requestSubmit}>Continue</button>
        </div>
      </Modal>

      <HrConfirmModal
        open={confirmOpen}
        title="Issue credit note?"
        message={`Refund ${fmt(form.amount)} against ${selectedInvoice?.invoice_number}. GL entries will be posted.`}
        confirmLabel="Issue credit note"
        saving={saving}
        details={[
          { label: 'Invoice', value: selectedInvoice?.invoice_number || '—' },
          { label: 'Customer', value: selectedInvoice?.customer_name || '—' },
          { label: 'Amount', value: fmt(form.amount) },
          { label: 'Reason', value: form.reason },
        ]}
        onClose={() => setConfirmOpen(false)}
        onConfirm={submit}
      />

      <Modal open={!!detailTarget} onClose={() => setDetailTarget(null)} title={detailTarget?.credit_note_number} size="md">
        {detailTarget && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-gray-500">Invoice</span><p className="font-mono text-xs">{detailTarget.invoice_number || '—'}</p></div>
              <div><span className="text-gray-500">Customer</span><p>{detailTarget.customer_name}</p></div>
              <div><span className="text-gray-500">Amount</span><p className="text-red-600 font-semibold">{fmt(detailTarget.amount)}</p></div>
              <div><span className="text-gray-500">Status</span><p className="capitalize">{detailTarget.status}</p></div>
              <div className="col-span-2"><span className="text-gray-500">Reason</span><p>{detailTarget.reason}</p></div>
              <div><span className="text-gray-500">GL reference</span><p className="font-mono text-xs">{detailTarget.gl_reference || '—'}</p></div>
              <div><span className="text-gray-500">Created</span><p>{new Date(detailTarget.createdAt).toLocaleDateString()}</p></div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
