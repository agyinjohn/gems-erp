'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus, Search, Download, Eye, BookOpen, CheckCircle2, Ban,
  TrendingUp, FileText,
} from 'lucide-react';
import { Modal, EmptyState, Spinner, StatCard, toast } from '@/components/ui';
import api, { apiCache } from '@/lib/api';

type PeriodKey = 'all' | 'mtd' | 'ytd' | 'custom';

const SOURCE_COLORS: Record<string, string> = {
  manual: 'bg-gray-100 text-gray-700',
  sale: 'bg-[#0D3B6E]/8 text-[#0D3B6E]',
  purchase: 'bg-amber-50 text-amber-800',
  payroll: 'bg-[#0D3B6E]/8 text-[#0D3B6E]',
  expense: 'bg-red-50 text-red-700',
  vendor_bill: 'bg-[#0D3B6E]/8 text-[#0D3B6E]',
};

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

const emptyLine = () => ({ account_id: '', debit: '', credit: '', description: '' });

interface Props {
  onDataChange?: () => void;
}

export default function AccountingJournalPanel({ onDataChange }: Props) {
  const [data, setData] = useState<any>(null);
  const [postingAccounts, setPostingAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [period, setPeriod] = useState<PeriodKey>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [detailEntry, setDetailEntry] = useState<any>(null);
  const [voidTarget, setVoidTarget] = useState<any>(null);
  const [voidReason, setVoidReason] = useState('');
  const [voiding, setVoiding] = useState(false);

  const [form, setForm] = useState({
    description: '',
    entry_date: new Date().toISOString().split('T')[0],
    lines: [emptyLine(), emptyLine()],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const sources = data?.sources || [];

  const loadAccounts = useCallback(async () => {
    const cached = apiCache.get('/accounts');
    if (cached && !apiCache.isStale('/accounts')) { setPostingAccounts(cached.filter((a: any) => !a.is_group && a.is_active !== false)); return; }
    try {
      const res = await api.get('/accounts');
      apiCache.set('/accounts', res.data.data || []);
      setPostingAccounts((res.data.data || []).filter((a: any) => !a.is_group && a.is_active !== false));
    } catch {
      setPostingAccounts([]);
    }
  }, []);

  const load = useCallback(async (silent = false) => {
    const { from, to } = periodRange(period, customFrom, customTo);
    const params = new URLSearchParams({ view: 'full' });
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (sourceFilter) params.set('source', sourceFilter);
    if (statusFilter) params.set('status', statusFilter);
    if (search.trim()) params.set('search', search.trim());
    const key = `/journal-entries?${params.toString()}`;
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
      if (!cached) toast.error('Could not load journal entries');
    } finally {
      setLoading(false);
    }
  }, [period, customFrom, customTo, sourceFilter, statusFilter, search]);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const totalDebit = useMemo(
    () => form.lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0),
    [form.lines],
  );
  const totalCredit = useMemo(
    () => form.lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0),
    [form.lines],
  );
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const addLine = () => setForm({ ...form, lines: [...form.lines, emptyLine()] });
  const removeLine = (i: number) => {
    if (form.lines.length <= 2) return;
    setForm({ ...form, lines: form.lines.filter((_, idx) => idx !== i) });
  };
  const updateLine = (i: number, key: string, value: string) => {
    const lines = [...form.lines];
    lines[i] = { ...lines[i], [key]: value };
    setForm({ ...form, lines });
  };

  const openAdd = () => {
    setForm({
      description: '',
      entry_date: new Date().toISOString().split('T')[0],
      lines: [emptyLine(), emptyLine()],
    });
    setError('');
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.description.trim()) {
      setError('Description is required.');
      return;
    }
    if (!isBalanced) {
      setError('Debits must equal credits with at least one line amount.');
      return;
    }
    const validLines = form.lines.filter((l) => l.account_id && (parseFloat(l.debit) || parseFloat(l.credit)));
    if (validLines.length < 2) {
      setError('Add at least two lines with accounts and amounts.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.post('/journal-entries', { ...form, lines: validLines });
      toast.success('Journal entry posted to GL');
      setModalOpen(false);
      apiCache.invalidate('/journal-entries');
      apiCache.invalidate('/accounting/summary');
      load();
      onDataChange?.();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Post failed');
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (entry: any) => {
    try {
      const res = await api.get(`/journal-entries/${entry.id}`);
      setDetailEntry(res.data.data);
    } catch {
      setDetailEntry(entry);
    }
  };

  const confirmVoid = async () => {
    if (!voidTarget || !voidReason.trim()) {
      toast.error('Enter a reason for voiding.');
      return;
    }
    setVoiding(true);
    try {
      await api.post(`/journal-entries/${voidTarget.id}/void`, { reason: voidReason.trim() });
      toast.success('Entry voided — reversal posted');
      setVoidTarget(null);
      setVoidReason('');
      apiCache.invalidate('/journal-entries');
      apiCache.invalidate('/accounting/summary');
      load();
      onDataChange?.();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Void failed');
    } finally {
      setVoiding(false);
    }
  };

  const exportCsv = () => {
    const rows = data?.entries || [];
    const header = ['Date', 'Reference', 'Description', 'Source', 'Status', 'Debit', 'Credit', 'Lines', 'Created By'];
    const body = rows.map((e: any) => [
      new Date(e.entry_date).toLocaleDateString(),
      e.reference,
      e.description,
      e.source,
      e.status || 'posted',
      parseFloat(e.total_debit || 0).toFixed(2),
      parseFloat(e.total_credit || 0).toFixed(2),
      e.line_count || e.lines?.length || 0,
      e.created_by?.name || '',
    ]);
    const csv = [header, ...body].map((r) => r.map((c: string | number) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `journal-${Date.now()}.csv`;
    a.click();
  };

  if (loading && !data) return <Spinner />;

  const summary = data?.summary || {};
  const entries: any[] = data?.entries || [];

  return (
    <div className={`space-y-5 relative ${loading ? 'opacity-60 pointer-events-none' : ''}`}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Entries (filtered)" value={String(summary.count ?? 0)} icon={<BookOpen className="w-5 h-5 text-[#0D3B6E]" />} color="bg-[#0D3B6E]/8" sub={`${summary.posted ?? 0} posted · ${summary.voided ?? 0} voided`} />
        <StatCard label="Posted volume" value={fmt(summary.total_debit)} icon={<TrendingUp className="w-5 h-5 text-green-600" />} color="bg-green-50" sub="Debits = credits on posted entries" />
        <StatCard label="Month to date" value={String(summary.mtd_count ?? 0)} icon={<FileText className="w-5 h-5 text-[#0D3B6E]" />} color="bg-[#0D3B6E]/8" sub={fmt(summary.mtd_debit)} />
        <StatCard label="Manual vs system" value={`${summary.manual_count ?? 0} / ${summary.system_count ?? 0}`} icon={<CheckCircle2 className="w-5 h-5 text-purple-600" />} color="bg-purple-50" sub="Manual · auto-posted" />
      </div>

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
            <input className="form-input pl-9" placeholder="Search reference, description, account…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="form-input w-full lg:w-40" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
            <option value="">All sources</option>
            {sources.map((s: any) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <select className="form-input w-full lg:w-36" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            <option value="posted">Posted</option>
            <option value="voided">Voided</option>
          </select>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary text-xs" onClick={exportCsv} disabled={!entries.length}>
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button type="button" className="btn-primary text-xs" onClick={openAdd}>
              <Plus className="w-3.5 h-3.5" /> New entry
            </button>
          </div>
        </div>
      </div>

      {summary.by_source?.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-800 text-sm mb-3">By source (posted, filtered)</h3>
          <div className="flex flex-wrap gap-2">
            {summary.by_source.map((s: any) => (
              <button
                key={s.source}
                type="button"
                onClick={() => setSourceFilter(s.source)}
                className={`text-xs px-2.5 py-1.5 rounded-lg ${SOURCE_COLORS[s.source] || 'bg-gray-100 text-gray-700'} hover:opacity-80`}
              >
                {s.label}: {s.count}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        {entries.length === 0 ? (
          <EmptyState
            message="No journal entries in this period"
            description="Post a manual entry or record sales, expenses, and payroll — they appear here automatically."
            icon={<BookOpen className="w-8 h-8 text-gray-300" />}
            action={{ label: 'New entry', onClick: openAdd }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs md:text-sm">
              <thead className="table-header">
                <tr>
                  {['Date', 'Reference', 'Description', 'Debit', 'Credit', 'Source', 'Status', ''].map((h) => (
                    <th key={h || 'actions'} className="px-3 md:px-4 py-2 md:py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {entries.map((e) => (
                  <tr key={e.id} className={`hover:bg-gray-50/80 ${e.status === 'voided' ? 'opacity-60' : ''}`}>
                    <td className="px-3 md:px-4 py-2 md:py-3 text-gray-500 whitespace-nowrap">{new Date(e.entry_date).toLocaleDateString()}</td>
                    <td className="px-3 md:px-4 py-2 md:py-3 font-mono text-xs text-[#0D3B6E]">{e.reference}</td>
                    <td className="px-3 md:px-4 py-2 md:py-3 max-w-[200px]">
                      <div className="font-medium text-gray-900 truncate">{e.description}</div>
                      <div className="text-xs text-gray-400">{e.line_count || e.lines?.length || 0} lines</div>
                    </td>
                    <td className="px-3 md:px-4 py-2 md:py-3 font-semibold text-green-700 tabular-nums whitespace-nowrap">{fmt(e.total_debit)}</td>
                    <td className="px-3 md:px-4 py-2 md:py-3 font-semibold text-red-600 tabular-nums whitespace-nowrap">{fmt(e.total_credit)}</td>
                    <td className="px-3 md:px-4 py-2 md:py-3 hidden md:table-cell">
                      <span className="text-xs text-gray-600 capitalize">{e.source}</span>
                    </td>
                    <td className="px-3 md:px-4 py-2 md:py-3">
                      <span className="text-xs text-gray-600 capitalize">{e.status || 'posted'}</span>
                    </td>
                    <td className="px-3 md:px-4 py-2 md:py-3">
                      <div className="flex gap-1 justify-end">
                        <button type="button" onClick={() => openDetail(e)} className="p-1.5 hover:bg-gray-100 rounded text-gray-500" title="View lines">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {e.status !== 'voided' && e.source === 'manual' && (
                          <button
                            type="button"
                            onClick={() => { setVoidTarget(e); setVoidReason(''); }}
                            className="p-1.5 hover:bg-red-50 rounded text-red-400"
                            title="Void entry"
                          >
                            <Ban className="w-3.5 h-3.5" />
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
        Journal entries are immutable — voiding creates a reversing entry. System entries (sales, expenses, payroll) are voided from their source module.
      </p>

      {/* New entry modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Journal Entry" size="lg">
        {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm mb-4">{error}</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="md:col-span-2">
            <label className="form-label">Description *</label>
            <input className="form-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Accrue office rent — March" />
          </div>
          <div>
            <label className="form-label">Entry date</label>
            <input type="date" className="form-input" value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })} />
          </div>
        </div>
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-sm md:text-base">Journal lines</h4>
            <button type="button" className="btn-secondary py-1 text-xs" onClick={addLine}><Plus className="w-3 h-3" />Add line</button>
          </div>
          <div className="space-y-2">
            {form.lines.map((line, i) => (
              <div key={i} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-center">
                <select className="form-input md:col-span-2" value={line.account_id} onChange={(e) => updateLine(i, 'account_id', e.target.value)}>
                  <option value="">Select account</option>
                  {postingAccounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                  ))}
                </select>
                <input type="number" step="0.01" min="0" className="form-input" placeholder="Debit" value={line.debit} onChange={(e) => updateLine(i, 'debit', e.target.value)} />
                <input type="number" step="0.01" min="0" className="form-input" placeholder="Credit" value={line.credit} onChange={(e) => updateLine(i, 'credit', e.target.value)} />
                <button type="button" onClick={() => removeLine(i)} disabled={form.lines.length <= 2} className="text-xs text-red-400 hover:text-red-600 disabled:opacity-30">Remove</button>
              </div>
            ))}
          </div>
          <div className={`flex flex-col sm:flex-row justify-end gap-2 sm:gap-8 mt-3 text-xs sm:text-sm font-semibold ${isBalanced ? 'text-green-700' : 'text-amber-700'}`}>
            <span>Total debit: {fmt(totalDebit)}</span>
            <span>Total credit: {fmt(totalCredit)}</span>
            <span>{isBalanced ? 'Balanced' : 'Out of balance'}</span>
          </div>
        </div>
        <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end mt-6">
          <button type="button" className="btn-secondary w-full sm:w-auto" onClick={() => setModalOpen(false)}>Cancel</button>
          <button type="button" className="btn-primary w-full sm:w-auto" onClick={save} disabled={saving || !isBalanced}>
            {saving ? 'Posting…' : 'Post entry'}
          </button>
        </div>
      </Modal>

      {/* Detail modal */}
      <Modal open={!!detailEntry} onClose={() => setDetailEntry(null)} title={detailEntry?.reference || 'Journal entry'} size="lg">
        {detailEntry && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Date</span><p className="font-medium">{new Date(detailEntry.entry_date).toLocaleDateString()}</p></div>
              <div><span className="text-gray-500">Source</span><p className="font-medium capitalize">{detailEntry.source}</p></div>
              <div className="col-span-2"><span className="text-gray-500">Description</span><p className="font-medium">{detailEntry.description}</p></div>
              <div><span className="text-gray-500">Status</span><p className="font-medium capitalize">{detailEntry.status || 'posted'}</p></div>
              <div><span className="text-gray-500">Created by</span><p className="font-medium">{detailEntry.created_by?.name || '—'}</p></div>
              {detailEntry.status === 'voided' && (
                <>
                  <div className="col-span-2"><span className="text-gray-500">Void reason</span><p className="text-red-600">{detailEntry.void_reason || '—'}</p></div>
                  <div><span className="text-gray-500">Voided by</span><p>{detailEntry.voided_by?.name || '—'}</p></div>
                </>
              )}
            </div>
            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-xs md:text-sm">
                <thead className="table-header">
                  <tr>
                    {['Account', 'Description', 'Debit', 'Credit'].map((h) => (
                      <th key={h} className="px-3 py-2 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(detailEntry.lines || []).map((l: any, i: number) => (
                    <tr key={i}>
                      <td className="px-3 py-2 font-mono text-xs">{l.account_code} — {l.account_name || 'Unknown'}</td>
                      <td className="px-3 py-2 text-gray-600">{l.description || '—'}</td>
                      <td className="px-3 py-2 text-green-700 tabular-nums">{parseFloat(l.debit) > 0 ? fmt(l.debit) : '—'}</td>
                      <td className="px-3 py-2 text-red-600 tabular-nums">{parseFloat(l.credit) > 0 ? fmt(l.credit) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-semibold">
                    <td className="px-3 py-2" colSpan={2}>Totals</td>
                    <td className="px-3 py-2 text-green-700 tabular-nums">{fmt(detailEntry.total_debit)}</td>
                    <td className="px-3 py-2 text-red-600 tabular-nums">{fmt(detailEntry.total_credit)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </Modal>

      {/* Void modal */}
      <Modal open={!!voidTarget} onClose={() => { setVoidTarget(null); setVoidReason(''); }} title="Void journal entry?" size="sm">
        <p className="text-sm text-gray-600 mb-4">
          Void <strong>{voidTarget?.reference}</strong>? A reversing entry will be posted to the GL.
        </p>
        <div className="mb-4">
          <label className="form-label">Reason *</label>
          <input className="form-input" value={voidReason} onChange={(e) => setVoidReason(e.target.value)} placeholder="e.g. Posted to wrong account" />
        </div>
        <div className="flex gap-3 justify-end">
          <button type="button" className="btn-secondary" onClick={() => { setVoidTarget(null); setVoidReason(''); }} disabled={voiding}>Cancel</button>
          <button type="button" className="btn-primary bg-red-600 hover:bg-red-700" onClick={confirmVoid} disabled={voiding || !voidReason.trim()}>
            {voiding ? 'Voiding…' : 'Void entry'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
