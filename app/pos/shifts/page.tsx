'use client';

import { useEffect, useState, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Modal, EmptyState, Spinner } from '@/components/ui';
import ResponsiveTable from '@/components/ui/ResponsiveTable';
import api, { apiCache } from '@/lib/api';
import { fmtGhs } from '@/lib/reportUtils';
import { Clock, Search, Eye, ChevronLeft, ChevronRight, Printer } from 'lucide-react';

const STATUS_BADGE: Record<string, string> = {
  open: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-600',
};

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  card: 'Card',
  card_terminal: 'Card (terminal)',
  momo: 'Mobile money',
  mobile_money: 'Mobile money',
  paystack: 'Paystack',
};

function fmtDateTime(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function fmtDuration(opened?: string | null, closed?: string | null) {
  if (!opened) return '—';
  const start = new Date(opened).getTime();
  const end = closed ? new Date(closed).getTime() : Date.now();
  const mins = Math.max(0, Math.round((end - start) / 60000));
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export default function ShiftHistoryPage() {
  const [shifts, setShifts] = useState<any[]>(() => {
    const c = apiCache.get('/pos/shifts?page=1');
    return c ? c.shifts : [];
  });
  const [loading, setLoading] = useState(() => !apiCache.get('/pos/shifts?page=1'));
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(() => {
    const c = apiCache.get('/pos/shifts?page=1');
    return c ? c.page : 1;
  });
  const [pages, setPages] = useState(() => {
    const c = apiCache.get('/pos/shifts?page=1');
    return c ? c.pages : 1;
  });

  const load = useCallback(async (p = 1, silent = false) => {
    const isUnfiltered = status === 'all' && !dateFrom && !dateTo && p === 1;
    const cacheKey = '/pos/shifts?page=1';
    if (!silent) setLoading(true);
    try {
      const params: Record<string, string | number> = { page: p, limit: 20 };
      if (status !== 'all') params.status = status;
      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;
      const r = await api.get('/pos/shifts', { params });
      const shifts = r.data.shifts || [];
      if (isUnfiltered) apiCache.set(cacheKey, { shifts, page: r.data.page || p, pages: r.data.pages || 1 });
      setShifts(shifts);
      setPage(r.data.page || p);
      setPages(r.data.pages || 1);
    } finally {
      setLoading(false);
    }
  }, [status, dateFrom, dateTo]);

  useEffect(() => {
    const hasCache = !!apiCache.get('/pos/shifts?page=1');
    const isUnfiltered = status === 'all' && !dateFrom && !dateTo;
    if (hasCache && isUnfiltered) {
      if (apiCache.isStale('/pos/shifts?page=1')) load(1, true);
    } else {
      load(1);
    }
  }, [load]);

  const openDetail = async (shift: any) => {
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

  const filtered = shifts.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.shift_number?.toLowerCase().includes(q) ||
      s.cashier_name?.toLowerCase().includes(q) ||
      s.opened_by?.name?.toLowerCase().includes(q) ||
      s.closed_by?.name?.toLowerCase().includes(q)
    );
  });

  const printDetail = () => {
    window.print();
  };

  return (
    <AppLayout
      title="Shift History"
      subtitle="Past POS shifts — sales, products, refunds, and Z-reports"
      allowedRoles={['business_owner', 'branch_manager', 'sales_staff']}
    >
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="form-label">Search</label>
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                className="form-input pl-9"
                placeholder="Shift # or cashier…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="form-label">Status</label>
            <select className="form-input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">All</option>
              <option value="closed">Closed</option>
              <option value="open">Open</option>
            </select>
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

        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : filtered.length === 0 ? (
          <EmptyState
            message="No shifts found"
            description="Open and close a shift on the POS terminal to start building history."
            icon={<Clock className="w-10 h-10 text-gray-300" />}
            action={{ label: 'Go to POS', onClick: () => { window.location.href = '/pos'; } }}
          />
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <ResponsiveTable
              headers={['Shift', 'Cashier', 'Started', 'Ended', 'Duration', 'Sales', 'Refunds', 'Variance', 'Status', '']}
              data={filtered}
              keyField="id"
              renderRow={(s) => [
                <span key="num" className="font-mono font-semibold text-[#0D3B6E]">{s.shift_number}</span>,
                s.cashier_name || s.opened_by?.name || '—',
                fmtDateTime(s.opened_at),
                s.status === 'open' ? <span className="text-green-600">Still open</span> : fmtDateTime(s.closed_at),
                fmtDuration(s.opened_at, s.closed_at),
                <span key="sales">{fmtGhs(s.sales_total)} <span className="text-gray-400">({s.sales_count || 0})</span></span>,
                fmtGhs(s.refunds_total),
                <span key="var" className={s.cash_variance < 0 ? 'text-red-600' : s.cash_variance > 0 ? 'text-green-600' : ''}>
                  {s.status === 'closed' ? fmtGhs(s.cash_variance) : '—'}
                </span>,
                <span key="st" className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[s.status] || 'bg-gray-100 text-gray-600'}`}>
                  {s.status}
                </span>,
                <button
                  key="view"
                  type="button"
                  className="text-xs font-semibold text-[#0D3B6E] hover:underline inline-flex items-center gap-1"
                  onClick={() => openDetail(s)}
                >
                  <Eye className="w-3.5 h-3.5" /> View
                </button>,
              ]}
            />
          </div>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              className="btn-secondary text-sm"
              disabled={page <= 1}
              onClick={() => load(page - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-500">Page {page} of {pages}</span>
            <button
              type="button"
              className="btn-secondary text-sm"
              disabled={page >= pages}
              onClick={() => load(page + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.shift?.shift_number ? `Shift ${detail.shift.shift_number}` : 'Shift details'}
        size="xl"
      >
        {detailLoading || detail?.loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : detail ? (
          <div className="space-y-6 max-h-[75vh] overflow-y-auto print:max-h-none" id="shift-detail-print">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
              {[
                ['Started', fmtDateTime(detail.shift.opened_at)],
                ['Ended', detail.shift.status === 'open' ? 'Still open' : fmtDateTime(detail.shift.closed_at)],
                ['Duration', fmtDuration(detail.shift.opened_at, detail.shift.closed_at)],
                ['Cashier', detail.shift.cashier_name || detail.shift.opened_by?.name || '—'],
                ['Closed by', detail.shift.closed_by?.name || '—'],
                ['Gross sales', fmtGhs(detail.summary.gross_sales)],
                ['Refunds', fmtGhs(detail.summary.total_refunds)],
                ['Net sales', fmtGhs(detail.summary.net_sales)],
              ].map(([label, value]) => (
                <div key={label} className="bg-gray-50 rounded-lg px-3 py-2">
                  <div className="text-xs text-gray-500">{label}</div>
                  <div className="font-semibold text-gray-900">{value}</div>
                </div>
              ))}
            </div>

            {detail.z_report && (
              <section>
                <h3 className="font-bold text-gray-900 mb-2">Z-Report summary</h3>
                <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm font-mono bg-gray-50 rounded-xl p-4">
                  {[
                    ['Opening float', fmtGhs(detail.z_report.opening_float)],
                    ['Cash sales', fmtGhs(detail.z_report.cash_sales)],
                    ['Card', fmtGhs(detail.z_report.card_total)],
                    ['Mobile money', fmtGhs(detail.z_report.momo_total)],
                    ['Expected cash', fmtGhs(detail.z_report.expected_cash)],
                    ['Actual cash', fmtGhs(detail.z_report.actual_cash)],
                    ['Cash variance', fmtGhs(detail.z_report.cash_variance)],
                    ['Transactions', String(detail.z_report.sales_count)],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between border-b border-gray-100 py-1">
                      <span className="text-gray-500">{k}</span>
                      <span className="font-semibold">{v}</span>
                    </div>
                  ))}
                </div>
                {detail.shift.notes && (
                  <p className="text-sm text-gray-500 mt-2">Notes: {detail.shift.notes}</p>
                )}
              </section>
            )}

            {detail.products?.length > 0 && (
              <section>
                <h3 className="font-bold text-gray-900 mb-2">Products sold</h3>
                <ResponsiveTable
                  headers={['Product', 'Qty sold', 'Refunded', 'Gross', 'Refunds', 'Net']}
                  data={detail.products}
                  keyField="product_name"
                  renderRow={(p: any) => [
                    p.product_name,
                    p.quantity_sold,
                    p.quantity_refunded || '—',
                    fmtGhs(p.gross_revenue),
                    p.refund_amount > 0 ? fmtGhs(p.refund_amount) : '—',
                    fmtGhs(p.net_revenue),
                  ]}
                />
              </section>
            )}

            {detail.refunds?.length > 0 && (
              <section>
                <h3 className="font-bold text-gray-900 mb-2">Refunds ({detail.refunds.length})</h3>
                <div className="space-y-3">
                  {detail.refunds.map((ref: any) => (
                    <div key={ref.order_number} className="border border-red-100 bg-red-50/50 rounded-lg p-3 text-sm">
                      <div className="flex flex-wrap justify-between gap-2 font-medium">
                        <span className="font-mono">{ref.order_number}</span>
                        <span className="text-red-700">{fmtGhs(ref.refund_amount)}</span>
                      </div>
                      <ul className="mt-2 text-gray-600 space-y-0.5">
                        {ref.items.map((i: any, idx: number) => (
                          <li key={idx}>
                            {i.product_name} × {i.quantity} — {fmtGhs(i.amount)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {detail.orders?.length > 0 && (
              <section>
                <h3 className="font-bold text-gray-900 mb-2">All transactions ({detail.orders.length})</h3>
                <div className="space-y-2">
                  {detail.orders.map((o: any) => (
                    <details key={o.id} className="border border-gray-100 rounded-lg group">
                      <summary className="px-3 py-2 cursor-pointer hover:bg-gray-50 flex flex-wrap items-center justify-between gap-2 text-sm">
                        <span className="font-mono font-medium">{o.order_number}</span>
                        <span className="text-gray-500">{fmtDateTime(o.created_at)}</span>
                        <span>{METHOD_LABELS[o.payment_method] || o.payment_method || '—'}</span>
                        <span className="font-semibold">{fmtGhs(o.subtotal)}</span>
                        {o.refund_amount > 0 && (
                          <span className="text-red-600 text-xs">−{fmtGhs(o.refund_amount)} refunded</span>
                        )}
                      </summary>
                      <ul className="px-3 pb-3 text-sm text-gray-600 border-t border-gray-50 pt-2 space-y-0.5">
                        {o.items.map((i: any, idx: number) => (
                          <li key={idx}>
                            {i.product_name} × {i.quantity}
                            {i.refunded_qty > 0 && <span className="text-red-600"> (−{i.refunded_qty} refunded)</span>}
                            {' — '}{fmtGhs(i.total)}
                          </li>
                        ))}
                      </ul>
                    </details>
                  ))}
                </div>
              </section>
            )}

            <div className="flex gap-2 pt-2 print:hidden">
              <button type="button" className="btn-secondary flex-1 inline-flex items-center justify-center gap-2" onClick={printDetail}>
                <Printer className="w-4 h-4" /> Print
              </button>
              <button type="button" className="btn-primary flex-1" onClick={() => setDetail(null)}>Close</button>
            </div>
          </div>
        ) : null}
      </Modal>
    </AppLayout>
  );
}
