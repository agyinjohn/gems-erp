'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Activity, Download, FileText, RefreshCw, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown, DollarSign,
} from 'lucide-react';

const CedisIcon = ({ className }: { className?: string }) => (
  <span className={`font-bold font-serif leading-none flex items-center justify-center ${className}`}>₵</span>
);
import { EmptyState, Spinner, StatCard, toast } from '@/components/ui';
import api from '@/lib/api';

type PeriodKey = 'mtd' | 'ytd' | 'all' | 'custom';

function fmt(n: number | string | undefined | null) {
  const v = parseFloat(String(n ?? 0));
  const prefix = v < 0 ? '-' : '';
  return `${prefix}GH₵ ${Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

export default function AccountingCashFlowPanel(_: Props) {
  const [period, setPeriod] = useState<PeriodKey>('ytd');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (period === 'custom' && !from && !to) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (period === 'custom') {
        params.append('period', 'custom');
        if (from) params.append('from', from);
        if (to) params.append('to', to);
      } else {
        params.append('period', period);
      }
      const res = await api.get(`/accounting/cashflow?${params.toString()}`);
      const payload = res.data.data;
      setData(payload?.empty ? null : payload);
    } catch {
      toast.error('Could not load cash flow statement');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [period, from, to]);

  useEffect(() => { load(); }, [load]);

  const exportCsv = () => {
    if (!data) return;
    const rows: string[][] = [
      ['Cash Flow Statement', data.period_label || '', displayDateRange(data.filters?.from, data.filters?.to)],
      [],
      ['Opening balance', String(data.opening_balance ?? 0)],
      ['OPERATING', ''],
      ...(data.operating?.items || []).map((i: any) => [i.label, String(i.amount)]),
      ['Net operating', String(data.operating?.net ?? 0)],
      ['INVESTING', ''],
      ...(data.investing?.items || []).map((i: any) => [i.label, String(i.amount)]),
      ['Net investing', String(data.investing?.net ?? 0)],
      ['FINANCING', ''],
      ...(data.financing?.items || []).map((i: any) => [i.label, String(i.amount)]),
      ['Net financing', String(data.financing?.net ?? 0)],
      ['Net change', String(data.net_change ?? 0)],
      ['Closing balance', String(data.closing_balance ?? 0)],
    ];
    const csv = rows.map((r) => r.map((c: string | number) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `cashflow-${Date.now()}.csv`;
    a.click();
  };

  const printReport = () => {
    const el = document.getElementById('cf-print');
    if (!el) return;
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(`<html><head><title>Cash Flow</title><style>body{font-family:Arial,sans-serif;font-size:13px;padding:32px;}</style></head><body>${el.innerHTML}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  const cf = data;
  const isPos = (v: number) => v >= 0;
  const checks = cf?.checks;
  const customNeedsDates = period === 'custom' && !from && !to;

  const Row = ({ label, value, indent, bold }: { label: string; value: number; indent?: boolean; bold?: boolean }) => (
    <div className={`flex justify-between py-2 border-b border-gray-50 last:border-0 ${bold ? 'font-semibold' : ''}`}>
      <span className={`text-sm text-gray-700 ${indent ? 'pl-6' : ''}`}>{label}</span>
      <span className={`text-sm tabular-nums ${bold ? (isPos(value) ? 'text-green-700' : 'text-red-600') : 'text-gray-800'}`}>{fmt(value)}</span>
    </div>
  );

  const SectionTotal = ({ label, value }: { label: string; value: number }) => (
    <div className={`flex justify-between py-2.5 mt-1 border-t-2 ${isPos(value) ? 'border-green-400' : 'border-red-400'}`}>
      <span className="text-sm font-bold text-gray-900">{label}</span>
      <span className={`text-sm font-bold tabular-nums ${isPos(value) ? 'text-green-700' : 'text-red-600'}`}>{fmt(value)}</span>
    </div>
  );

  return (
    <div className={`space-y-5 relative ${loading && cf ? 'opacity-60 pointer-events-none' : ''}`}>
      <div className="card space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4">
          <div className="flex-1 space-y-3">
            <div>
              <label className="form-label">Period</label>
              <div className="flex flex-wrap gap-2">
                {PERIOD_PRESETS.map((p) => (
                  <button key={p.key} type="button" onClick={() => { setPeriod(p.key); setFrom(''); setTo(''); }} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${period === p.key ? 'bg-[#0D3B6E] text-white' : 'bg-gray-100 text-gray-600'}`}>{p.label}</button>
                ))}
                <button type="button" onClick={() => setPeriod('custom')} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${period === 'custom' ? 'bg-[#0D3B6E] text-white' : 'bg-gray-100 text-gray-600'}`}>Custom</button>
              </div>
            </div>
            {period === 'custom' && (
              <div className="flex flex-col sm:flex-row gap-3">
                <div><label className="form-label">From</label><input type="date" className="form-input" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
                <div><label className="form-label">To</label><input type="date" className="form-input" value={to} onChange={(e) => setTo(e.target.value)} /></div>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary text-xs" onClick={load} disabled={loading || customNeedsDates}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> {loading ? 'Loading…' : 'Refresh'}
            </button>
            {cf && (
              <>
                <button type="button" className="btn-secondary text-xs" onClick={exportCsv}><Download className="w-3.5 h-3.5" /> CSV</button>
                <button type="button" className="btn-secondary text-xs" onClick={printReport}><FileText className="w-3.5 h-3.5" /> Print</button>
              </>
            )}
          </div>
        </div>
      </div>

      {loading && !cf && !customNeedsDates && <Spinner />}
      {customNeedsDates && !loading && <EmptyState message="Pick a from and/or to date" icon={<Activity className="w-8 h-8 text-gray-300" />} />}

      {cf && (
        <>
          {checks && (!checks.formula_balanced || !checks.matches_gl_cash) && (
            <div className="card flex items-start gap-3 border-l-4 border-l-amber-500 py-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <div className="text-sm text-gray-700 space-y-1">
                <p className="font-medium text-amber-800">Cash flow reconciliation note</p>
                {!checks.formula_balanced && <p>Opening + net change ({fmt(checks.opening_plus_net)}) differs from closing ({fmt(checks.closing_reported)}).</p>}
                {!checks.matches_gl_cash && <p>Closing cash ({fmt(checks.closing_reported)}) differs from GL cash account ({fmt(checks.gl_cash_balance)}).</p>}
              </div>
            </div>
          )}
          {checks?.formula_balanced && checks?.matches_gl_cash && (
            <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
              <CheckCircle2 className="w-4 h-4" /> Cash movement reconciles to GL cash balance (1001).
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Operating" value={fmt(cf.operating?.net)} icon={<TrendingUp className="w-5 h-5 text-[#0D3B6E]" />} color="bg-[#0D3B6E]/8" />
            <StatCard label="Investing" value={fmt(cf.investing?.net)} icon={<Activity className="w-5 h-5 text-purple-600" />} color="bg-purple-50" />
            <StatCard label="Financing" value={fmt(cf.financing?.net)} icon={<CedisIcon className="w-5 h-5 text-[#0D3B6E] text-sm" />} color="bg-[#0D3B6E]/8" />
            <StatCard label="Net change" value={fmt(cf.net_change)} icon={<TrendingDown className="w-5 h-5 text-green-600" />} color={isPos(cf.net_change) ? 'bg-green-50' : 'bg-red-50'} sub={`Closing ${fmt(cf.closing_balance)}`} />
          </div>

          <div id="cf-print" className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="text-center py-6 px-8 border-b border-gray-100">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">GEMS</p>
              <h2 className="text-2xl font-bold text-gray-900">Cash Flow Statement</h2>
              <p className="text-sm text-gray-500 mt-1">{cf.period_label} · {displayDateRange(cf.filters?.from, cf.filters?.to)}</p>
              <p className="text-xs text-gray-400 mt-0.5">GL cash account (1001) · Ghana Cedis (GH₵)</p>
            </div>
            <div className="px-8 py-6 space-y-6">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-gray-400 border-b border-gray-200 pb-2 mb-3">Operating activities</div>
                {(cf.operating?.items || []).length > 0
                  ? cf.operating.items.map((item: any, i: number) => <Row key={i} label={item.label} value={item.amount} indent />)
                  : <p className="text-sm text-gray-400 pl-6 py-2">No operating cash movement in period</p>}
                <SectionTotal label="Net cash from operating activities" value={cf.operating?.net ?? 0} />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-gray-400 border-b border-gray-200 pb-2 mb-3">Investing activities</div>
                {(cf.investing?.items || []).length > 0
                  ? cf.investing.items.map((item: any, i: number) => <Row key={i} label={item.label} value={item.amount} indent />)
                  : <p className="text-sm text-gray-400 pl-6 py-2">No investing activities recorded</p>}
                <SectionTotal label="Net cash from investing activities" value={cf.investing?.net ?? 0} />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-gray-400 border-b border-gray-200 pb-2 mb-3">Financing activities</div>
                {(cf.financing?.items || []).length > 0
                  ? cf.financing.items.map((item: any, i: number) => <Row key={i} label={item.label} value={item.amount} indent />)
                  : <p className="text-sm text-gray-400 pl-6 py-2">No financing activities recorded</p>}
                <SectionTotal label="Net cash from financing activities" value={cf.financing?.net ?? 0} />
              </div>
              <div className="border-t-2 border-gray-800 pt-4">
                <Row label="Opening cash balance" value={cf.opening_balance ?? 0} bold />
                <Row label="Net change in cash" value={cf.net_change ?? 0} bold />
                <div className={`flex justify-between py-3 mt-1 rounded-xl px-4 ${isPos(cf.closing_balance) ? 'bg-green-50' : 'bg-red-50'}`}>
                  <span className="text-base font-black text-gray-900">Closing cash balance</span>
                  <span className={`text-base font-black tabular-nums ${isPos(cf.closing_balance) ? 'text-green-700' : 'text-red-700'}`}>{fmt(cf.closing_balance)}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {!cf && !loading && !customNeedsDates && (
        <EmptyState message="No cash flow data for this period" icon={<Activity className="w-8 h-8 text-gray-300" />} />
      )}
    </div>
  );
}
