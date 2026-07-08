'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Plus, Search, Download, FileText, AlertTriangle, Eye, Ban, CheckCircle2, DollarSign,
} from 'lucide-react';

const CedisIcon = ({ className }: { className?: string }) => (
  <span className={`font-bold font-serif leading-none flex items-center justify-center ${className}`}>₵</span>
);
import { Modal, EmptyState, Spinner, StatCard, toast } from '@/components/ui';
import api from '@/lib/api';

function fmt(n: number | string | undefined) {
  const v = parseFloat(String(n ?? 0));
  return `GH₵ ${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  posted: 'bg-[#0D3B6E]/8 text-[#0D3B6E]',
  partially_paid: 'bg-yellow-100 text-yellow-700',
  paid: 'bg-green-100 text-green-700',
  void: 'bg-red-50 text-red-400',
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

const emptyForm = () => ({
  vendor_name: '',
  issue_date: new Date().toISOString().split('T')[0],
  due_date: '',
  description: '',
  amount: '',
  tax_rate: '0',
  expense_account_id: '',
  notes: '',
});

interface Props {
  onDataChange?: () => void;
}

export default function AccountingVendorBillsPanel({ onDataChange }: Props) {
  const [data, setData] = useState<any>(null);
  const [expenseAccounts, setExpenseAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [agingFilter, setAgingFilter] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [payTarget, setPayTarget] = useState<any>(null);
  const [payForm, setPayForm] = useState({ amount: '', method: 'bank_transfer', reference: '', note: '' });
  const [paySaving, setPaySaving] = useState(false);

  const [detailTarget, setDetailTarget] = useState<any>(null);
  const [voidTarget, setVoidTarget] = useState<any>(null);
  const [voiding, setVoiding] = useState(false);

  const statuses = data?.statuses || [];

  const loadAccounts = useCallback(async () => {
    try {
      const res = await api.get('/accounts');
      setExpenseAccounts((res.data.data || []).filter((a: any) => a.type === 'expense' && !a.is_group));
    } catch {
      setExpenseAccounts([]);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ view: 'full' });
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter) params.set('status', statusFilter);
      if (agingFilter) params.set('aging_bucket', agingFilter);
      const res = await api.get(`/vendor-bills?${params.toString()}`);
      setData(res.data.data);
    } catch {
      toast.error('Could not load vendor bills');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, agingFilter]);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const saveBill = async () => {
    if (!form.vendor_name.trim() || !form.due_date || !form.amount) {
      setError('Vendor name, due date, and amount are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.post('/vendor-bills', {
        vendor_name: form.vendor_name.trim(),
        issue_date: form.issue_date,
        due_date: form.due_date,
        notes: form.notes,
        expense_account_id: form.expense_account_id || null,
        lines: [{
          description: form.description || 'Vendor bill',
          quantity: 1,
          unit_price: parseFloat(form.amount),
          tax_rate: parseFloat(form.tax_rate) || 0,
        }],
      });
      toast.success('Vendor bill created');
      setModalOpen(false);
      load();
      onDataChange?.();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  const postBill = async (bill: any) => {
    try {
      await api.patch(`/vendor-bills/${bill.id}/post`);
      toast.success('Bill posted — Dr expense, Cr AP (2001)');
      load();
      onDataChange?.();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Post failed');
    }
  };

  const recordPayment = async () => {
    if (!payTarget) return;
    setPaySaving(true);
    try {
      await api.post(`/vendor-bills/${payTarget.id}/payments`, payForm);
      toast.success('Payment recorded — Dr AP, Cr Cash');
      setPayTarget(null);
      setPayForm({ amount: '', method: 'bank_transfer', reference: '', note: '' });
      load();
      onDataChange?.();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Payment failed');
    } finally {
      setPaySaving(false);
    }
  };

  const confirmVoid = async () => {
    if (!voidTarget) return;
    setVoiding(true);
    try {
      await api.patch(`/vendor-bills/${voidTarget.id}/void`);
      toast.success('Vendor bill voided');
      setVoidTarget(null);
      load();
      onDataChange?.();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Void failed');
    } finally {
      setVoiding(false);
    }
  };

  const exportCsv = () => {
    const rows = data?.bills || [];
    const header = ['Bill #', 'Vendor', 'Total', 'Amount Due', 'Due', 'Status', 'GL Ref', 'Expense Account'];
    const body = rows.map((b: any) => [
      b.bill_number,
      b.vendor_name,
      parseFloat(b.total || 0).toFixed(2),
      parseFloat(b.amount_due || 0).toFixed(2),
      new Date(b.due_date).toLocaleDateString(),
      b.status,
      b.gl_reference || '',
      b.expense_account_code || '',
    ]);
    const csv = [header, ...body].map((r) => r.map((c: string | number) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `vendor-bills-${Date.now()}.csv`;
    a.click();
  };

  if (loading && !data) return <Spinner />;

  const summary = data?.summary || {};
  const bills: any[] = data?.bills || [];
  const aging = summary.aging || {};

  return (
    <div className={`space-y-5 relative ${loading ? 'opacity-60 pointer-events-none' : ''}`}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total bills" value={String(summary.count ?? 0)} icon={<FileText className="w-5 h-5 text-[#0D3B6E]" />} color="bg-[#0D3B6E]/8" sub={`${summary.draft ?? 0} draft · ${summary.open ?? 0} open`} />
        <StatCard label="Outstanding" value={fmt(summary.total_outstanding)} icon={<CedisIcon className="w-5 h-5 text-red-600 text-sm" />} color="bg-red-50" sub="Posted & partially paid" />
        <StatCard label="Overdue" value={String(summary.overdue ?? 0)} icon={<AlertTriangle className="w-5 h-5 text-orange-600" />} color="bg-orange-50" sub="Past due date" />
        <StatCard label="Paid" value={String(summary.paid ?? 0)} icon={<CheckCircle2 className="w-5 h-5 text-green-600" />} color="bg-green-50" sub={`${summary.mtd_posted ?? 0} posted MTD`} />
      </div>

      {(summary.open ?? 0) > 0 && (
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
              <div className="text-xs mt-1">{aging[key]?.count || 0} bill{(aging[key]?.count || 0) !== 1 ? 's' : ''}</div>
            </button>
          ))}
        </div>
      )}

      <div className="card space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input className="form-input pl-9" placeholder="Search bill #, vendor, GL ref…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="form-input w-full lg:w-44" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {statuses.map((s: any) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary text-xs" onClick={exportCsv} disabled={!bills.length}>
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button type="button" className="btn-primary text-xs" onClick={() => { setForm(emptyForm()); setError(''); setModalOpen(true); }}>
              <Plus className="w-3.5 h-3.5" /> New bill
            </button>
          </div>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        {bills.length === 0 ? (
          <EmptyState
            message="No vendor bills"
            description="Record supplier invoices without a purchase order — post to AP when ready."
            icon={<FileText className="w-8 h-8 text-gray-300" />}
            action={{ label: 'New bill', onClick: () => { setForm(emptyForm()); setModalOpen(true); } }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs md:text-sm">
              <thead className="table-header">
                <tr>
                  {['Bill #', 'Vendor', 'Total', 'Due', 'Outstanding', 'GL', 'Status', ''].map((h) => (
                    <th key={h || 'actions'} className="px-3 md:px-4 py-2 md:py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {bills.map((b) => (
                  <tr key={b.id} className={`hover:bg-gray-50/80 ${b.status === 'void' ? 'opacity-60' : ''}`}>
                    <td className="px-3 md:px-4 py-2 md:py-3 font-mono text-xs text-[#0D3B6E]">{b.bill_number}</td>
                    <td className="px-3 md:px-4 py-2 md:py-3 font-medium">{b.vendor_name}</td>
                    <td className="px-3 md:px-4 py-2 md:py-3 tabular-nums">{fmt(b.total)}</td>
                    <td className="px-3 md:px-4 py-2 md:py-3 text-gray-500 whitespace-nowrap hidden md:table-cell">{new Date(b.due_date).toLocaleDateString()}</td>
                    <td className="px-3 md:px-4 py-2 md:py-3 font-semibold text-red-600 tabular-nums">{parseFloat(b.amount_due) > 0 ? fmt(b.amount_due) : '—'}</td>
                    <td className="px-3 md:px-4 py-2 md:py-3 font-mono text-xs hidden lg:table-cell">{b.gl_reference || (b.status === 'draft' ? '—' : 'Pending')}</td>
                    <td className="px-3 md:px-4 py-2 md:py-3">
                      <span className={`badge text-xs ${STATUS_COLORS[b.status] || 'bg-gray-100 text-gray-600'}`}>{b.status.replace('_', ' ')}</span>
                    </td>
                    <td className="px-3 md:px-4 py-2 md:py-3">
                      <div className="flex gap-1 justify-end">
                        <button type="button" onClick={() => setDetailTarget(b)} className="p-1.5 hover:bg-gray-100 rounded text-gray-500" title="View">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {b.status === 'draft' && (
                          <>
                            <button type="button" onClick={() => postBill(b)} className="text-xs font-semibold text-white bg-[#0D3B6E] hover:bg-[#1A5294] px-2 py-1 rounded-lg">Post</button>
                            <button type="button" onClick={() => setVoidTarget(b)} className="p-1.5 hover:bg-red-50 rounded text-red-400" title="Void">
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        {['posted', 'partially_paid'].includes(b.status) && parseFloat(b.amount_due) > 0 && (
                          <button
                            type="button"
                            onClick={() => { setPayTarget(b); setPayForm({ amount: String(b.amount_due), method: 'bank_transfer', reference: '', note: '' }); }}
                            className="text-xs font-semibold text-white bg-green-600 hover:bg-green-700 px-2 py-1 rounded-lg"
                          >
                            Pay
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400">
        Posting creates: Dr expense account · Cr Accounts Payable (2001). Payment: Dr AP · Cr Cash (1001).
      </p>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New vendor bill" size="lg">
        {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm mb-4">{error}</div>}
        <div className="space-y-3">
          <div><label className="form-label">Vendor name *</label><input className="form-input" value={form.vendor_name} onChange={(e) => setForm({ ...form, vendor_name: e.target.value })} /></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><label className="form-label">Issue date</label><input type="date" className="form-input" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} /></div>
            <div><label className="form-label">Due date *</label><input type="date" className="form-input" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
          </div>
          <div><label className="form-label">Line description</label><input className="form-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Office supplies" /></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><label className="form-label">Amount (GH₵) *</label><input type="number" step="0.01" className="form-input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
            <div><label className="form-label">VAT %</label><input type="number" step="0.01" className="form-input" value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: e.target.value })} /></div>
          </div>
          <div>
            <label className="form-label">Expense GL account</label>
            <select className="form-input" value={form.expense_account_id} onChange={(e) => setForm({ ...form, expense_account_id: e.target.value })}>
              <option value="">Default — Other expenses (5900)</option>
              {expenseAccounts.map((a) => (
                <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
              ))}
            </select>
          </div>
          <div><label className="form-label">Notes</label><textarea className="form-input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
          <button type="button" className="btn-primary" onClick={saveBill} disabled={saving}>{saving ? 'Saving…' : 'Create bill'}</button>
        </div>
      </Modal>

      <Modal open={!!payTarget} onClose={() => setPayTarget(null)} title={`Pay ${payTarget?.bill_number}`} size="sm">
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
                {['bank_transfer', 'cash', 'cheque', 'mobile_money', 'card'].map((m) => (
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

      <Modal open={!!detailTarget} onClose={() => setDetailTarget(null)} title={detailTarget?.bill_number} size="md">
        {detailTarget && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-gray-500">Vendor</span><p className="font-medium">{detailTarget.vendor_name}</p></div>
              <div><span className="text-gray-500">Status</span><p className="capitalize">{detailTarget.status.replace('_', ' ')}</p></div>
              <div><span className="text-gray-500">Total</span><p>{fmt(detailTarget.total)}</p></div>
              <div><span className="text-gray-500">Amount due</span><p className="text-red-600 font-semibold">{fmt(detailTarget.amount_due)}</p></div>
              <div><span className="text-gray-500">Expense account</span><p className="font-mono text-xs">{detailTarget.expense_account_code} — {detailTarget.expense_account_name}</p></div>
              <div><span className="text-gray-500">GL reference</span><p className="font-mono text-xs">{detailTarget.gl_reference || '—'}</p></div>
            </div>
            {detailTarget.lines?.length > 0 && (
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="table-header"><tr><th className="px-3 py-2 text-left">Description</th><th className="px-3 py-2 text-right">Total</th></tr></thead>
                  <tbody>
                    {detailTarget.lines.map((l: any, i: number) => (
                      <tr key={i} className="border-t"><td className="px-3 py-2">{l.description}</td><td className="px-3 py-2 text-right">{fmt(l.total)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {detailTarget.payments?.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Payments</h4>
                <div className="border rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="table-header"><tr><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-right">Amount</th><th className="px-3 py-2 text-left">Method</th></tr></thead>
                    <tbody>
                      {detailTarget.payments.map((p: any, i: number) => (
                        <tr key={i} className="border-t">
                          <td className="px-3 py-2">{new Date(p.date).toLocaleDateString()}</td>
                          <td className="px-3 py-2 text-right text-green-700">{fmt(p.amount)}</td>
                          <td className="px-3 py-2 capitalize">{p.method?.replace('_', ' ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal open={!!voidTarget} onClose={() => setVoidTarget(null)} title="Void draft bill?" size="sm">
        <p className="text-sm text-gray-600 mb-4">Void <strong>{voidTarget?.bill_number}</strong>? This cannot be undone.</p>
        <div className="flex gap-3 justify-end">
          <button type="button" className="btn-secondary" onClick={() => setVoidTarget(null)} disabled={voiding}>Cancel</button>
          <button type="button" className="btn-primary bg-red-600 hover:bg-red-700" onClick={confirmVoid} disabled={voiding}>{voiding ? 'Voiding…' : 'Void bill'}</button>
        </div>
      </Modal>
    </div>
  );
}
