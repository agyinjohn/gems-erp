'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  DollarSign, TrendingUp, TrendingDown, Landmark, ArrowDownCircle, ArrowUpCircle,
  Receipt, AlertTriangle, CheckCircle2, Download,
  Activity, Calendar, Loader2,
} from 'lucide-react';

const CedisIcon = ({ className }: { className?: string }) => (
  <span className={`font-bold font-serif leading-none flex items-center justify-center ${className}`}>₵</span>
);
import { StatCard, Spinner, toast } from '@/components/ui';
import api from '@/lib/api';
import { accountingHref } from '@/lib/accountingNav';
import HrConfirmModal from '@/components/hr/HrConfirmModal';

type PeriodKey = 'mtd' | 'ytd' | 'all';

function fmt(n: number | string | undefined) {
  const v = parseFloat(String(n ?? 0));
  return `GH₵ ${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtCompact(n: number | string | undefined) {
  const v = parseFloat(String(n ?? 0));
  if (Math.abs(v) >= 1_000_000) return `GH₵ ${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `GH₵ ${(v / 1_000).toFixed(1)}k`;
  return fmt(v);
}

const QUICK_ACTIONS = [
  { label: 'Journal Entry', href: accountingHref('journal'), color: 'bg-[#0D3B6E]/8 text-[#0D3B6E]' },
  { label: 'Record Expense', href: accountingHref('expenses'), color: 'bg-red-50 text-red-700' },
  { label: 'New Invoice', href: accountingHref('invoices'), color: 'bg-[#0D3B6E]/8 text-[#0D3B6E]' },
  { label: 'P&L Report', href: accountingHref('pl'), color: 'bg-[#0D3B6E]/8 text-[#0D3B6E]' },
  { label: 'Trial Balance', href: accountingHref('trial-balance'), color: 'bg-[#0D3B6E]/8 text-[#0D3B6E]' },
  { label: 'Bank Recon', href: accountingHref('reconciliation'), color: 'bg-amber-50 text-amber-800' },
];

const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: 'mtd', label: 'MTD' },
  { key: 'ytd', label: 'YTD' },
  { key: 'all', label: 'All time' },
];

const TYPE_COLORS: Record<string, string> = {
  asset: 'text-[#0D3B6E]',
  liability: 'text-red-700',
  equity: 'text-[#0D3B6E]',
  revenue: 'text-[#0D3B6E]',
  expense: 'text-red-600',
};

interface Props {
  onDataChange?: () => void;
  onImport?: () => void;
}

export default function AccountingOverviewPanel({ onDataChange, onImport }: Props) {
  const [period, setPeriod] = useState<PeriodKey>('ytd');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [depConfirm, setDepConfirm] = useState(false);
  const [syncingCoa, setSyncingCoa] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/accounting/summary?period=${period}`);
      setData(res.data.data);
    } catch {
      toast.error('Could not load accounting overview');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const seedCoa = async () => {
    setSyncingCoa(true);
    try {
      await api.post('/accounting/seed-coa');
      toast.success('Chart of accounts updated');
      load();
      onDataChange?.();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to update COA');
    } finally {
      setSyncingCoa(false);
    }
  };

  const runDepreciation = async () => {
    try {
      const res = await api.post('/accounting/depreciation/run', { rate: 0.1 });
      toast.success(`Posted ${res.data.data.posted} depreciation entries`);
      load();
      onDataChange?.();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Depreciation run failed');
    }
  };

  const exportAccounting = async (format: 'quickbooks' | 'xero') => {
    try {
      const res = await api.get(`/accounting/export/${format}`, { responseType: 'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(res.data);
      a.download = `gems-${format}-export-${Date.now()}.csv`;
      a.click();
    } catch {
      toast.error('Export failed');
    }
  };

  if (loading && !data) return <Spinner />;

  const pl = data?.pl || {};
  const pos = data?.position || {};
  const aging = data?.ar_aging || {};
  const counts = data?.counts || {};
  const arDiff = parseFloat(data?.ar_gl_vs_invoice_diff || 0);
  const showArMismatch = Math.abs(arDiff) > 0.02;

  return (
    <div className={`space-y-5 md:space-y-6 relative ${loading || syncingCoa ? 'opacity-60 pointer-events-none' : ''}`}>
      {/* Header: period + fiscal status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {PERIOD_OPTIONS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${period === p.key
                ? 'bg-[#0D3B6E] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="text-xs text-gray-500 text-right">
          <div>P&L: {data?.period_label || 'Year to date'} · Position: as of today</div>
          <div>General ledger · {new Date(data?.as_of || Date.now()).toLocaleString()}</div>
        </div>
      </div>

      {/* Fiscal period + balance alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {data?.current_period ? (
          <div className="card flex items-start gap-3 border-l-4 border-l-green-500 py-3">
            <Calendar className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-800">Open period: {data.current_period.name}</div>
              <div className="text-xs text-gray-500 mt-0.5">
                {new Date(data.current_period.start_date).toLocaleDateString()} – {new Date(data.current_period.end_date).toLocaleDateString()}
              </div>
            </div>
            <Link href={accountingHref('periods')} className="ml-auto text-xs text-[#0D3B6E] hover:underline shrink-0">Manage</Link>
          </div>
        ) : (
          <div className="card flex items-start gap-3 border-l-4 border-l-amber-500 py-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-800">No open fiscal period</div>
              <div className="text-xs text-gray-500 mt-0.5">Create or reopen a period before posting entries.</div>
            </div>
            <Link href={accountingHref('periods')} className="ml-auto text-xs text-[#0D3B6E] hover:underline shrink-0">Set up</Link>
          </div>
        )}

        <div className={`card flex items-start gap-3 border-l-4 py-3 ${pos.is_balanced ? 'border-l-green-500' : 'border-l-red-500'}`}>
          {pos.is_balanced
            ? <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
            : <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />}
          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-800">
              {pos.is_balanced ? 'Books are balanced' : 'Balance sheet out of balance'}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              Assets {fmtCompact(pos.total_assets)} · Liabilities + Equity {fmtCompact((pos.total_liabilities || 0) + (pos.total_equity || 0))}
            </div>
          </div>
          <Link href={accountingHref('bs')} className="ml-auto text-xs text-[#0D3B6E] hover:underline shrink-0">Balance Sheet</Link>
        </div>
      </div>

      {/* Position KPIs */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Financial position · as of today</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <StatCard label="Cash & Bank" value={fmtCompact(pos.cash)} icon={<Landmark className="w-6 h-6 text-[#0D3B6E]" />} color="bg-[#0D3B6E]/8" sub="GL 1001 · Cash & Bank" />
          <StatCard
            label="Receivables (GL)"
            value={fmtCompact(pos.accounts_receivable)}
            icon={<ArrowDownCircle className="w-6 h-6 text-[#0D3B6E]" />}
            color="bg-[#0D3B6E]/8"
            sub={showArMismatch
              ? `Invoices owe ${fmtCompact(data?.invoice_ar_total)} · diff ${fmtCompact(arDiff)}`
              : `${counts.open_invoices || 0} open invoices · matches GL`}
          />
          <StatCard label="Payables (GL)" value={fmtCompact(pos.accounts_payable)} icon={<ArrowUpCircle className="w-6 h-6 text-red-600" />} color="bg-red-50" sub="GL 2001 · Accounts Payable" />
          <StatCard label="VAT Net Payable" value={fmtCompact((pos.vat_payable || 0) - (pos.vat_input || 0))} icon={<CedisIcon className="w-6 h-6 text-[#0D3B6E] text-base" />} color="bg-[#0D3B6E]/8" sub={`Output ${fmtCompact(pos.vat_payable)} − Input ${fmtCompact(pos.vat_input)}`} />
        </div>
      </div>

      {/* P&L KPIs */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
          Profit & loss · {data?.period_label}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <StatCard label="Revenue" value={fmtCompact(pl.revenue)} icon={<TrendingUp className="w-6 h-6 text-[#0D3B6E]" />} color="bg-[#0D3B6E]/8" sub="From general ledger" />
          <StatCard label="Gross Profit" value={fmtCompact(pl.gross_profit)} icon={<Activity className="w-6 h-6 text-[#0D3B6E]" />} color="bg-[#0D3B6E]/8" sub={`COGS ${fmtCompact(pl.cogs)}`} />
          <StatCard label="Expenses" value={fmtCompact(pl.total_expenses)} icon={<TrendingDown className="w-6 h-6 text-red-600" />} color="bg-red-50" sub="Operating + COGS" />
          <StatCard label="Net Profit" value={fmtCompact(pl.net_profit)} icon={<CedisIcon className="w-6 h-6 text-[#0D3B6E] text-base" />} color="bg-[#0D3B6E]/8" sub={`${counts.journal_entries_in_period ?? counts.journal_entries ?? 0} entries in period`} />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div className="card min-w-0 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Revenue trend</h3>
            <span className="text-xs text-gray-400">Last 6 months · GL</span>
          </div>
          {data?.monthly_revenue?.length ? (
            <ResponsiveContainer width="100%" height={220} minWidth={0}>
              <BarChart data={data.monthly_revenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => [fmt(Number(v ?? 0)), 'Revenue']} />
                <Bar dataKey="revenue" fill="#1A6BB5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex items-center justify-center text-gray-400 text-sm">No GL revenue posted yet</div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Expenses by GL account</h3>
            <span className="text-xs text-gray-400">{data?.period_label}</span>
          </div>
          {data?.expenses_by_category?.length ? (() => {
            const cats = data.expenses_by_category.slice(0, 6);
            const max = Math.max(...cats.map((c: any) => c.total));
            const total = cats.reduce((s: number, c: any) => s + c.total, 0);
            return (
              <div className="space-y-3">
                {cats.map((c: any) => {
                  const pct = max > 0 ? Math.round((c.total / max) * 100) : 0;
                  const share = total > 0 ? ((c.total / total) * 100).toFixed(1) : '0';
                  return (
                    <div key={c.code || c.category}>
                      <div className="flex justify-between text-sm mb-1 gap-2">
                        <span className="text-gray-700 font-medium truncate">{c.category}</span>
                        <span className="text-gray-900 font-semibold shrink-0">
                          {fmtCompact(c.total)} <span className="text-gray-400 font-normal text-xs">({share}%)</span>
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-red-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })() : (
            <p className="text-gray-400 text-sm text-center py-12">No expense postings in this period</p>
          )}
        </div>
      </div>

      {/* AR aging + quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Receivables aging</h3>
            <Link href={accountingHref('ar')} className="text-xs text-[#0D3B6E] hover:underline">View all →</Link>
          </div>
          <p className="text-xs text-gray-400 mb-3">By invoice due date · open invoices only</p>
          {aging.total?.count > 0 ? (
            <div className="space-y-2">
              {[
                { key: 'current', label: 'Current (not due / ≤30 days overdue)' },
                { key: 'days_31_60', label: '31–60 days overdue' },
                { key: 'days_61_90', label: '61–90 days overdue' },
                { key: 'over_90', label: 'Over 90 days overdue' },
              ].map(({ key, label }) => {
                const b = aging[key] || { count: 0, amount: 0 };
                return (
                  <div key={key} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <div className="text-sm text-gray-700">{label}</div>
                      <div className="text-xs text-gray-400">{b.count} invoice{b.count !== 1 ? 's' : ''}</div>
                    </div>
                    <span className={`text-sm font-semibold tabular-nums ${key === 'over_90' && b.amount > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      {fmt(b.amount)}
                    </span>
                  </div>
                );
              })}
              <div className="flex items-center justify-between pt-2 font-semibold text-sm">
                <span>Total on invoices</span>
                <span className="text-[#0D3B6E] tabular-nums">{fmt(aging.total?.amount)}</span>
              </div>
              {showArMismatch && (
                <div className="mt-2 text-xs text-amber-700 flex items-start gap-1 bg-amber-50 rounded-lg p-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>
                    Invoice total differs from GL receivables (1110) by {fmt(arDiff)}.
                    Post or sync invoice journals to reconcile.
                  </span>
                </div>
              )}
              {(counts.overdue_invoices || 0) > 0 && (
                <div className="mt-2 text-xs text-red-600 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {counts.overdue_invoices} overdue invoice{counts.overdue_invoices !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">No outstanding receivables</p>
          )}
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4">Quick actions</h3>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_ACTIONS.map((a) => (
              <Link key={a.href} href={a.href} className={`text-sm font-medium px-3 py-2.5 rounded-lg text-center hover:opacity-90 transition-opacity ${a.color}`}>
                {a.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div className="card p-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Recent journal entries</h3>
            <Link href={accountingHref('journal')} className="text-xs text-[#0D3B6E] hover:underline">View all →</Link>
          </div>
          {data?.recent_journal?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-sm">
                <thead className="table-header">
                  <tr>
                    {['Date', 'Reference', 'Description', 'Amount'].map((h) => (
                      <th key={h} className="px-3 md:px-4 py-2 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.recent_journal.map((j: any) => (
                    <tr key={j.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                      <td className="px-3 md:px-4 py-2 text-gray-500 whitespace-nowrap">{new Date(j.entry_date).toLocaleDateString()}</td>
                      <td className="px-3 md:px-4 py-2 font-mono text-xs text-[#0D3B6E]">{j.reference}</td>
                      <td className="px-3 md:px-4 py-2 text-gray-700 max-w-[140px] truncate">{j.description}</td>
                      <td className="px-3 md:px-4 py-2 text-right tabular-nums font-medium">{fmt(j.total_debit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-10">No journal entries yet</p>
          )}
        </div>

        <div className="card p-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Recent expenses</h3>
            <Link href={accountingHref('expenses')} className="text-xs text-[#0D3B6E] hover:underline">View all →</Link>
          </div>
          {data?.recent_expenses?.length ? (
            <div className="divide-y divide-gray-50">
              {data.recent_expenses.map((e: any, i: number) => (
                <div key={i} className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{e.title}</div>
                    <div className="text-xs text-gray-400">{e.category || 'Uncategorized'} · {new Date(e.expense_date).toLocaleDateString()}</div>
                  </div>
                  <span className="text-sm font-semibold text-red-600 tabular-nums shrink-0 ml-2">{fmt(e.amount)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-10">No expenses recorded</p>
          )}
        </div>
      </div>

      {/* Account summary by type */}
      {data?.accounts_by_type?.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Chart of accounts summary</h3>
            <Link href={accountingHref('accounts')} className="text-xs text-[#0D3B6E] hover:underline">Manage accounts →</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {data.accounts_by_type.map((t: any) => (
              <div key={t.type} className="rounded-lg bg-gray-50 px-3 py-3 text-center">
                <div className={`text-lg font-bold tabular-nums ${TYPE_COLORS[t.type] || 'text-gray-800'}`}>
                  {fmtCompact(t.balance)}
                </div>
                <div className="text-xs text-gray-500 capitalize mt-0.5">{t.type}</div>
                <div className="text-[10px] text-gray-400">
                  {t.count} account{t.count !== 1 ? 's' : ''}
                  {(t.type === 'revenue' || t.type === 'expense') && ` · ${data?.period_label}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Admin tools */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Setup & data tools</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card">
            <h4 className="font-semibold text-gray-800 text-sm">Advanced COA</h4>
            <p className="text-xs text-gray-500 mt-1 mb-3">Add VAT Input, PAYE & SSNIT payable accounts.</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-secondary text-xs" onClick={seedCoa} disabled={syncingCoa}>
                {syncingCoa
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Syncing COA…</>
                  : 'Update COA'}
              </button>
              <button type="button" className="btn-secondary text-xs" onClick={() => setDepConfirm(true)}>Run depreciation</button>
            </div>
          </div>
          <div className="card">
            <h4 className="font-semibold text-gray-800 text-sm">Import data</h4>
            <p className="text-xs text-gray-500 mt-1 mb-3">Bulk import expenses or journal entries from CSV.</p>
            <button type="button" className="btn-secondary text-xs" onClick={onImport}>
              <Download className="w-3.5 h-3.5" /> Import CSV
            </button>
          </div>
          <div className="card">
            <h4 className="font-semibold text-gray-800 text-sm">Export</h4>
            <p className="text-xs text-gray-500 mt-1 mb-3">Download journal entries for QuickBooks or Xero.</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-secondary text-xs" onClick={() => exportAccounting('quickbooks')}>QuickBooks</button>
              <button type="button" className="btn-secondary text-xs" onClick={() => exportAccounting('xero')}>Xero</button>
            </div>
          </div>
        </div>
      </div>

      <HrConfirmModal
        open={depConfirm}
        title="Run monthly depreciation?"
        message="Post depreciation for all active fixed assets (straight-line, default 10% annual)."
        confirmLabel="Run depreciation"
        onConfirm={runDepreciation}
        onClose={() => setDepConfirm(false)}
      />
    </div>
  );
}
