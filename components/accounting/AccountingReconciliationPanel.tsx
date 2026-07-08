'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Landmark, Search, Download, Upload, CheckCircle2, AlertTriangle,
  RefreshCw, Save, FileText, Eye,
} from 'lucide-react';
import { Modal, EmptyState, Spinner, StatCard, toast } from '@/components/ui';
import api from '@/lib/api';

function fmt(n: number | string | undefined | null) {
  const v = parseFloat(String(n ?? 0));
  return `GH₵ ${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtOptional(n: number | string | undefined | null, hasValue?: boolean) {
  if (hasValue === false || (n == null && hasValue == null)) return '—';
  if (n == null || n === '') return '—';
  return fmt(n);
}

function displayDate(value: string | undefined | null) {
  if (!value) return '—';
  const iso = value.slice(0, 10);
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return value;
  return new Date(y, m - 1, d).toLocaleDateString();
}

function parseBankStatement(text: string) {
  return text.split('\n').map((line) => line.trim()).filter(Boolean).map((line, i) => {
    const nums = line.match(/[-+]?\d+(?:\.\d+)?/g) || [];
    const amount = nums.length ? parseFloat(nums[nums.length - 1]) : null;
    const dateMatch = line.match(/(\d{4}-\d{2}-\d{2})|(\d{2}\/\d{2}\/\d{4})/);
    const date = dateMatch ? dateMatch[0] : '';
    const desc = line.replace(dateMatch?.[0] || '', '').replace(String(amount), '').replace(/[+\-]/, '').trim();
    return { id: i, date, description: desc || line, amount };
  }).filter((l) => l.amount !== null);
}

function parseCsvText(text: string) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/"/g, ''));
  return lines.slice(1).map((line, i) => {
    const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = cols[idx] || ''; });
    const amount = parseFloat(row.amount || row.debit || row.credit || '');
    if (Number.isNaN(amount)) return null;
    return {
      id: i,
      date: row.date || row.transaction_date || '',
      description: row.description || row.memo || row.narration || '',
      amount,
    };
  }).filter(Boolean) as { id: number; date: string; description: string; amount: number }[];
}

type ResultTab = 'summary' | 'matched' | 'bank' | 'gl';
type SessionDetailTab = 'pairs' | 'bank' | 'gl';

interface Props {
  onDataChange?: () => void;
}

export default function AccountingReconciliationPanel({ onDataChange }: Props) {
  const [viewData, setViewData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sessionSearch, setSessionSearch] = useState('');

  const [statementDate, setStatementDate] = useState(new Date().toISOString().slice(0, 10));
  const [openingBalance, setOpeningBalance] = useState('');
  const [closingBalance, setClosingBalance] = useState('');
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');
  const [bankText, setBankText] = useState('');
  const [parsedLines, setParsedLines] = useState<any[]>([]);

  const [reconResult, setReconResult] = useState<any>(null);
  const [reconLoading, setReconLoading] = useState(false);
  const [reconError, setReconError] = useState('');
  const [resultTab, setResultTab] = useState<ResultTab>('summary');
  const [savedSessionId, setSavedSessionId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sessionDetail, setSessionDetail] = useState<any>(null);
  const [sessionDetailTab, setSessionDetailTab] = useState<SessionDetailTab>('pairs');

  const loadView = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/accounting/reconciliation');
      setViewData(res.data.data);
    } catch {
      toast.error('Could not load reconciliation data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadView(); }, [loadView]);

  const handleTextChange = (text: string) => {
    setBankText(text);
    const parsed = text.includes(',') && text.includes('\n') && text.split('\n')[0].toLowerCase().includes('date')
      ? parseCsvText(text)
      : parseBankStatement(text);
    setParsedLines(parsed);
    setReconResult(null);
    setSavedSessionId(null);
    setReconError('');
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => handleTextChange(String(reader.result || ''));
    reader.readAsText(file);
  };

  const reconPayload = () => ({
    lines: parsedLines,
    statement_date: statementDate,
    opening_balance: openingBalance || undefined,
    closing_balance: closingBalance || undefined,
    from: periodFrom || undefined,
    to: periodTo || undefined,
    account_id: viewData?.cash_account?.id,
  });

  const runReconciliation = async () => {
    if (!parsedLines.length) {
      setReconError('No valid lines parsed — paste a statement or upload CSV.');
      return;
    }
    setReconLoading(true);
    setReconError('');
    try {
      const res = await api.post('/accounting/reconcile', reconPayload());
      setReconResult(res.data.data);
      setResultTab('summary');
      setSavedSessionId(null);
    } catch (e: any) {
      setReconError(e.response?.data?.message || 'Reconciliation failed');
    } finally {
      setReconLoading(false);
    }
  };

  const saveSession = async (complete = false) => {
    if (!reconResult || !parsedLines.length) return;
    setSaving(true);
    try {
      const summary = reconResult.summary;
      const matchedByBankId = new Map<number, string>(
        reconResult.matched.map((m: any) => [m.bank?.id, m.gl?.id]),
      );
      const parseBalance = (raw: string, fallback: number | null | undefined) => {
        if (raw !== '') return parseFloat(raw);
        return fallback ?? null;
      };
      const glDate = (value: string | Date | undefined) => {
        if (!value) return '';
        if (typeof value === 'string') return value.slice(0, 10);
        return value.toISOString().slice(0, 10);
      };
      const payload = {
        ...reconPayload(),
        period_from: periodFrom || reconResult.period?.from,
        period_to: periodTo || reconResult.period?.to,
        opening_balance: parseBalance(openingBalance, summary.opening_balance),
        closing_balance: parseBalance(closingBalance, summary.closing_balance ?? summary.computed_closing),
        bank_lines: parsedLines.map((line) => ({
          line_id: String(line.id),
          date: line.date,
          description: line.description,
          amount: line.amount,
          matched: matchedByBankId.has(line.id),
          matched_gl_id: matchedByBankId.get(line.id) || undefined,
        })),
        gl_lines: [
          ...reconResult.matched.map((m: any) => ({
            gl_line_id: m.gl?.id,
            entry_id: m.gl?.entry_id,
            date: glDate(m.gl?.date),
            reference: m.gl?.reference,
            description: m.gl?.description,
            source: m.gl?.source,
            amount: m.gl?.amount,
            matched: true,
            matched_bank_line_id: String(m.bank?.id),
          })),
          ...reconResult.unmatchedGl.map((l: any) => ({
            gl_line_id: l.id,
            entry_id: l.entry_id,
            date: glDate(l.date),
            reference: l.reference,
            description: l.description,
            source: l.source,
            amount: l.amount,
            matched: false,
          })),
        ],
        matched_pairs: reconResult.matched.map((m: any) => ({
          bank_line_id: String(m.bank?.id),
          gl_line_id: m.gl?.id,
          bank_date: m.bank?.date || '',
          bank_description: m.bank?.description || '',
          bank_amount: m.bank?.amount,
          gl_date: glDate(m.gl?.date),
          gl_reference: m.gl?.reference || '',
          gl_description: m.gl?.description || '',
          gl_amount: m.gl?.amount,
          match_score: m.match_score,
        })),
        summary: {
          bank_total: summary.bank_total,
          gl_period_total: summary.gl_period_total,
          matched_count: summary.matched_count,
          bank_line_count: summary.bank_line_count,
          gl_line_count: summary.gl_line_count,
          match_rate: summary.match_rate,
          period_difference: summary.period_difference,
        },
        notes: `Match rate ${summary.match_rate}% · ${summary.matched_count}/${summary.bank_line_count} bank · ${summary.gl_line_count} GL · ${reconResult.period?.from || '—'} → ${reconResult.period?.to || '—'}`,
      };

      let sessionId = savedSessionId;
      if (!sessionId) {
        const created = await api.post('/accounting/reconciliations', payload);
        sessionId = created.data.data.id;
        setSavedSessionId(sessionId);
      } else {
        await api.put(`/accounting/reconciliations/${sessionId}`, payload);
      }

      if (complete && sessionId) {
        await api.patch(`/accounting/reconciliations/${sessionId}/complete`, payload);
        toast.success('Reconciliation completed and saved');
      } else {
        toast.success('Reconciliation saved as draft');
      }
      loadView();
      onDataChange?.();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const exportSessionDetail = (detail: any) => {
    const rows: string[][] = [['Section', 'Date', 'Description', 'Reference', 'Amount', 'Matched']];
    (detail.matched_pairs || []).forEach((p: any) => {
      rows.push(['Matched bank', p.bank_date || '', p.bank_description || '', '', String(p.bank_amount ?? ''), 'yes']);
      rows.push(['Matched GL', p.gl_date || '', p.gl_description || '', p.gl_reference || '', String(p.gl_amount ?? ''), 'yes']);
    });
    (detail.unmatched_bank_lines || []).forEach((l: any) => {
      rows.push(['Unmatched bank', l.date || '', l.description || '', '', String(l.amount ?? ''), 'no']);
    });
    (detail.unmatched_gl_lines || []).forEach((l: any) => {
      rows.push(['Unmatched GL', l.date || '', l.description || '', l.reference || '', String(l.amount ?? ''), 'no']);
    });
    const csv = rows.map((r) => r.map((c: string | number) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `reconciliation-session-${detail.id || Date.now()}.csv`;
    a.click();
  };

  const openSessionDetail = async (sessionId: string) => {
    try {
      const r = await api.get(`/accounting/reconciliations/${sessionId}`);
      setSessionDetailTab('pairs');
      setSessionDetail(r.data.data);
    } catch {
      toast.error('Could not load session');
    }
  };

  const exportResults = () => {
    if (!reconResult) return;
    const rows: string[][] = [['Type', 'Date', 'Description', 'Reference', 'Amount']];
    reconResult.matched.forEach((m: any) => {
      rows.push(['Matched (Bank)', m.bank.date, m.bank.description, '', String(m.bank.amount)]);
      rows.push(['Matched (GL)', new Date(m.gl.date).toLocaleDateString(), m.gl.description, m.gl.reference, String(m.gl.amount)]);
    });
    reconResult.unmatchedBank.forEach((l: any) => rows.push(['Unmatched Bank', l.date, l.description, '', String(l.amount)]));
    reconResult.unmatchedGl.forEach((l: any) => rows.push(['Unmatched GL', new Date(l.date).toLocaleDateString(), l.description, l.reference, String(l.amount)]));
    const csv = rows.map((r) => r.map((c: string | number) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `bank-reconciliation-${Date.now()}.csv`;
    a.click();
  };

  const sessions = useMemo(() => {
    const list = viewData?.sessions || [];
    if (!sessionSearch.trim()) return list;
    const q = sessionSearch.toLowerCase();
    return list.filter((s: any) =>
      s.status.includes(q)
      || displayDate(s.statement_date).includes(q)
      || (s.period_from && displayDate(s.period_from).includes(q))
      || (s.notes || '').toLowerCase().includes(q)
    );
  }, [viewData, sessionSearch]);

  const summary = reconResult?.summary;
  const viewSummary = viewData?.summary || {};

  if (loading && !viewData) return <Spinner />;

  return (
    <div className={`space-y-5 relative ${loading ? 'opacity-60 pointer-events-none' : ''}`}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="GL cash balance"
          value={fmt(viewSummary.gl_book_balance)}
          icon={<Landmark className="w-5 h-5 text-[#0D3B6E]" />}
          color="bg-[#0D3B6E]/8"
          sub={viewData?.cash_account ? `${viewData.cash_account.code} — ${viewData.cash_account.name}` : 'Account 1001'}
        />
        <StatCard label="Draft sessions" value={String(viewSummary.draft_sessions ?? 0)} icon={<FileText className="w-5 h-5 text-amber-600" />} color="bg-amber-50" sub="In progress" />
        <StatCard
          label="Last completed"
          value={viewSummary.last_statement_date ? displayDate(viewSummary.last_statement_date) : '—'}
          icon={<CheckCircle2 className="w-5 h-5 text-[#0D3B6E]" />}
          color="bg-[#0D3B6E]/8"
          sub={`${viewSummary.completed_sessions ?? 0} completed`}
        />
        <StatCard
          label="Last match rate"
          value={summary ? `${summary.match_rate}%` : '—'}
          icon={<RefreshCw className="w-5 h-5 text-[#0D3B6E]" />}
          color="bg-[#0D3B6E]/8"
          sub={summary ? `${summary.matched_count}/${summary.bank_line_count} lines` : 'Run reconciliation'}
        />
      </div>

      {/* Statement setup */}
      <div className="card space-y-4">
        <div>
          <h3 className="font-semibold text-gray-800">Statement details</h3>
          <p className="text-xs text-gray-500 mt-1">Enter balances from your bank statement. GL lines are matched for the statement period.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div><label className="form-label">Statement date</label><input type="date" className="form-input" value={statementDate} onChange={(e) => setStatementDate(e.target.value)} /></div>
          <div><label className="form-label">Opening balance</label><input type="number" step="0.01" className="form-input" placeholder="Optional" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} /></div>
          <div><label className="form-label">Closing balance</label><input type="number" step="0.01" className="form-input" placeholder="Optional" value={closingBalance} onChange={(e) => setClosingBalance(e.target.value)} /></div>
          <div><label className="form-label">Period from</label><input type="date" className="form-input" value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)} /></div>
          <div><label className="form-label">Period to</label><input type="date" className="form-input" value={periodTo} onChange={(e) => setPeriodTo(e.target.value)} /></div>
        </div>
      </div>

      {/* Bank input */}
      <div className="card space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="font-semibold text-gray-800">Bank statement lines</h3>
            <p className="text-xs text-gray-500">Paste lines or upload CSV with columns: date, description, amount</p>
          </div>
          <label className="btn-secondary text-xs cursor-pointer inline-flex items-center gap-1.5">
            <Upload className="w-3.5 h-3.5" /> Upload CSV
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} />
          </label>
        </div>
        <textarea
          className="form-input font-mono text-xs"
          rows={7}
          placeholder={'2024-01-15  Sales receipt  5000.00\n2024-01-16  Supplier payment  -1200.00\n\ndate,description,amount\n2024-01-17,Office rent,-4500.00'}
          value={bankText}
          onChange={(e) => handleTextChange(e.target.value)}
        />
        {parsedLines.length > 0 && (
          <p className="text-xs text-gray-500">
            {parsedLines.length} line{parsedLines.length !== 1 ? 's' : ''} parsed — net{' '}
            <span className="font-semibold text-gray-700">{fmt(parsedLines.reduce((s, l) => s + l.amount, 0))}</span>
          </p>
        )}
        {reconError && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm">{reconError}</div>}
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-primary text-xs" onClick={runReconciliation} disabled={reconLoading || !parsedLines.length}>
            {reconLoading ? 'Matching…' : 'Run reconciliation'}
          </button>
          {reconResult && (
            <>
              <button type="button" className="btn-secondary text-xs" onClick={() => saveSession(false)} disabled={saving}>
                <Save className="w-3.5 h-3.5" /> Save draft
              </button>
              <button type="button" className="btn-secondary text-xs" onClick={() => saveSession(true)} disabled={saving}>
                <CheckCircle2 className="w-3.5 h-3.5" /> Complete
              </button>
              <button type="button" className="btn-secondary text-xs" onClick={exportResults}>
                <Download className="w-3.5 h-3.5" /> Export
              </button>
              <button type="button" className="btn-secondary text-xs" onClick={() => { setReconResult(null); setBankText(''); setParsedLines([]); setSavedSessionId(null); }}>
                Clear
              </button>
            </>
          )}
        </div>
      </div>

      {/* Parsed preview */}
      {parsedLines.length > 0 && !reconResult && (
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b text-sm font-semibold text-gray-700">Parsed lines preview</div>
          <div className="overflow-x-auto max-h-48">
            <table className="w-full text-xs">
              <thead className="table-header"><tr><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-left">Description</th><th className="px-3 py-2 text-right">Amount</th></tr></thead>
              <tbody className="divide-y divide-gray-50">
                {parsedLines.slice(0, 20).map((l) => (
                  <tr key={l.id}><td className="px-3 py-1.5 text-gray-500">{l.date || '—'}</td><td className="px-3 py-1.5 truncate max-w-[240px]">{l.description}</td><td className={`px-3 py-1.5 text-right tabular-nums ${l.amount >= 0 ? 'text-green-700' : 'text-red-600'}`}>{fmt(l.amount)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Results */}
      {reconResult && summary && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="card bg-[#0D3B6E]/8 border-[#0D3B6E]/15"><div className="text-xs text-[#0D3B6E] font-medium mb-1">Bank net (period)</div><div className="text-xl font-bold text-[#0D3B6E]">{fmt(summary.bank_total)}</div></div>
            <div className="card bg-green-50 border-green-100"><div className="text-xs text-green-600 font-medium mb-1">GL net (period)</div><div className="text-xl font-bold text-green-800">{fmt(summary.gl_period_total)}</div></div>
            <div className={`card ${summary.is_period_balanced ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
              <div className={`text-xs font-medium mb-1 ${summary.is_period_balanced ? 'text-green-600' : 'text-red-600'}`}>Period difference</div>
              <div className={`text-xl font-bold ${summary.is_period_balanced ? 'text-green-800' : 'text-red-800'}`}>{fmt(summary.period_difference)}</div>
            </div>
            <div className="card bg-gray-50">
              <div className="text-xs text-gray-500 font-medium mb-1">Matched</div>
              <div className="text-xl font-bold text-gray-800">{summary.matched_count} <span className="text-sm font-normal text-gray-400">/ {summary.bank_line_count}</span></div>
              <div className="text-xs text-gray-400 mt-1">{reconResult.unmatchedBank.length} bank · {reconResult.unmatchedGl.length} GL outstanding</div>
            </div>
          </div>

          {summary.closing_variance != null && Math.abs(summary.closing_variance) > 0.02 && (
            <div className="card flex items-start gap-3 border-l-4 border-l-amber-500 py-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <div className="text-sm text-gray-700">
                Closing balance ({fmt(summary.closing_balance)}) differs from opening + net movement ({fmt(summary.computed_closing)}) by {fmt(summary.closing_variance)}.
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {([
              { key: 'summary', label: 'Summary' },
              { key: 'matched', label: `Matched (${reconResult.matched.length})` },
              { key: 'bank', label: `Bank only (${reconResult.unmatchedBank.length})` },
              { key: 'gl', label: `GL only (${reconResult.unmatchedGl.length})` },
            ] as { key: ResultTab; label: string }[]).map((t) => (
              <button key={t.key} type="button" onClick={() => setResultTab(t.key)} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${resultTab === t.key ? 'bg-[#0D3B6E] text-white' : 'bg-gray-100 text-gray-600'}`}>{t.label}</button>
            ))}
          </div>

          {resultTab === 'summary' && (
            <div className="card grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">GL book balance (1001)</span><p className="font-semibold">{fmt(summary.gl_book_balance)}</p></div>
              <div><span className="text-gray-500">Adjusted after outstanding</span><p className="font-semibold">{fmt(summary.adjusted_gl_balance)}</p></div>
              <div><span className="text-gray-500">Unmatched bank total</span><p className="text-amber-700 font-semibold">{fmt(summary.unmatched_bank_total)}</p></div>
              <div><span className="text-gray-500">Unmatched GL total</span><p className="text-red-600 font-semibold">{fmt(summary.unmatched_gl_total)}</p></div>
              <div><span className="text-gray-500">Period</span><p>{reconResult.period?.from || '—'} → {reconResult.period?.to || '—'}</p></div>
              <div><span className="text-gray-500">Match rate</span><p>{summary.match_rate}%</p></div>
            </div>
          )}

          {resultTab === 'matched' && (
            <ResultTable
              headers={['Bank date', 'Bank description', 'GL ref', 'GL description', 'Amount']}
              rows={reconResult.matched.map((m: any) => [
                m.bank.date || '—',
                m.bank.description,
                m.gl.reference,
                m.gl.description,
                fmt(m.bank.amount),
              ])}
              empty="No matched lines"
            />
          )}

          {resultTab === 'bank' && (
            <ResultTable
              headers={['Date', 'Description', 'Amount']}
              rows={reconResult.unmatchedBank.map((l: any) => [l.date || '—', l.description, fmt(l.amount)])}
              empty="All bank lines matched"
              headerClass="bg-yellow-50"
            />
          )}

          {resultTab === 'gl' && (
            <ResultTable
              headers={['Date', 'Reference', 'Description', 'Amount']}
              rows={reconResult.unmatchedGl.map((l: any) => [new Date(l.date).toLocaleDateString(), l.reference, l.description, fmt(l.amount)])}
              empty="All GL lines matched"
              headerClass="bg-red-50"
            />
          )}
        </div>
      )}

      {/* Session history */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b flex flex-col sm:flex-row sm:items-center gap-3">
          <h3 className="font-semibold text-gray-800 text-sm flex-1">Reconciliation history</h3>
          <div className="relative w-full sm:w-56">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input className="form-input pl-9 text-xs" placeholder="Search sessions…" value={sessionSearch} onChange={(e) => setSessionSearch(e.target.value)} />
          </div>
        </div>
        {sessions.length === 0 ? (
          <EmptyState message="No saved reconciliation sessions" icon={<Landmark className="w-8 h-8 text-gray-300" />} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs md:text-sm">
              <thead className="table-header">
                <tr>
                  {['Statement', 'Period', 'Status', 'Bank lines', 'GL lines', 'Matched', 'Rate', ''].map((h) => (
                    <th key={h || 'actions'} className="px-3 py-2 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sessions.map((s: any) => (
                  <tr key={s.id} className="hover:bg-gray-50/80">
                    <td className="px-3 py-2 whitespace-nowrap">{displayDate(s.statement_date)}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-500">
                      {s.period_from || s.period_to
                        ? `${displayDate(s.period_from)} → ${displayDate(s.period_to)}`
                        : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`badge text-xs ${s.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{s.status}</span>
                    </td>
                    <td className="px-3 py-2">{s.bank_line_count ?? 0}</td>
                    <td className="px-3 py-2">{s.gl_line_count ?? '—'}</td>
                    <td className="px-3 py-2">{s.matched_count ?? 0}</td>
                    <td className="px-3 py-2">{s.match_rate != null ? `${s.match_rate}%` : '—'}</td>
                    <td className="px-3 py-2">
                      <button type="button" onClick={() => openSessionDetail(s.id)} className="p-1.5 hover:bg-gray-100 rounded text-gray-500">
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
        Matching uses amount first, then date proximity and description similarity. Only non-voided GL cash lines (1001) in the statement period are compared.
      </p>

      <Modal open={!!sessionDetail} onClose={() => setSessionDetail(null)} title="Reconciliation session" size="xl">
        {sessionDetail && (
          <div className="space-y-4 text-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
                <div><span className="text-gray-500">Statement</span><p>{displayDate(sessionDetail.statement_date)}</p></div>
                <div><span className="text-gray-500">Period</span><p>{displayDate(sessionDetail.period_from)} → {displayDate(sessionDetail.period_to)}</p></div>
                <div><span className="text-gray-500">Status</span><p className="capitalize">{sessionDetail.status}</p></div>
                <div><span className="text-gray-500">Matched</span><p>{sessionDetail.matched_count ?? 0} / {sessionDetail.bank_line_count ?? 0} bank · {sessionDetail.gl_line_count ?? 0} GL</p></div>
              </div>
              <button type="button" className="btn-secondary text-xs shrink-0" onClick={() => exportSessionDetail(sessionDetail)}>
                <Download className="w-3.5 h-3.5" /> Export all lines
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div><span className="text-gray-500">Opening</span><p>{fmtOptional(sessionDetail.opening_balance, sessionDetail.has_opening_balance)}</p></div>
              <div><span className="text-gray-500">Closing</span><p>{fmtOptional(sessionDetail.closing_balance, sessionDetail.has_closing_balance)}</p></div>
              <div><span className="text-gray-500">Bank net</span><p>{sessionDetail.bank_total != null ? fmt(sessionDetail.bank_total) : '—'}</p></div>
              <div><span className="text-gray-500">GL net</span><p>{sessionDetail.gl_period_total != null ? fmt(sessionDetail.gl_period_total) : '—'}</p></div>
            </div>

            {sessionDetail.notes && <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">{sessionDetail.notes}</p>}
            {sessionDetail.completed_by_name && <p className="text-xs text-gray-400">Completed by {sessionDetail.completed_by_name}</p>}

            <div className="flex flex-wrap gap-2">
              {([
                { key: 'pairs', label: `Matched pairs (${sessionDetail.matched_pairs?.length || 0})` },
                { key: 'bank', label: `Bank lines (${sessionDetail.all_bank_lines?.length || sessionDetail.bank_lines?.length || 0})` },
                { key: 'gl', label: `GL lines (${sessionDetail.all_gl_lines?.length || sessionDetail.gl_lines?.length || 0})` },
              ] as { key: SessionDetailTab; label: string }[]).map((t) => (
                <button key={t.key} type="button" onClick={() => setSessionDetailTab(t.key)} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${sessionDetailTab === t.key ? 'bg-[#0D3B6E] text-white' : 'bg-gray-100 text-gray-600'}`}>{t.label}</button>
              ))}
            </div>

            {sessionDetailTab === 'pairs' && (
              <ResultTable
                headers={['Bank date', 'Bank description', 'GL ref', 'GL description', 'Amount']}
                rows={(sessionDetail.matched_pairs || []).map((p: any) => [
                  p.bank_date || '—',
                  p.bank_description || '—',
                  p.gl_reference || '—',
                  p.gl_description || '—',
                  fmt(p.bank_amount ?? p.gl_amount),
                ])}
                empty="No matched pairs recorded"
                headerClass="bg-green-50"
              />
            )}

            {sessionDetailTab === 'bank' && (
              <ResultTable
                headers={['Date', 'Description', 'Status', 'Amount']}
                rows={(sessionDetail.all_bank_lines || sessionDetail.bank_lines || []).map((l: any) => [
                  l.date || '—',
                  l.description || '—',
                  l.matched ? 'Matched' : 'Outstanding',
                  fmt(l.amount),
                ])}
                empty="No bank lines recorded"
                headerClass="bg-[#0D3B6E]/8"
              />
            )}

            {sessionDetailTab === 'gl' && (
              <ResultTable
                headers={['Date', 'Reference', 'Description', 'Status', 'Amount']}
                rows={(sessionDetail.all_gl_lines || sessionDetail.gl_lines || []).map((l: any) => [
                  displayDate(l.date) !== '—' ? displayDate(l.date) : (l.date || '—'),
                  l.reference || '—',
                  l.description || '—',
                  l.matched ? 'Matched' : 'Outstanding',
                  fmt(l.amount),
                ])}
                empty="No GL lines recorded"
                headerClass="bg-red-50"
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function ResultTable({ headers, rows, empty, headerClass }: { headers: string[]; rows: string[][]; empty: string; headerClass?: string }) {
  if (!rows.length) return <div className="card py-8 text-center text-sm text-gray-400">{empty}</div>;
  return (
    <div className="card p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs md:text-sm">
          <thead className={`table-header ${headerClass || ''}`}>
            <tr>{headers.map((h) => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50/80">
                {row.map((cell, j) => (
                  <td key={j} className={`px-3 py-2 ${j === row.length - 1 ? 'text-right tabular-nums font-semibold' : ''} ${j === 1 ? 'max-w-[200px] truncate' : ''}`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
