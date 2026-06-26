'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { Modal, EmptyState, Spinner } from '@/components/ui';
import ResponsiveTable from '@/components/ui/ResponsiveTable';
import api from '@/lib/api';
import { fmtGhs } from '@/lib/reportUtils';
import {
  Clock, Search, Monitor, ChevronLeft, ChevronRight, Printer,
  RefreshCw, User, Receipt, Eye,
} from 'lucide-react';

type DetailTab = 'overview' | 'products' | 'transactions' | 'refunds';

const STATUS_STYLES: Record<string, { pill: string; dot: string; label: string }> = {
  open:   { pill: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', dot: 'bg-emerald-500', label: 'Open' },
  closed: { pill: 'bg-gray-100 text-gray-600 ring-gray-500/10', dot: 'bg-gray-400', label: 'Closed' },
};

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  card: 'Card',
  card_terminal: 'Card terminal',
  momo: 'Mobile money',
  mobile_money: 'Mobile money',
  paystack: 'Paystack',
};

function fmtDateTime(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function fmtDateShort(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtTime(d?: string | null) {
  if (!d) return '';
  return new Date(d).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function fmtDuration(opened?: string | null, closed?: string | null) {
  if (!opened) return '—';
  const start = new Date(opened).getTime();
  const end = closed ? new Date(closed).getTime() : Date.now();
  const mins = Math.max(0, Math.round((end - start) / 60000));
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function cashierLabel(s: any) {
  return s.cashier_name || s.opened_by?.name || 'Unknown';
}

function varianceClass(v: number) {
  if (v < 0) return 'text-red-600';
  if (v > 0) return 'text-emerald-600';
  return 'text-gray-700';
}

function StatusPill({ status }: { status: string }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.closed;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ring-1 ring-inset ${s.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot} ${status === 'open' ? 'animate-pulse' : ''}`} />
      {s.label}
    </span>
  );
}

function DetailTabs({ tab, onChange, counts }: {
  tab: DetailTab;
  onChange: (t: DetailTab) => void;
  counts: { products: number; transactions: number; refunds: number };
}) {
  const tabs: { id: DetailTab; label: string; count?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'products', label: 'Products', count: counts.products },
    { id: 'transactions', label: 'Transactions', count: counts.transactions },
    { id: 'refunds', label: 'Refunds', count: counts.refunds },
  ];

  return (
    <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin border-b border-gray-100">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={`shrink-0 px-3 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            tab === t.id
              ? 'text-[#0D3B6E] border-b-2 border-[#0D3B6E] -mb-px bg-[#0D3B6E]/5'
              : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
          }`}
        >
          {t.label}
          {t.count !== undefined && t.count > 0 && (
            <span className="ml-1.5 text-xs text-gray-400">({t.count})</span>
          )}
        </button>
      ))}
    </div>
  );
}

export default function ShiftHistoryPage() {
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<any>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('overview');
  const [detailLoading, setDetailLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page: p, limit: 20 };
      if (status !== 'all') params.status = status;
      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;
      const r = await api.get('/pos/shifts', { params });
      setShifts(r.data.shifts || []);
      setPage(r.data.page || p);
      setPages(r.data.pages || 1);
      setTotal(r.data.total || 0);
    } finally {
      setLoading(false);
    }
  }, [status, dateFrom, dateTo]);

  useEffect(() => { load(1); }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return shifts;
    const q = search.toLowerCase();
    return shifts.filter((s) =>
      s.shift_number?.toLowerCase().includes(q) ||
      s.cashier_name?.toLowerCase().includes(q) ||
      s.opened_by?.name?.toLowerCase().includes(q) ||
      s.closed_by?.name?.toLowerCase().includes(q),
    );
  }, [shifts, search]);

  const hasFilters = search || status !== 'all' || dateFrom || dateTo;

  const clearFilters = () => {
    setSearch('');
    setStatus('all');
    setDateFrom('');
    setDateTo('');
  };

  const openDetail = async (shift: any) => {
    setDetailTab('overview');
    setDetailLoading(true);
    setDetail({ loading: true, shift_number: shift.shift_number });
    try {
      const r = await api.get(`/pos/shifts/${shift.id}`);
      setDetail(r.data.data);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetail(null);
    setDetailTab('overview');
  };

  return (
    <AppLayout
      title="Shift History"
      subtitle="Review past POS shifts, Z-reports, and transactions"
      allowedRoles={['business_owner', 'branch_manager', 'sales_staff']}
    >
      <div className="space-y-5">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/pos" className="btn-secondary text-sm inline-flex items-center gap-2">
            <Monitor className="w-4 h-4" /> Back to POS
          </Link>
          <button
            type="button"
            onClick={() => load(page)}
            disabled={loading}
            className="text-sm text-[#0D3B6E] hover:underline inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center gap-2">
            {(['all', 'closed', 'open'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  status === s
                    ? 'bg-[#0D3B6E] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s === 'all' ? 'All shifts' : s === 'closed' ? 'Closed' : 'Open'}
              </button>
            ))}
            {hasFilters && (
              <button type="button" onClick={clearFilters} className="ml-auto text-xs text-red-500 hover:underline">
                Clear filters
              </button>
            )}
          </div>
          <div className="p-4 flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="form-label">Search</label>
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  className="form-input pl-9"
                  placeholder="Shift number or cashier…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="form-label">From</label>
              <input type="date" className="form-input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="form-label">To</label>
              <input type="date" className="form-input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Shift list */}
        {loading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : filtered.length === 0 ? (
          <EmptyState
            message="No shifts found"
            description="Open and close a shift on the POS terminal to start building history."
            icon={<Clock className="w-10 h-10 text-gray-300" />}
            action={{ label: 'Go to POS', onClick: () => { window.location.href = '/pos'; } }}
          />
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">
                Shifts <span className="text-gray-400 font-normal text-sm">({total})</span>
              </h2>
            </div>
            <ResponsiveTable
              headers={['Shift', 'Cashier', 'Period', 'Sales', '']}
              data={filtered}
              keyField="id"
              renderRow={(s) => [
                <div key="shift" className="space-y-1">
                  <span className="font-mono font-semibold text-[#0D3B6E]">{s.shift_number}</span>
                  <div><StatusPill status={s.status} /></div>
                </div>,
                <span key="cashier" className="text-gray-700">{cashierLabel(s)}</span>,
                <div key="period" className="text-sm">
                  <p className="text-gray-800">{fmtDateShort(s.opened_at)} · {fmtTime(s.opened_at)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {s.status === 'open'
                      ? `Still open · ${fmtDuration(s.opened_at, s.closed_at)}`
                      : `${fmtTime(s.closed_at)} · ${fmtDuration(s.opened_at, s.closed_at)}`}
                  </p>
                </div>,
                <div key="sales" className="text-sm">
                  <p className="font-semibold tabular-nums text-gray-900">{fmtGhs(s.sales_total)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {s.sales_count || 0} txn{(s.sales_count || 0) === 1 ? '' : 's'}
                    {(s.refunds_total || 0) > 0 && (
                      <span className="text-amber-600"> · {fmtGhs(s.refunds_total)} refunded</span>
                    )}
                  </p>
                </div>,
                <button
                  key="view"
                  type="button"
                  className="text-xs font-semibold text-[#0D3B6E] hover:underline inline-flex items-center gap-1 whitespace-nowrap"
                  onClick={() => openDetail(s)}
                >
                  <Eye className="w-3.5 h-3.5" /> View
                </button>,
              ]}
            />
          </div>
        )}

        {pages > 1 && !loading && (
          <div className="flex items-center justify-center gap-4 pt-2">
            <button type="button" className="btn-secondary text-sm" disabled={page <= 1} onClick={() => load(page - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-500 tabular-nums">Page {page} of {pages}</span>
            <button type="button" className="btn-secondary text-sm" disabled={page >= pages} onClick={() => load(page + 1)}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Detail modal */}
      <Modal
        open={!!detail}
        onClose={closeDetail}
        title={detail?.shift?.shift_number ? detail.shift.shift_number : 'Shift details'}
        size="xl"
      >
        {detailLoading || detail?.loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : detail ? (
          <div id="shift-detail-print">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5 -mt-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <StatusPill status={detail.shift.status} />
                  <span className="text-sm text-gray-500">{fmtDuration(detail.shift.opened_at, detail.shift.closed_at)}</span>
                </div>
                <p className="text-sm text-gray-600 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-gray-400" />
                  {detail.shift.cashier_name || detail.shift.opened_by?.name || 'Unknown cashier'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {fmtDateTime(detail.shift.opened_at)}
                  {detail.shift.closed_at ? ` → ${fmtDateTime(detail.shift.closed_at)}` : ' → still open'}
                </p>
              </div>
              <button type="button" className="btn-secondary text-xs py-2 px-3 inline-flex items-center gap-1.5 print:hidden shrink-0" onClick={() => window.print()}>
                <Printer className="w-3.5 h-3.5" /> Print Z-Report
              </button>
            </div>

            {/* Quick metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
              {[
                { label: 'Gross sales', value: fmtGhs(detail.summary.gross_sales), accent: 'text-gray-900' },
                { label: 'Refunds', value: fmtGhs(detail.summary.total_refunds), accent: 'text-amber-700' },
                { label: 'Net sales', value: fmtGhs(detail.summary.net_sales), accent: 'text-emerald-700' },
                { label: 'Transactions', value: String(detail.summary.order_count), accent: 'text-gray-900' },
              ].map((m) => (
                <div key={m.label} className="rounded-xl border border-gray-100 bg-gray-50/80 px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">{m.label}</p>
                  <p className={`text-lg font-bold tabular-nums ${m.accent}`}>{m.value}</p>
                </div>
              ))}
            </div>

            <DetailTabs
              tab={detailTab}
              onChange={setDetailTab}
              counts={{
                products: detail.products?.length || 0,
                transactions: detail.orders?.length || 0,
                refunds: detail.refunds?.length || 0,
              }}
            />

            <div className="mt-5 max-h-[50vh] overflow-y-auto print:max-h-none">
              {detailTab === 'overview' && (
                <div className="space-y-5">
                  {detail.z_report && (
                    <div className="rounded-xl border border-gray-200 overflow-hidden">
                      <div className="bg-[#0D3B6E] px-4 py-3 flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-white/80" />
                        <h3 className="text-sm font-semibold text-white">Z-Report</h3>
                      </div>
                      <div className="p-4 grid sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                        {[
                          ['Opening float', fmtGhs(detail.z_report.opening_float)],
                          ['Cash sales', fmtGhs(detail.z_report.cash_sales)],
                          ['Card', fmtGhs(detail.z_report.card_total)],
                          ['Mobile money', fmtGhs(detail.z_report.momo_total)],
                          ['Expected cash', fmtGhs(detail.z_report.expected_cash)],
                          ['Actual cash', fmtGhs(detail.z_report.actual_cash)],
                          ['Cash variance', fmtGhs(detail.z_report.cash_variance)],
                          ['Transaction count', String(detail.z_report.sales_count)],
                        ].map(([k, v]) => (
                          <div key={k} className="flex justify-between py-1.5 border-b border-gray-50">
                            <span className="text-gray-500">{k}</span>
                            <span className={`font-semibold tabular-nums ${k === 'Cash variance' ? varianceClass(detail.z_report.cash_variance) : ''}`}>{v}</span>
                          </div>
                        ))}
                      </div>
                      {detail.shift.notes && (
                        <p className="px-4 pb-4 text-sm text-gray-500 border-t border-gray-100 pt-3">
                          <span className="font-medium text-gray-700">Notes:</span> {detail.shift.notes}
                        </p>
                      )}
                    </div>
                  )}

                  {detail.payment_breakdown?.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-800 mb-2">Payment breakdown</h3>
                      <div className="space-y-2">
                        {detail.payment_breakdown.map((p: any) => (
                          <div key={p.method} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-gray-50">
                            <span className="text-gray-600">{METHOD_LABELS[p.method] || p.method}</span>
                            <span className="font-semibold tabular-nums">{fmtGhs(p.gross_total)} <span className="text-gray-400 font-normal">({p.orders})</span></span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {detail.shift.closed_by?.name && (
                    <p className="text-xs text-gray-400">Closed by {detail.shift.closed_by.name}</p>
                  )}
                </div>
              )}

              {detailTab === 'products' && (
                <div>
                  {detail.products?.length > 0 ? (
                    <div className="overflow-x-auto rounded-xl border border-gray-100">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                          <tr>
                            <th className="px-4 py-3 text-left">Product</th>
                            <th className="px-4 py-3 text-right">Sold</th>
                            <th className="px-4 py-3 text-right">Refunded</th>
                            <th className="px-4 py-3 text-right">Net</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {detail.products.map((p: any) => (
                            <tr key={p.product_name} className="hover:bg-gray-50/50">
                              <td className="px-4 py-3 font-medium text-gray-800">{p.product_name}</td>
                              <td className="px-4 py-3 text-right tabular-nums">{p.quantity_sold}</td>
                              <td className="px-4 py-3 text-right tabular-nums text-amber-600">{p.quantity_refunded || '—'}</td>
                              <td className="px-4 py-3 text-right tabular-nums font-semibold">{fmtGhs(p.net_revenue)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-10">No products sold in this shift.</p>
                  )}
                </div>
              )}

              {detailTab === 'transactions' && (
                <div className="space-y-2">
                  {detail.orders?.length > 0 ? detail.orders.map((o: any) => (
                    <div key={o.id} className="rounded-xl border border-gray-100 overflow-hidden">
                      <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-2 bg-gray-50/50">
                        <div>
                          <p className="font-mono text-sm font-semibold text-gray-800">{o.order_number}</p>
                          <p className="text-xs text-gray-400">{fmtDateTime(o.created_at)} · {METHOD_LABELS[o.payment_method] || o.payment_method}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold tabular-nums">{fmtGhs(o.subtotal)}</p>
                          {o.refund_amount > 0 && (
                            <p className="text-xs text-red-600">−{fmtGhs(o.refund_amount)} refunded</p>
                          )}
                        </div>
                      </div>
                      <ul className="px-4 py-2 text-sm text-gray-600 divide-y divide-gray-50">
                        {o.items.map((i: any, idx: number) => (
                          <li key={idx} className="py-1.5 flex justify-between gap-2">
                            <span>
                              {i.product_name} <span className="text-gray-400">×{i.quantity}</span>
                              {i.refunded_qty > 0 && <span className="text-red-500 text-xs ml-1">(−{i.refunded_qty})</span>}
                            </span>
                            <span className="tabular-nums shrink-0">{fmtGhs(i.total)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )) : (
                    <p className="text-sm text-gray-400 text-center py-10">No transactions in this shift.</p>
                  )}
                </div>
              )}

              {detailTab === 'refunds' && (
                <div className="space-y-3">
                  {detail.refunds?.length > 0 ? detail.refunds.map((ref: any) => (
                    <div key={ref.order_number} className="rounded-xl border border-red-100 bg-red-50/40 overflow-hidden">
                      <div className="px-4 py-3 flex justify-between items-center border-b border-red-100/80">
                        <span className="font-mono text-sm font-semibold text-gray-800">{ref.order_number}</span>
                        <span className="font-bold text-red-700 tabular-nums">{fmtGhs(ref.refund_amount)}</span>
                      </div>
                      <ul className="px-4 py-2 text-sm text-gray-600 space-y-1">
                        {ref.items.map((i: any, idx: number) => (
                          <li key={idx} className="flex justify-between gap-2 py-1">
                            <span>{i.product_name} × {i.quantity}</span>
                            <span className="tabular-nums text-red-600">{fmtGhs(i.amount)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )) : (
                    <p className="text-sm text-gray-400 text-center py-10">No refunds in this shift.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </AppLayout>
  );
}
