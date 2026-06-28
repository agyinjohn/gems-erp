'use client';

import { useCallback, useEffect, useState } from 'react';
import { BookOpen, Download, FileText, RefreshCw, CheckCircle2, AlertTriangle, Scale } from 'lucide-react';
import { EmptyState, Spinner, StatCard, toast } from '@/components/ui';
import api from '@/lib/api';

const TYPE_COLORS: Record<string, string> = {
  asset: 'bg-green-100 text-green-800',
  liability: 'bg-red-100 text-red-800',
  equity: 'bg-blue-100 text-blue-800',
  revenue: 'bg-purple-100 text-purple-800',
  expense: 'bg-yellow-100 text-yellow-800',
};

function displayAsOf(value?: string | null) {
  if (!value) return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return value;
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

interface Props {
  onDataChange?: () => void;
}

export default function AccountingTrialBalancePanel(_: Props) {
  const [asOf, setAsOf] = useState(() => new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hideZero, setHideZero] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (asOf) params.append('as_of', asOf);
      const res = await api.get(`/accounting/trial-balance?${params.toString()}`);
      setData(res.data.data);
    } catch {
      toast.error('Could not load trial balance');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [asOf]);

  useEffect(() => { load(); }, [load]);

  const rows = (data?.accounts || []).filter((r: any) =>
    !hideZero || r.debit_balance > 0.001 || r.credit_balance > 0.001,
  );
  const totals = data?.totals || {};
  const checks = data?.checks || {};
  const summary = data?.summary || {};

  const exportCsv = () => {
    if (!data) return;
    const csvRows: string[][] = [
      ['Trial Balance', displayAsOf(data.as_of)],
      [],
      ['Code', 'Account', 'Type', 'Debit', 'Credit'],
      ...rows.map((r: any) => [r.code, r.name, r.type, String(r.debit_balance), String(r.credit_balance)]),
      [],
      ['TOTALS', '', '', String(totals.debit ?? 0), String(totals.credit ?? 0)],
    ];
    const csv = csvRows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `trial-balance-${data.as_of || Date.now()}.csv`;
    a.click();
  };

  const printReport = () => {
    const el = document.getElementById('tb-print');
    if (!el) return;
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(`<html><head><title>Trial Balance</title><style>body{font-family:Arial,sans-serif;font-size:13px;padding:32px;}table{width:100%;border-collapse:collapse;}th,td{padding:8px;border-bottom:1px solid #eee;text-align:left;}th{background:#f5f5f5;}.text-right{text-align:right;}</style></head><body>${el.innerHTML}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  return (
    <div className={`space-y-5 relative ${loading && data ? 'opacity-60 pointer-events-none' : ''}`}>
      <div className="card">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4">
          <div>
            <label className="form-label">As of date</label>
            <input type="date" className="form-input" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 pb-1">
            <input type="checkbox" checked={hideZero} onChange={(e) => setHideZero(e.target.checked)} />
            Hide zero balances
          </label>
          <div className="flex flex-wrap gap-2 lg:ml-auto">
            <button type="button" className="btn-primary text-xs" onClick={load} disabled={loading}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            {data && (
              <>
                <button type="button" className="btn-secondary text-xs" onClick={exportCsv}><Download className="w-3.5 h-3.5" /> CSV</button>
                <button type="button" className="btn-secondary text-xs" onClick={printReport}><FileText className="w-3.5 h-3.5" /> Print</button>
              </>
            )}
          </div>
        </div>
        {data && <p className="text-xs text-gray-500 mt-3">As at {displayAsOf(data.as_of)} · {summary.with_balance ?? 0} accounts with balance</p>}
      </div>

      {loading && !data && <Spinner />}

      {data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard label="Total debits" value={`GH₵ ${parseFloat(totals.debit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} icon={<Scale className="w-5 h-5 text-blue-600" />} color="bg-blue-50" />
            <StatCard label="Total credits" value={`GH₵ ${parseFloat(totals.credit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} icon={<Scale className="w-5 h-5 text-purple-600" />} color="bg-purple-50" />
            <StatCard label="Accounts" value={String(summary.account_count ?? 0)} icon={<BookOpen className="w-5 h-5 text-gray-600" />} color="bg-gray-50" sub={`${summary.with_balance ?? 0} with balance`} />
          </div>

          {!checks.is_balanced && (
            <div className="card flex items-start gap-3 border-l-4 border-l-red-500 py-3 text-sm text-gray-700">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
              <span>Trial balance is out of balance by GH₵ {Math.abs(parseFloat(checks.difference || 0)).toFixed(2)}. Review journal entries.</span>
            </div>
          )}
          {checks.is_balanced && (
            <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
              <CheckCircle2 className="w-4 h-4" /> Debits equal credits — books are in balance.
            </div>
          )}

          <div id="tb-print" className="card p-0 overflow-hidden">
            <div className="text-center py-4 px-6 border-b border-gray-100">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">GEMS</p>
              <h2 className="text-lg font-bold text-gray-900">Trial Balance</h2>
              <p className="text-sm text-gray-500 mt-1">As at {displayAsOf(data.as_of)}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-sm">
                <thead className="table-header">
                  <tr>
                    <th className="px-3 md:px-4 py-2 text-left">Code</th>
                    <th className="px-3 md:px-4 py-2 text-left">Account</th>
                    <th className="px-3 md:px-4 py-2 text-left hidden md:table-cell">Type</th>
                    <th className="px-3 md:px-4 py-2 text-right">Debit (GH₵)</th>
                    <th className="px-3 md:px-4 py-2 text-right">Credit (GH₵)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rows.map((r: any) => (
                    <tr key={r.code} className="hover:bg-gray-50/80">
                      <td className="px-3 md:px-4 py-2 font-mono text-xs text-gray-500">{r.code}</td>
                      <td className="px-3 md:px-4 py-2 font-medium">{r.name}</td>
                      <td className="px-3 md:px-4 py-2 hidden md:table-cell"><span className={`badge text-xs ${TYPE_COLORS[r.type] || 'bg-gray-100 text-gray-600'}`}>{r.type}</span></td>
                      <td className="px-3 md:px-4 py-2 text-right tabular-nums">{r.debit_balance > 0 ? r.debit_balance.toFixed(2) : '—'}</td>
                      <td className="px-3 md:px-4 py-2 text-right tabular-nums">{r.credit_balance > 0 ? r.credit_balance.toFixed(2) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-bold border-t-2 border-gray-300">
                    <td className="px-3 md:px-4 py-2" colSpan={3}>TOTALS</td>
                    <td className="px-3 md:px-4 py-2 text-right tabular-nums">{parseFloat(totals.debit || 0).toFixed(2)}</td>
                    <td className="px-3 md:px-4 py-2 text-right tabular-nums">{parseFloat(totals.credit || 0).toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}

      {!data && !loading && (
        <EmptyState message="Could not generate trial balance" icon={<BookOpen className="w-8 h-8 text-gray-300" />} />
      )}
    </div>
  );
}
