'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search, Download, RefreshCw, RotateCcw } from 'lucide-react';
import { EmptyState, Spinner, StatCard, toast } from '@/components/ui';
import api, { apiCache } from '@/lib/api';

type PeriodKey = 'all' | 'mtd' | 'ytd' | 'custom';

function fmt(n: number | string | undefined | null) {
  const v = Math.abs(parseFloat(String(n ?? 0)));
  return `GH₵ ${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function periodDates(key: PeriodKey, customFrom: string, customTo: string) {
  const now = new Date();
  if (key === 'mtd') {
    return {
      from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
      to: now.toISOString().slice(0, 10),
    };
  }
  if (key === 'ytd') {
    return {
      from: new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10),
      to: now.toISOString().slice(0, 10),
    };
  }
  if (key === 'custom') return { from: customFrom, to: customTo };
  return { from: '', to: '' };
}

const SOURCE_LABELS: Record<string, string> = {
  pos: 'POS',
  storefront: 'Storefront',
  internal_order: 'Internal Order',
};

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  mobile_money: 'Mobile Money',
  bank_transfer: 'Bank Transfer',
  card: 'Card',
  paystack: 'Paystack',
  manual: 'Manual',
};

interface Props {
  onDataChange?: () => void;
}

export default function AccountingRefundsPanel(_: Props) {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [source, setSource] = useState('');
  const [period, setPeriod] = useState<PeriodKey>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  // summary stats derived from current page + totals
  const [summary, setSummary] = useState({ count: 0, total_amount: 0, mtd: 0, ytd: 0 });

  const load = useCallback(async (p = 1, silent = false) => {
    const { from, to } = periodDates(period, customFrom, customTo);
    const params: Record<string, string> = { page: String(p), limit: '50', status: 'success' };
    // Refunds are negative-amount payment logs — filter by source if set
    if (source) params.source = source;
    if (from) params.from = from;
    if (to) params.to = to;

    const key = `/payment-logs/refunds?${new URLSearchParams(params).toString()}`;
    const cached = apiCache.get(key);
    if (cached) {
      setLogs(cached.logs); setTotal(cached.total); setPages(cached.pages);
      setSummary(cached.summary); setPage(p);
      setLoading(false);
      if (!apiCache.isStale(key)) return;
    } else if (!silent) {
      setLoading(true);
    }

    try {
      // Use payment-logs endpoint — refunds have negative amounts
      const apiParams: Record<string, string> = { page: String(p), limit: '50', status: 'success' };
      if (source) apiParams.source = source;
      if (from) apiParams.from = from;
      if (to) apiParams.to = to;

      const res = await api.get('/payment-logs', { params: apiParams });
      const all: any[] = res.data.data || [];

      // Filter to only refund records (negative amount)
      const refunds = all.filter((l: any) => parseFloat(l.amount) < 0);
      const filtered = search.trim()
        ? refunds.filter((l: any) =>
            l.reference?.toLowerCase().includes(search.toLowerCase()) ||
            l.payer_name?.toLowerCase().includes(search.toLowerCase()) ||
            l.description?.toLowerCase().includes(search.toLowerCase()),
          )
        : refunds;

      const totalAmount = filtered.reduce((s: number, l: any) => s + Math.abs(parseFloat(l.amount)), 0);

      // MTD / YTD summaries
      const now = new Date();
      const mtdStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const ytdStart = new Date(now.getFullYear(), 0, 1);
      const mtd = filtered.filter((l: any) => new Date(l.createdAt) >= mtdStart)
        .reduce((s: number, l: any) => s + Math.abs(parseFloat(l.amount)), 0);
      const ytd = filtered.filter((l: any) => new Date(l.createdAt) >= ytdStart)
        .reduce((s: number, l: any) => s + Math.abs(parseFloat(l.amount)), 0);

      const payload = {
        logs: filtered,
        total: filtered.length,
        pages: Math.ceil(filtered.length / 50) || 1,
        summary: { count: filtered.length, total_amount: totalAmount, mtd, ytd },
      };
      apiCache.set(key, payload);
      setLogs(payload.logs); setTotal(payload.total); setPages(payload.pages);
      setSummary(payload.summary); setPage(p);
    } catch {
      if (!cached) toast.error('Could not load refund records');
    } finally {
      setLoading(false);
    }
  }, [period, customFrom, customTo, source, search]);

  useEffect(() => {
    const t = setTimeout(() => load(1), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const exportCsv = () => {
    const header = ['Date', 'Reference', 'Source', 'Payer', 'Method', 'Description', 'Amount'];
    const body = logs.map((l: any) => [
      new Date(l.createdAt).toLocaleDateString(),
      l.reference || '',
      SOURCE_LABELS[l.source] || l.source || '',
      l.payer_name || '',
      METHOD_LABELS[l.method] || l.method || '',
      l.description || '',
      Math.abs(parseFloat(l.amount)).toFixed(2),
    ]);
    const csv = [header, ...body]
      .map((r) => r.map((c: string | number) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `refunds-${Date.now()}.csv`;
    a.click();
  };

  const PERIOD_OPTS: { key: PeriodKey; label: string }[] = [
    { key: 'all', label: 'All time' },
    { key: 'mtd', label: 'MTD' },
    { key: 'ytd', label: 'YTD' },
    { key: 'custom', label: 'Custom' },
  ];

  return (
    <div className={`space-y-5 relative ${loading && logs.length ? 'opacity-60 pointer-events-none' : ''}`}>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Total refunds"
          value={String(summary.count)}
          icon={<RotateCcw className="w-5 h-5 text-red-600" />}
          color="bg-red-50"
          sub="Filtered records"
        />
        <StatCard
          label="Total refunded"
          value={fmt(summary.total_amount)}
          icon={<RotateCcw className="w-5 h-5 text-red-600" />}
          color="bg-red-50"
          sub="Filtered period"
        />
        <StatCard
          label="Month to date"
          value={fmt(summary.mtd)}
          icon={<RotateCcw className="w-5 h-5 text-amber-600" />}
          color="bg-amber-50"
          sub="Calendar month"
        />
        <StatCard
          label="Year to date"
          value={fmt(summary.ytd)}
          icon={<RotateCcw className="w-5 h-5 text-[#0D3B6E]" />}
          color="bg-[#0D3B6E]/8"
          sub="Calendar year"
        />
      </div>

      {/* Toolbar */}
      <div className="card space-y-3">
        {/* Period filter */}
        <div className="flex flex-wrap gap-2">
          {PERIOD_OPTS.map((p) => (
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
            <div>
              <label className="form-label">From</label>
              <input type="date" className="form-input" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
            </div>
            <div>
              <label className="form-label">To</label>
              <input type="date" className="form-input" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className="form-input pl-9"
              placeholder="Search reference, payer, description…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="form-input w-full lg:w-44" value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="">All sources</option>
            {Object.entries(SOURCE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary text-xs" onClick={() => load(1)} disabled={loading}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <button type="button" className="btn-secondary text-xs" onClick={exportCsv} disabled={!logs.length}>
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading && !logs.length ? (
        <Spinner />
      ) : logs.length === 0 ? (
        <EmptyState
          message="No refund records found"
          description="Refunds processed via POS or storefront will appear here."
          icon={<RotateCcw className="w-8 h-8 text-gray-300" />}
        />
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs md:text-sm">
              <thead className="table-header">
                <tr>
                  {['Date & Time', 'Reference', 'Source', 'Payer', 'Method', 'Description', 'Amount'].map((h) => (
                    <th key={h} className="px-3 md:px-4 py-2 md:py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map((log: any) => (
                  <tr key={log._id} className="hover:bg-gray-50/80">
                    <td className="px-3 md:px-4 py-2 md:py-3 text-gray-500 whitespace-nowrap">
                      <div>{new Date(log.createdAt).toLocaleDateString()}</div>
                      <div className="text-xs text-gray-400">
                        {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-3 md:px-4 py-2 md:py-3 font-mono text-xs text-[#0D3B6E]">
                      {log.reference || '—'}
                    </td>
                    <td className="px-3 md:px-4 py-2 md:py-3">
                      <span className="badge bg-[#0D3B6E]/8 text-[#0D3B6E] text-xs">
                        {SOURCE_LABELS[log.source] || log.source || '—'}
                      </span>
                    </td>
                    <td className="px-3 md:px-4 py-2 md:py-3">
                      <div className="font-medium text-gray-900">{log.payer_name || '—'}</div>
                      {log.payer_email && (
                        <div className="text-xs text-gray-400 truncate max-w-[140px]">{log.payer_email}</div>
                      )}
                    </td>
                    <td className="px-3 md:px-4 py-2 md:py-3 text-gray-600 hidden md:table-cell">
                      {METHOD_LABELS[log.method] || log.method || '—'}
                    </td>
                    <td className="px-3 md:px-4 py-2 md:py-3 text-gray-500 max-w-[200px] truncate hidden lg:table-cell">
                      {log.description || '—'}
                    </td>
                    <td className="px-3 md:px-4 py-2 md:py-3 font-semibold text-red-600 tabular-nums whitespace-nowrap">
                      − {fmt(log.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm">
              <span className="text-gray-400">Page {page} of {pages} · {total} records</span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => load(page - 1)}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-gray-50 text-xs"
                >
                  Prev
                </button>
                <button
                  disabled={page >= pages}
                  onClick={() => load(page + 1)}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-gray-50 text-xs"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-gray-400">
        Refunds are sourced from payment logs with negative amounts — POS refunds, storefront reversals and credit note cash returns.
      </p>
    </div>
  );
}
