'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus, Search, Download, Edit2, Trash2, Receipt, FileText,
  TrendingDown, Paperclip, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import { Modal, EmptyState, Spinner, StatCard, toast } from '@/components/ui';
import api from '@/lib/api';
import HrConfirmModal from '@/components/hr/HrConfirmModal';

type PeriodKey = 'all' | 'mtd' | 'ytd' | 'custom';

function fmt(n: number | string | undefined) {
  const v = parseFloat(String(n ?? 0));
  return `GH₵ ${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function periodRange(key: PeriodKey, customFrom: string, customTo: string) {
  const now = new Date();
  if (key === 'mtd') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: from.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) };
  }
  if (key === 'ytd') {
    const from = new Date(now.getFullYear(), 0, 1);
    return { from: from.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) };
  }
  if (key === 'custom') {
    return { from: customFrom || '', to: customTo || '' };
  }
  return { from: '', to: '' };
}

interface Props {
  onDataChange?: () => void;
}

const emptyForm = () => ({
  title: '',
  category: '',
  amount: '',
  account_id: '',
  description: '',
  expense_date: new Date().toISOString().split('T')[0],
  receipt: null as { file: string; mime_type: string; name: string } | null,
});

export default function AccountingExpensesPanel({ onDataChange }: Props) {
  const [data, setData] = useState<any>(null);
  const [expenseAccounts, setExpenseAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [period, setPeriod] = useState<PeriodKey>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  const categories = data?.categories || [];

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
      const { from, to } = periodRange(period, customFrom, customTo);
      const params = new URLSearchParams({ view: 'full' });
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (categoryFilter) params.set('category', categoryFilter);
      if (search.trim()) params.set('search', search.trim());
      const res = await api.get(`/expenses?${params.toString()}`);
      setData(res.data.data);
    } catch {
      toast.error('Could not load expenses');
    } finally {
      setLoading(false);
    }
  }, [period, customFrom, customTo, categoryFilter, search]);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const accountByCode = useMemo(
    () => Object.fromEntries(expenseAccounts.map((a) => [a.code, a])),
    [expenseAccounts],
  );

  const onCategoryChange = (category: string) => {
    const catMeta = categories.find((c: any) => c.value === category);
    const next = { ...form, category };
    if (catMeta?.account_code && accountByCode[catMeta.account_code]) {
      next.account_id = accountByCode[catMeta.account_code].id;
    }
    setForm(next);
  };

  const openAdd = () => {
    setSelected(null);
    setForm(emptyForm());
    setError('');
    setModalOpen(true);
  };

  const openEdit = (e: any) => {
    setSelected(e);
    setForm({
      title: e.title,
      category: e.category || '',
      amount: String(e.amount),
      account_id: e.account_id || '',
      description: e.description || '',
      expense_date: e.expense_date?.split('T')[0] ?? new Date().toISOString().split('T')[0],
      receipt: e.receipt || null,
    });
    setError('');
    setModalOpen(true);
  };

  const handleReceiptUpload = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Receipt must be 5MB or less');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({
      ...f,
      receipt: { file: reader.result as string, mime_type: file.type, name: file.name },
    }));
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (!form.title.trim()) {
      setError('Title is required.');
      return;
    }
    if (!form.amount || parseFloat(form.amount) <= 0) {
      setError('Enter a valid amount greater than zero.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (selected) await api.put(`/expenses/${selected.id}`, form);
      else await api.post('/expenses', form);
      toast.success(selected ? 'Expense updated' : 'Expense recorded and posted to GL');
      setModalOpen(false);
      load();
      onDataChange?.();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/expenses/${deleteTarget.id}`);
      toast.success('Expense deleted and GL entry voided');
      setDeleteTarget(null);
      load();
      onDataChange?.();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const exportCsv = () => {
    const rows = data?.expenses || [];
    const header = ['Date', 'Title', 'Category', 'GL Account', 'Amount', 'GL Reference', 'Recorded By', 'Has Receipt'];
    const body = rows.map((e: any) => [
      new Date(e.expense_date).toLocaleDateString(),
      e.title,
      e.category || '',
      e.account_code ? `${e.account_code} ${e.account_name}` : '',
      parseFloat(e.amount).toFixed(2),
      e.gl_reference || '',
      e.created_by?.name || '',
      e.receipt?.file ? 'Yes' : 'No',
    ]);
    const csv = [header, ...body].map((r) => r.map((c: string | number) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `expenses-${Date.now()}.csv`;
    a.click();
  };

  if (loading && !data) return <Spinner />;

  const summary = data?.summary || {};
  const expenses: any[] = data?.expenses || [];

  return (
    <div className={`space-y-5 relative ${loading ? 'opacity-60 pointer-events-none' : ''}`}>
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total (filtered)" value={fmt(summary.total)} icon={<TrendingDown className="w-5 h-5 text-red-600" />} color="bg-red-50" sub={`${summary.count || 0} records`} />
        <StatCard label="Month to date" value={fmt(summary.mtd)} icon={<Receipt className="w-5 h-5 text-amber-600" />} color="bg-amber-50" sub="Calendar month" />
        <StatCard label="Year to date" value={fmt(summary.ytd)} icon={<Receipt className="w-5 h-5 text-[#0D3B6E]" />} color="bg-[#0D3B6E]/8" sub="Calendar year" />
        <StatCard label="GL posted" value={summary.posted ?? 0} icon={<CheckCircle2 className="w-5 h-5 text-[#0D3B6E]" />} color="bg-[#0D3B6E]/8" sub={`${summary.with_receipts || 0} with receipts`} />
      </div>

      {(summary.unposted || 0) > 0 && (
        <div className="card flex items-start gap-3 border-l-4 border-l-amber-500 py-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-gray-700">
            {summary.unposted} expense{summary.unposted !== 1 ? 's' : ''} missing a GL journal link — edit and save to re-post.
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="card space-y-3">
        <div className="flex flex-wrap gap-2">
          {([
            { key: 'all', label: 'All' },
            { key: 'mtd', label: 'MTD' },
            { key: 'ytd', label: 'YTD' },
            { key: 'custom', label: 'Custom' },
          ] as { key: PeriodKey; label: string }[]).map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                period === p.key ? 'bg-[#0D3B6E] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {period === 'custom' && (
          <div className="flex flex-wrap gap-3 items-end">
            <div><label className="form-label">From</label><input type="date" className="form-input" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} /></div>
            <div><label className="form-label">To</label><input type="date" className="form-input" value={customTo} onChange={(e) => setCustomTo(e.target.value)} /></div>
          </div>
        )}
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input className="form-input pl-9" placeholder="Search title, category, GL ref…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="form-input w-full lg:w-44" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">All categories</option>
            {categories.map((c: any) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary text-xs" onClick={exportCsv} disabled={!expenses.length}>
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button type="button" className="btn-primary text-xs" onClick={openAdd}>
              <Plus className="w-3.5 h-3.5" /> Record expense
            </button>
          </div>
        </div>
      </div>

      {/* Category breakdown */}
      {summary.by_category?.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-800 text-sm mb-3">By category (filtered)</h3>
          <div className="flex flex-wrap gap-2">
            {summary.by_category.slice(0, 8).map((c: any) => (
              <button
                key={c.category}
                type="button"
                onClick={() => setCategoryFilter(c.category.toLowerCase())}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700"
              >
                {c.category}: {fmt(c.total)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {expenses.length === 0 ? (
          <EmptyState
            message="No expenses in this period"
            description="Record an expense — it will post Dr expense account, Cr Cash (1001)."
            icon={<Receipt className="w-8 h-8 text-gray-300" />}
            action={{ label: 'Record expense', onClick: openAdd }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs md:text-sm">
              <thead className="table-header">
                <tr>
                  {['Date', 'Title', 'Category', 'GL Account', 'Amount', 'GL Ref', 'By', 'Receipt', ''].map((h) => (
                    <th key={h || 'actions'} className="px-3 md:px-4 py-2 md:py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50/80">
                    <td className="px-3 md:px-4 py-2 md:py-3 text-gray-500 whitespace-nowrap">{new Date(e.expense_date).toLocaleDateString()}</td>
                    <td className="px-3 md:px-4 py-2 md:py-3">
                      <div className="font-medium text-gray-900">{e.title}</div>
                      {e.description && <div className="text-xs text-gray-400 truncate max-w-[160px]">{e.description}</div>}
                    </td>
                    <td className="px-3 md:px-4 py-2 md:py-3 text-gray-600">{e.category || '—'}</td>
                    <td className="px-3 md:px-4 py-2 md:py-3 text-xs whitespace-nowrap">
                      {e.account_code
                        ? <span className="font-mono text-gray-600">{e.account_code}</span>
                        : <span className="text-gray-300">Auto</span>}
                    </td>
                    <td className="px-3 md:px-4 py-2 md:py-3 font-semibold text-red-600 tabular-nums whitespace-nowrap">{fmt(e.amount)}</td>
                    <td className="px-3 md:px-4 py-2 md:py-3 font-mono text-xs text-[#0D3B6E] hidden md:table-cell">
                      {e.gl_reference || (e.is_posted ? '—' : <span className="text-amber-600">Unposted</span>)}
                    </td>
                    <td className="px-3 md:px-4 py-2 md:py-3 text-gray-500 hidden lg:table-cell">{e.created_by?.name || '—'}</td>
                    <td className="px-3 md:px-4 py-2 md:py-3 hidden sm:table-cell">
                      {e.receipt?.file ? (
                        <a href={e.receipt.file} download={e.receipt.name} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#0D3B6E] hover:underline">
                          <Paperclip className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[80px]">{e.receipt.name}</span>
                        </a>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 md:px-4 py-2 md:py-3">
                      <div className="flex gap-1 justify-end">
                        <button type="button" onClick={() => openEdit(e)} className="p-1.5 hover:bg-gray-100 rounded text-gray-500" title="Edit">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => setDeleteTarget(e)} className="p-1.5 hover:bg-red-50 rounded text-red-400" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
        Each expense posts to the general ledger: debit expense account, credit Cash &amp; Bank (1001). Updates void and re-post the journal entry.
      </p>

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={selected ? 'Edit Expense' : 'Record Expense'} size="lg">
        {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm mb-4">{error}</div>}
        <div className="space-y-3">
          <div>
            <label className="form-label">Title *</label>
            <input className="form-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Office rent — March" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="form-label">Category</label>
              <select className="form-input" value={form.category} onChange={(e) => onCategoryChange(e.target.value)}>
                <option value="">Select category</option>
                {categories.map((c: any) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Amount (GH₵) *</label>
              <input type="number" step="0.01" min="0" className="form-input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="form-label">Expense GL account</label>
              <select className="form-input" value={form.account_id} onChange={(e) => setForm({ ...form, account_id: e.target.value })}>
                <option value="">Auto from category</option>
                {expenseAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Date</label>
              <input type="date" className="form-input" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="form-label">Description</label>
            <textarea className="form-input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="form-label">Receipt / attachment</label>
            {form.receipt?.file ? (
              <div className="flex items-center gap-3 p-3 bg-[#0D3B6E]/8 border border-[#0D3B6E]/20 rounded-xl">
                {form.receipt.mime_type?.startsWith('image/') ? (
                  <img src={form.receipt.file} alt="receipt" className="w-12 h-12 object-cover rounded-lg border border-[#0D3B6E]/20" />
                ) : (
                  <div className="w-12 h-12 bg-[#0D3B6E]/8 rounded-lg flex items-center justify-center"><FileText className="w-6 h-6 text-[#0D3B6E]" /></div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-700 truncate">{form.receipt.name}</p>
                  <a href={form.receipt.file} download={form.receipt.name} target="_blank" rel="noreferrer" className="text-xs text-[#0D3B6E] hover:underline">Download</a>
                </div>
                <button type="button" onClick={() => setForm({ ...form, receipt: null })} className="text-red-400 hover:text-red-600 text-xs font-semibold px-2 py-1 rounded hover:bg-red-50">Remove</button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-[#0D3B6E]/40 hover:bg-[#0D3B6E]/8 transition-colors">
                <Download className="w-5 h-5 text-gray-400 mb-1" />
                <span className="text-xs text-gray-500">Click to upload receipt</span>
                <span className="text-xs text-gray-400">PNG, JPG, PDF up to 5MB</span>
                <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleReceiptUpload(f); }} />
              </label>
            )}
          </div>
          <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
            Saving posts: <strong>Dr</strong> selected expense account · <strong>Cr</strong> Cash &amp; Bank (1001)
          </p>
        </div>
        <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end mt-6">
          <button type="button" className="btn-secondary w-full sm:w-auto" onClick={() => setModalOpen(false)}>Cancel</button>
          <button type="button" className="btn-primary w-full sm:w-auto" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : selected ? 'Update expense' : 'Save & post to GL'}
          </button>
        </div>
      </Modal>

      <HrConfirmModal
        open={!!deleteTarget}
        title="Delete expense?"
        message={`Delete "${deleteTarget?.title}"? The linked GL journal entry will be voided.`}
        confirmLabel="Delete expense"
        danger
        saving={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
