'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, Download, FileText, RefreshCw, AlertTriangle, CheckCircle2,
} from 'lucide-react';

const CedisIcon = ({ className }: { className?: string }) => (
  <span className={`font-bold font-serif leading-none flex items-center justify-center ${className}`}>₵</span>
);
import { EmptyState, Spinner, StatCard, toast } from '@/components/ui';
import api, { apiCache } from '@/lib/api';

type PlSource = 'gl' | 'orders';
type PeriodKey = 'mtd' | 'ytd' | 'all' | 'custom';

function fmt(n: number | string | undefined | null) {
  const v = parseFloat(String(n ?? 0));
  const prefix = v < 0 ? '-' : '';
  return `${prefix}GH₵ ${Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtAbs(n: number | string | undefined | null) {
  return fmt(Math.abs(parseFloat(String(n ?? 0))));
}

function displayDateRange(from?: string | null, to?: string | null) {
  if (from && to) return `${from} → ${to}`;
  if (from) return `From ${from}`;
  if (to) return `Until ${to}`;
  return 'All dates';
}

const PERIOD_PRESETS: { key: PeriodKey; label: string }[] = [
  { key: 'mtd', label: 'MTD' },
  { key: 'ytd', label: 'YTD' },
  { key: 'all', label: 'All time' },
];

interface Props {
  onDataChange?: () => void;
}

export default function AccountingPlPanel(_: Props) {
  const [period, setPeriod] = useState<PeriodKey>('ytd');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [source, setSource] = useState<PlSource>('gl');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (silent = false) => {
    if (period === 'custom' && !from && !to) {
      setData(null);
      setLoading(false);
      return;
    }
    const params = new URLSearchParams();
    if (period === 'custom') {
      params.append('period', 'custom');
      if (from) params.append('from', from);
      if (to) params.append('to', to);
    } else {
      params.append('period', period);
    }
    if (source === 'orders') params.append('source', 'orders');
    const key = `/accounting/pl?${params.toString()}`;
    const cached = apiCache.get(key);
    if (cached) {
      setData(cached?.empty ? null : cached);
      setLoading(false);
      if (!apiCache.isStale(key)) return;
    }
    if (!silent) setLoading(true);
    try {
      const res = await api.get(key);
      const payload = res.data.data;
      apiCache.set(key, payload);
      setData(payload?.empty ? null : payload);
    } catch {
      if (!cached) { toast.error('Could not load P&L report'); setData(null); }
    } finally {
      setLoading(false);
    }
  }, [period, from, to, source]);

  useEffect(() => { load(); }, [load]);

  const exportCsv = () => {
    if (!data) return;
    const rows: string[][] = [
      ['P&L Report', data.source === 'gl' ? 'General ledger' : 'Paid orders', data.period_label || ''],
      ['Date range', displayDateRange(data.filters?.from, data.filters?.to)],
      [],
      ['Line', 'Amount (GH₵)'],
      ...(data.statement || []).map((line: any) => [line.label, String(line.amount ?? 0)]),
      [],
      ['Expense Category', 'Amount (GH₵)'],
      ...(data.expenses_by_category || []).map((c: any) => [c.category, String(c.total)]),
    ];
    if (data.revenue_by_account?.length) {
      rows.push([], ['Revenue Account', 'Amount (GH₵)']);
      data.revenue_by_account.forEach((r: any) => rows.push([r.name, String(r.total)]));
    }
    const csv = rows.map((r) => r.map((c: string | number) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `pl-report-${data.source}-${Date.now()}.csv`;
    a.click();
  };

  const printReport = () => {
    const el = document.getElementById('pl-print');
    if (!el) return;
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(`<html><head><title>P&L Report</title><style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Arial,sans-serif;font-size:13px;padding:32px;color:#111;}table{width:100%;border-collapse:collapse;}th,td{padding:8px 12px;text-align:left;border-bottom:1px solid #eee;}th{background:#f5f5f5;font-weight:600;}.text-right{text-align:right;}</style></head><body>${el.innerHTML}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  const setPreset = (key: PeriodKey) => {
    setPeriod(key);
    if (key !== 'custom') {
      setFrom('');
      setTo('');
    }
  };

  const pl = data;
  const netPositive = (pl?.net_profit ?? 0) >= 0;
  const checks = pl?.checks;
  const allChecksPass = checks
    ? checks.revenue_matches_accounts && checks.expenses_match_categories && checks.net_matches_formula
    : true;
  const customNeedsDates = period === 'custom' && !from && !to;

  return (
    <div className={`space-y-5 relative ${loading && pl ? 'opacity-60 pointer-events-none' : ''}`}>
      <div className="card space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4">
          <div className="flex-1 space-y-3">
            <div>
              <label className="form-label">Period</label>
              <div className="flex flex-wrap gap-2">
                {PERIOD_PRESETS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setPreset(p.key)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium ${period === p.key ? 'bg-[#0D3B6E] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    {p.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPeriod('custom')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${period === 'custom' ? 'bg-[#0D3B6E] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  Custom
                </button>
              </div>
            </div>
            {period === 'custom' && (
              <div className="flex flex-col sm:flex-row gap-3">
                <div><label className="form-label">From</label><input type="date" className="form-input" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
                <div><label className="form-label">To</label><input type="date" className="form-input" value={to} onChange={(e) => setTo(e.target.value)} /></div>
              </div>
            )}
          </div>
          <div>
            <label className="form-label">Source</label>
            <select className="form-input" value={source} onChange={(e) => setSource(e.target.value as PlSource)}>
              <option value="gl">General ledger</option>
              <option value="orders">Paid orders</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary text-xs" onClick={() => load()} disabled={loading || customNeedsDates}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Loading…' : 'Refresh'}
            </button>
            {pl && (
              <>
                <button type="button" className="btn-secondary text-xs" onClick={exportCsv}>
                  <Download className="w-3.5 h-3.5" /> CSV
                </button>
                <button type="button" className="btn-secondary text-xs" onClick={printReport}>
                  <FileText className="w-3.5 h-3.5" /> Print
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {loading && !pl && !customNeedsDates && <Spinner />}

      {customNeedsDates && !loading && (
        <EmptyState message="Pick a from and/or to date, then refresh" icon={<FileText className="w-8 h-8 text-gray-300" />} />
      )}

      {pl && (
        <div id="pl-print" className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-gray-800">{pl.period_label}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {displayDateRange(pl.filters?.from, pl.filters?.to)}
                {' · '}
                {pl.source === 'gl' ? 'General ledger' : 'Paid orders + expense records'}
              </p>
            </div>
            {pl.gross_margin_pct != null && (
              <p className="text-xs text-gray-400">
                Gross margin {pl.gross_margin_pct}% · Net margin {pl.net_margin_pct}%
              </p>
            )}
          </div>

          {checks && !allChecksPass && (
            <div className="card flex items-start gap-3 border-l-4 border-l-amber-500 py-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm text-gray-700 space-y-1">
                <p className="font-medium text-amber-800">Report totals need review</p>
                {!checks.revenue_matches_accounts && (
                  <p>Revenue ({fmt(pl.revenue)}) differs from revenue accounts total ({fmt(checks.revenue_from_accounts)}).</p>
                )}
                {!checks.expenses_match_categories && (
                  <p>Total expenses ({fmt(pl.total_expenses)}) differs from category sum ({fmt(checks.expenses_from_categories)}).</p>
                )}
                {!checks.net_matches_formula && (
                  <p>Net profit ({fmt(pl.net_profit)}) differs from revenue minus expenses ({fmt(checks.net_from_formula)}).</p>
                )}
              </div>
            </div>
          )}

          {checks && allChecksPass && pl.source === 'gl' && (
            <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Revenue, expenses, and net profit reconcile across the report.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <StatCard label="Revenue" value={fmt(pl.revenue)} icon={<TrendingUp className="w-6 h-6 text-[#0D3B6E]" />} color="bg-[#0D3B6E]/8" />
            <StatCard label="Gross Profit" value={fmt(pl.gross_profit)} icon={<CedisIcon className="w-6 h-6 text-[#0D3B6E] text-base" />} color="bg-[#0D3B6E]/8" sub={pl.cogs ? `COGS ${fmtAbs(pl.cogs)}` : undefined} />
            <StatCard label="Total Expenses" value={fmtAbs(pl.total_expenses)} icon={<TrendingDown className="w-6 h-6 text-red-600" />} color="bg-red-50" sub={pl.operating_expenses != null ? `Operating ${fmtAbs(pl.operating_expenses)}` : undefined} />
            <StatCard label="Net Profit" value={fmt(pl.net_profit)} icon={<CedisIcon className="w-6 h-6 text-[#0D3B6E] text-base" />} color={netPositive ? 'bg-[#0D3B6E]/8' : 'bg-red-50'} />
          </div>

          {pl.statement?.length > 0 && (
            <div className="card p-0 overflow-hidden">
              <div className="px-4 py-3 border-b">
                <h3 className="font-semibold text-gray-800 text-sm">Profit &amp; Loss statement</h3>
              </div>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-50">
                  {pl.statement.map((line: any) => (
                    <tr
                      key={line.key}
                      className={`${line.emphasis ? 'bg-gray-50/80 font-semibold' : ''} ${line.total ? 'border-t-2 border-gray-200' : ''}`}
                    >
                      <td className={`px-4 py-2.5 ${line.indent ? 'pl-8 text-gray-600' : 'text-gray-800'}`}>{line.label}</td>
                      <td className={`px-4 py-2.5 text-right tabular-nums ${line.amount < 0 ? 'text-red-600' : line.emphasis ? 'text-gray-900 font-bold' : 'text-gray-800'}`}>
                        {fmt(line.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pl.expenses_by_category?.length > 0 && (
            <div className="card p-0 overflow-hidden">
              <div className="px-4 py-3 border-b">
                <h3 className="font-semibold text-gray-800 text-sm">Expense breakdown</h3>
                <p className="text-xs text-gray-500 mt-0.5">Should total {fmtAbs(pl.total_expenses)}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="table-header">
                    <tr>
                      <th className="px-4 py-2 text-left">Category</th>
                      {pl.source === 'gl' && <th className="px-4 py-2 text-left hidden md:table-cell">Code</th>}
                      <th className="px-4 py-2 text-right">Amount</th>
                      <th className="px-4 py-2 text-right">% of expenses</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {pl.expenses_by_category.map((c: any) => (
                      <tr key={`${c.code || ''}-${c.category}`} className="hover:bg-gray-50/80">
                        <td className="px-4 py-2">{c.category}</td>
                        {pl.source === 'gl' && <td className="px-4 py-2 font-mono text-xs text-gray-400 hidden md:table-cell">{c.code || '—'}</td>}
                        <td className="px-4 py-2 text-right font-semibold text-red-600 tabular-nums">{fmt(c.total)}</td>
                        <td className="px-4 py-2 text-right text-gray-500 tabular-nums">
                          {pl.total_expenses ? ((c.total / pl.total_expenses) * 100).toFixed(1) : '0.0'}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t bg-gray-50">
                    <tr>
                      <td className="px-4 py-2 font-semibold text-gray-700" colSpan={pl.source === 'gl' ? 2 : 1}>Total</td>
                      <td className="px-4 py-2 text-right font-bold text-red-700 tabular-nums">{fmt(pl.total_expenses)}</td>
                      <td className="px-4 py-2 text-right text-gray-500">100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {pl.revenue_by_account?.length > 0 && (
            <div className="card p-0 overflow-hidden">
              <div className="px-4 py-3 border-b">
                <h3 className="font-semibold text-gray-800 text-sm">Revenue by GL account</h3>
                <p className="text-xs text-gray-500 mt-0.5">Should total {fmt(pl.revenue)}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="table-header">
                    <tr>
                      <th className="px-4 py-2 text-left">Account</th>
                      <th className="px-4 py-2 text-left hidden md:table-cell">Code</th>
                      <th className="px-4 py-2 text-right">Amount</th>
                      <th className="px-4 py-2 text-right">% of revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {pl.revenue_by_account.map((r: any) => (
                      <tr key={r.code} className="hover:bg-gray-50/80">
                        <td className="px-4 py-2">{r.name}</td>
                        <td className="px-4 py-2 font-mono text-xs text-gray-400 hidden md:table-cell">{r.code}</td>
                        <td className="px-4 py-2 text-right font-semibold text-green-700 tabular-nums">{fmt(r.total)}</td>
                        <td className="px-4 py-2 text-right text-gray-500 tabular-nums">
                          {pl.revenue ? ((r.total / pl.revenue) * 100).toFixed(1) : '0.0'}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t bg-gray-50">
                    <tr>
                      <td className="px-4 py-2 font-semibold text-gray-700" colSpan={2}>Total</td>
                      <td className="px-4 py-2 text-right font-bold text-green-700 tabular-nums">{fmt(checks?.revenue_from_accounts ?? pl.revenue)}</td>
                      <td className="px-4 py-2 text-right text-gray-500">100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {pl.monthly?.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-gray-800 mb-1 text-sm">Monthly revenue</h3>
              <p className="text-xs text-gray-500 mb-3">
                Period total {fmt(pl.summary?.monthly_revenue_total ?? pl.monthly.reduce((s: number, m: any) => s + m.revenue, 0))}
                {pl.summary?.monthly_matches_revenue === false && (
                  <span className="text-amber-600"> · differs from headline revenue</span>
                )}
              </p>
              <div className="space-y-2">
                {pl.monthly.map((m: any) => {
                  const max = Math.max(...pl.monthly.map((x: any) => x.revenue));
                  const pct = max > 0 ? (m.revenue / max) * 100 : 0;
                  return (
                    <div key={`${m.year}-${m.month}`} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-20 shrink-0">{m.label || `${m.month} ${m.year}`}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div className="bg-[#0D3B6E]/80 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-semibold w-28 text-right tabular-nums">{fmt(m.revenue)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <p className="text-xs text-gray-400 print:hidden">
            Prepared by GEMS · {new Date(pl.generated_at || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} · Unaudited
          </p>
        </div>
      )}

      {!pl && !loading && !customNeedsDates && (
        <EmptyState message="No P&L data for this period" icon={<FileText className="w-8 h-8 text-gray-300" />} />
      )}
    </div>
  );
}
