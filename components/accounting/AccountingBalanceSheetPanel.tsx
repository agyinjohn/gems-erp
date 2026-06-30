'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Landmark, Scale, Download, FileText, RefreshCw, AlertTriangle, CheckCircle2, DollarSign, TrendingDown,
} from 'lucide-react';
import { EmptyState, Spinner, StatCard, toast } from '@/components/ui';
import api from '@/lib/api';

function fmt(n: number | string | undefined | null) {
  const v = parseFloat(String(n ?? 0));
  const prefix = v < 0 ? '-' : '';
  return `${prefix}GH₵ ${Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function displayAsOf(value?: string | null) {
  if (!value) return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return value;
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

interface Props {
  onDataChange?: () => void;
}

function BsLine({ label, value, indent }: { label: string; value: number; indent?: boolean }) {
  return (
    <div className="flex items-baseline py-[5px] border-b border-dotted border-gray-100 last:border-0">
      <span className={`text-sm text-gray-600 flex-1 ${indent ? 'pl-6' : 'pl-2'}`}>{label}</span>
      <span className="text-sm text-gray-800 tabular-nums w-44 text-right">{fmt(value)}</span>
    </div>
  );
}

function BsSubtotal({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline py-[6px] mt-1">
      <span className="text-sm font-semibold text-gray-700 flex-1 pl-2">{label}</span>
      <span className="text-sm font-semibold text-gray-900 tabular-nums w-44 text-right border-t border-gray-400 pt-0.5">{fmt(value)}</span>
    </div>
  );
}

function BsTotal({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline py-2 mt-1">
      <span className="text-sm font-bold uppercase tracking-wide text-gray-900 flex-1 pl-2">{label}</span>
      <span
        className="text-sm font-bold text-gray-900 tabular-nums w-44 text-right"
        style={{ borderTop: '2px solid #111', borderBottom: '2px solid #111', paddingTop: '2px', paddingBottom: '2px' }}
      >
        {fmt(value)}
      </span>
    </div>
  );
}

function BsSection({ title }: { title: string }) {
  return (
    <div className="mt-7 mb-2 pb-1 border-b border-gray-300">
      <span className="text-xs font-bold uppercase tracking-widest text-gray-500">{title}</span>
    </div>
  );
}

export default function AccountingBalanceSheetPanel(_: Props) {
  const [asOf, setAsOf] = useState(() => new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (asOf) params.append('as_of', asOf);
      const res = await api.get(`/accounting/balance-sheet?${params.toString()}`);
      setData(res.data.data);
    } catch {
      toast.error('Could not load balance sheet');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [asOf]);

  useEffect(() => { load(); }, [load]);

  const exportCsv = () => {
    if (!data) return;
    const rows: string[][] = [
      ['Balance Sheet', displayAsOf(data.as_of)],
      [],
      ['ASSETS', ''],
    ];
    (data.assets?.lines?.current || []).forEach((l: any) => rows.push([l.name, String(l.amount)]));
    rows.push(['Total Current Assets', String(data.assets?.total_current ?? 0)]);
    (data.assets?.lines?.non_current || []).forEach((l: any) => rows.push([l.name, String(l.amount)]));
    if ((data.assets?.lines?.non_current || []).length) {
      rows.push(['Total Non-Current Assets', String(data.assets?.total_non_current ?? 0)]);
    }
    rows.push(['Total Assets', String(data.assets?.total ?? 0)], [], ['LIABILITIES', '']);
    (data.liabilities?.lines?.current || []).forEach((l: any) => rows.push([l.name, String(l.amount)]));
    rows.push(['Total Current Liabilities', String(data.liabilities?.total_current ?? 0)]);
    (data.liabilities?.lines?.non_current || []).forEach((l: any) => rows.push([l.name, String(l.amount)]));
    if ((data.liabilities?.lines?.non_current || []).length) {
      rows.push(['Total Non-Current Liabilities', String(data.liabilities?.total_non_current ?? 0)]);
    }
    rows.push(['Total Liabilities', String(data.liabilities?.total ?? 0)], [], ['EQUITY', '']);
    (data.equity?.lines || []).forEach((l: any) => rows.push([l.name, String(l.amount)]));
    rows.push(['Total Equity', String(data.equity?.total ?? 0)]);
    const csv = rows.map((r) => r.map((c: string | number) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `balance-sheet-${data.as_of || Date.now()}.csv`;
    a.click();
  };

  const printReport = () => {
    const el = document.getElementById('bs-print');
    if (!el) return;
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(`<html><head><title>Balance Sheet</title><style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Arial,sans-serif;font-size:13px;padding:32px;color:#111;}</style></head><body>${el.innerHTML}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  const bs = data;
  const arMismatch = bs && Math.abs(bs.ar_gl_vs_invoice_diff ?? 0) > 0.02;

  return (
    <div className={`space-y-5 relative ${loading && bs ? 'opacity-60 pointer-events-none' : ''}`}>
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div>
            <label className="form-label">As at date</label>
            <input type="date" className="form-input" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
            <p className="text-xs text-gray-500 mt-1">Balances include all journal entries through this date.</p>
          </div>
          <div className="flex flex-wrap gap-2 sm:ml-auto">
            <button type="button" className="btn-primary text-xs" onClick={load} disabled={loading}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Loading…' : 'Refresh'}
            </button>
            {bs && (
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

      {loading && !bs && <Spinner />}

      {bs && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Total assets" value={fmt(bs.summary?.total_assets ?? bs.assets?.total)} icon={<Landmark className="w-5 h-5 text-green-600" />} color="bg-green-50" />
            <StatCard label="Total liabilities" value={fmt(bs.summary?.total_liabilities ?? bs.liabilities?.total)} icon={<TrendingDown className="w-5 h-5 text-red-600" />} color="bg-red-50" />
            <StatCard label="Total equity" value={fmt(bs.summary?.total_equity ?? bs.equity?.total)} icon={<DollarSign className="w-5 h-5 text-blue-600" />} color="bg-blue-50" />
            <StatCard
              label="Balance check"
              value={bs.is_balanced ? 'Balanced' : 'Out of balance'}
              icon={bs.is_balanced ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <AlertTriangle className="w-5 h-5 text-amber-600" />}
              color={bs.is_balanced ? 'bg-green-50' : 'bg-amber-50'}
              sub={!bs.is_balanced && bs.checks ? `Diff ${fmt(bs.checks.difference)}` : 'Assets = Liabilities + Equity'}
            />
          </div>

          {arMismatch && (
            <div className="card flex items-start gap-3 border-l-4 border-l-amber-500 py-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm text-gray-700">
                <p className="font-medium text-amber-800">AR GL vs open invoices mismatch</p>
                <p className="mt-1">
                  GL Accounts Receivable ({fmt(bs.assets?.accounts_receivable)}) differs from open invoice balance ({fmt(bs.invoice_ar_total)}) by {fmt(bs.ar_gl_vs_invoice_diff)}.
                </p>
              </div>
            </div>
          )}

          <div id="bs-print" className="w-full">
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="text-center py-7 px-8 border-b border-gray-100">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">GEMS</p>
                <h2 className="text-2xl font-bold text-gray-900">Balance Sheet</h2>
                <p className="text-sm text-gray-500 mt-1">As at {displayAsOf(bs.as_of)}</p>
                <p className="text-xs text-gray-400 mt-0.5">All amounts in Ghana Cedis (GH₵) · General ledger</p>
              </div>

              <div className="px-8 py-6">
                <BsSection title="Assets" />

                {(bs.assets?.lines?.current?.length > 0) && (
                  <>
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider pl-2 mb-1 mt-3">Current Assets</div>
                    {bs.assets.lines.current.map((l: any) => (
                      <BsLine key={l.code} label={l.name} value={l.amount} indent />
                    ))}
                    <BsSubtotal label="Total Current Assets" value={bs.assets.total_current} />
                  </>
                )}

                {(bs.assets?.lines?.non_current?.length > 0) && (
                  <>
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider pl-2 mb-1 mt-4">Non-Current Assets</div>
                    {bs.assets.lines.non_current.map((l: any) => (
                      <BsLine key={l.code} label={l.name} value={l.amount} indent />
                    ))}
                    <BsSubtotal label="Total Non-Current Assets" value={bs.assets.total_non_current} />
                  </>
                )}

                <div className="mt-4" />
                <BsTotal label="Total Assets" value={bs.assets?.total ?? 0} />

                <BsSection title="Liabilities" />

                {(bs.liabilities?.lines?.current?.length > 0) && (
                  <>
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider pl-2 mb-1 mt-3">Current Liabilities</div>
                    {bs.liabilities.lines.current.map((l: any) => (
                      <BsLine key={l.code} label={l.name} value={l.amount} indent />
                    ))}
                    <BsSubtotal label="Total Current Liabilities" value={bs.liabilities.total_current} />
                  </>
                )}

                {(bs.liabilities?.lines?.non_current?.length > 0) && (
                  <>
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider pl-2 mb-1 mt-4">Non-Current Liabilities</div>
                    {bs.liabilities.lines.non_current.map((l: any) => (
                      <BsLine key={l.code} label={l.name} value={l.amount} indent />
                    ))}
                    <BsSubtotal label="Total Non-Current Liabilities" value={bs.liabilities.total_non_current} />
                  </>
                )}

                <div className="mt-4" />
                <BsTotal label="Total Liabilities" value={bs.liabilities?.total ?? 0} />

                <BsSection title="Shareholders' Equity" />
                <div className="mt-3" />
                {(bs.equity?.lines || []).map((l: any) => (
                  <BsLine key={l.code} label={l.name} value={l.amount} indent />
                ))}
                <BsSubtotal label="Total Equity" value={bs.equity?.total ?? 0} />

                <div className="mt-4" />
                <BsTotal label="Total Liabilities & Equity" value={(bs.liabilities?.total ?? 0) + (bs.equity?.total ?? 0)} />

                <div className={`mt-6 rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm ${bs.is_balanced ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <span className={`font-mono text-xs ${bs.is_balanced ? 'text-green-700' : 'text-red-700'}`}>
                    Assets {fmt(bs.assets?.total)} = Liabilities {fmt(bs.liabilities?.total)} + Equity {fmt(bs.equity?.total)}
                  </span>
                  <span className={`font-bold text-sm flex items-center gap-1.5 ${bs.is_balanced ? 'text-green-700' : 'text-red-700'}`}>
                    {bs.is_balanced ? <><CheckCircle2 className="w-4 h-4" /> Balanced</> : <><Scale className="w-4 h-4" /> Unbalanced</>}
                  </span>
                </div>
              </div>

              <div className="px-8 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-400 text-center">
                Prepared by GEMS · {displayAsOf(bs.as_of)} · Unaudited
              </div>
            </div>
          </div>
        </>
      )}

      {!bs && !loading && (
        <EmptyState message="No balance sheet data available" icon={<Landmark className="w-8 h-8 text-gray-300" />} />
      )}
    </div>
  );
}
