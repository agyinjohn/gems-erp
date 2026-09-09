'use client';
import { useCallback, useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Spinner, EmptyState } from '@/components/ui';
import api from '@/lib/api';
import {
  Search, X, Download, TrendingUp, TrendingDown,
  Package, RefreshCw, Filter,
} from 'lucide-react';

const TYPE_LABEL: Record<string, string> = {
  sale: 'Sale', purchase: 'Stock In', adjustment: 'Adjustment', return: 'Return',
};
const SOURCE_LABEL: Record<string, string> = {
  pos: 'POS', storefront: 'Storefront', internal: 'Internal Order',
  service_request: 'Service', manual: 'Manual', purchase: 'Purchase Order',
};
const TYPE_COLOR: Record<string, string> = {
  sale:       'bg-red-100 text-red-700',
  purchase:   'bg-green-100 text-green-700',
  adjustment: 'bg-blue-100 text-blue-700',
  return:     'bg-purple-100 text-purple-700',
};
const SOURCE_COLOR: Record<string, string> = {
  pos:             'bg-amber-100 text-amber-700',
  storefront:      'bg-sky-100 text-sky-700',
  internal:        'bg-indigo-100 text-indigo-700',
  service_request: 'bg-teal-100 text-teal-700',
  manual:          'bg-gray-100 text-gray-600',
  purchase:        'bg-green-100 text-green-700',
};

function fmt(n: number) {
  return `GH₵ ${Number(n || 0).toFixed(2)}`;
}

function Badge({ label, color }: { label: string; color: string }) {
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>{label}</span>;
}

export default function StockLedgerPage() {
  const [movements, setMovements] = useState<any[]>([]);
  const [products, setProducts]   = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  // filters
  const [search, setSearch]       = useState('');
  const [filterType, setFilterType]     = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterProduct, setFilterProduct] = useState('');
  const [dateFrom, setDateFrom]   = useState('');
  const [dateTo, setDateTo]       = useState('');

  const hasFilters = search || filterType || filterSource || filterProduct || dateFrom || dateTo;

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const params: any = { limit: 500 };
      if (filterType)    params.type   = filterType;
      if (filterSource)  params.source = filterSource;
      if (dateFrom)      params.from   = dateFrom;
      if (dateTo)        params.to     = dateTo;
      if (search)        params.search = search;

      const [movRes, prodRes] = await Promise.all([
        api.get('/stock-movements', { params }),
        api.get('/products?is_active=true'),
      ]);
      setMovements(movRes.data.data || []);
      setProducts(prodRes.data.data || []);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load stock ledger.');
    } finally {
      setLoading(false);
    }
  }, [filterType, filterSource, dateFrom, dateTo, search]);

  useEffect(() => { load(); }, [load]);

  // client-side product filter (fast, no extra request)
  const filtered = filterProduct
    ? movements.filter(m => (m.product_id?._id || m.product_id?.id) === filterProduct)
    : movements;

  // summary stats
  const totalIn  = filtered.filter(m => m.quantity > 0).reduce((s, m) => s + m.quantity, 0);
  const totalOut = filtered.filter(m => m.quantity < 0).reduce((s, m) => s + Math.abs(m.quantity), 0);

  const exportCsv = () => {
    const rows = [
      ['Date', 'Time', 'Product', 'SKU', 'Type', 'Source', 'Qty', 'Reference', 'Order #', 'Customer', 'Shift', 'Batch', 'Supplier', 'Cost Price', 'Expiry', 'By', 'Notes'],
      ...filtered.map(m => {
        const d = new Date(m.createdAt);
        return [
          d.toLocaleDateString('en-GH'),
          d.toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit' }),
          m.product_id?.name || '',
          m.product_id?.sku || '',
          TYPE_LABEL[m.type] || m.type,
          SOURCE_LABEL[m.source] || m.source || '',
          m.quantity,
          m.reference || '',
          m.order_id?.order_number || '',
          m.order_id?.customer_name || '',
          m.shift_id?.shift_number || '',
          m.batch_number || '',
          m.supplier_name || '',
          m.cost_price != null ? m.cost_price : '',
          m.expiry_date ? new Date(m.expiry_date).toLocaleDateString('en-GH') : '',
          m.created_by?.name || '',
          m.notes || '',
        ];
      }),
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `stock-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <AppLayout
      title="Stock Ledger"
      subtitle="Every stock movement — in, out, adjusted — with full context"
      allowedRoles={['business_owner', 'branch_manager', 'warehouse_staff', 'accountant']}
    >
      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="form-input pl-9 w-full"
            placeholder="Search product, batch, supplier, reference…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select className="form-input w-36 shrink-0" value={filterProduct} onChange={e => setFilterProduct(e.target.value)}>
          <option value="">All products</option>
          {products.filter(p => p.item_type === 'product').map((p: any) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <select className="form-input w-32 shrink-0" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">All types</option>
          <option value="purchase">Stock In</option>
          <option value="sale">Sale</option>
          <option value="adjustment">Adjustment</option>
          <option value="return">Return</option>
        </select>

        <select className="form-input w-36 shrink-0" value={filterSource} onChange={e => setFilterSource(e.target.value)}>
          <option value="">All sources</option>
          <option value="pos">POS</option>
          <option value="storefront">Storefront</option>
          <option value="internal">Internal Order</option>
          <option value="manual">Manual</option>
          <option value="purchase">Purchase Order</option>
        </select>

        <input type="date" className="form-input w-36 shrink-0" value={dateFrom} onChange={e => setDateFrom(e.target.value)} title="From date" />
        <input type="date" className="form-input w-36 shrink-0" value={dateTo}   onChange={e => setDateTo(e.target.value)}   title="To date" />

        {hasFilters && (
          <button type="button" className="btn-secondary p-2 shrink-0" onClick={() => { setSearch(''); setFilterType(''); setFilterSource(''); setFilterProduct(''); setDateFrom(''); setDateTo(''); }} title="Clear filters">
            <X className="w-4 h-4" />
          </button>
        )}
        <button type="button" className="btn-secondary p-2 shrink-0" onClick={() => load()} title="Refresh">
          <RefreshCw className="w-4 h-4" />
        </button>
        <button type="button" className="btn-secondary p-2 shrink-0" onClick={exportCsv} title="Export CSV" disabled={!filtered.length}>
          <Download className="w-4 h-4" />
        </button>
      </div>

      {/* Summary tiles */}
      {!loading && !error && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="card flex items-center gap-3 py-3">
            <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total In</p>
              <p className="text-lg font-extrabold text-green-700">+{totalIn.toLocaleString()}</p>
            </div>
          </div>
          <div className="card flex items-center gap-3 py-3">
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
              <TrendingDown className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Out</p>
              <p className="text-lg font-extrabold text-red-600">-{totalOut.toLocaleString()}</p>
            </div>
          </div>
          <div className="card flex items-center gap-3 py-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <Filter className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Movements</p>
              <p className="text-lg font-extrabold text-gray-900">{filtered.length.toLocaleString()}</p>
            </div>
          </div>
          <div className="card flex items-center gap-3 py-3">
            <div className="w-9 h-9 rounded-xl bg-[#0D3B6E]/10 flex items-center justify-center shrink-0">
              <Package className="w-4 h-4 text-[#0D3B6E]" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Net Change</p>
              <p className={`text-lg font-extrabold ${(totalIn - totalOut) >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                {totalIn - totalOut >= 0 ? '+' : ''}{(totalIn - totalOut).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="py-16"><Spinner /></div>
        ) : error ? (
          <div className="py-12 text-center text-red-600 text-sm">{error}</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            message="No movements found"
            description={hasFilters ? 'Try adjusting your filters.' : 'Stock movements will appear here as items are received and sold.'}
            icon={<Package className="w-8 h-8 text-gray-300" />}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Date & Time', 'Product', 'Type', 'Source', 'Qty', 'Reference', 'Order / Customer', 'Shift', 'Batch / Supplier', 'Cost', 'Expiry', 'By', 'Notes'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((m: any) => {
                    const d = new Date(m.createdAt);
                    const isIn = m.quantity > 0;
                    return (
                      <tr key={m._id || m.id} className="hover:bg-gray-50/50 transition-colors">
                        {/* Date & Time */}
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <div className="text-xs font-medium text-gray-800">{d.toLocaleDateString('en-GH', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                          <div className="text-xs text-gray-400">{d.toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit' })}</div>
                        </td>

                        {/* Product */}
                        <td className="px-3 py-2.5 max-w-[160px]">
                          <div className="font-medium text-gray-900 truncate">{m.product_id?.name || '—'}</div>
                          {m.product_id?.sku && <div className="text-xs text-gray-400 font-mono">{m.product_id.sku}</div>}
                        </td>

                        {/* Type */}
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <Badge label={TYPE_LABEL[m.type] || m.type} color={TYPE_COLOR[m.type] || 'bg-gray-100 text-gray-600'} />
                        </td>

                        {/* Source */}
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          {m.source ? <Badge label={SOURCE_LABEL[m.source] || m.source} color={SOURCE_COLOR[m.source] || 'bg-gray-100 text-gray-600'} /> : <span className="text-gray-300">—</span>}
                        </td>

                        {/* Qty */}
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className={`font-bold tabular-nums ${isIn ? 'text-green-700' : 'text-red-600'}`}>
                            {isIn ? '+' : ''}{m.quantity}
                          </span>
                          {m.product_id?.unit && <span className="text-xs text-gray-400 ml-1">{m.product_id.unit}</span>}
                        </td>

                        {/* Reference */}
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className="font-mono text-xs text-[#0D3B6E]">{m.reference || '—'}</span>
                        </td>

                        {/* Order / Customer */}
                        <td className="px-3 py-2.5 max-w-[140px]">
                          {m.order_id ? (
                            <>
                              <div className="font-mono text-xs text-[#0D3B6E]">{m.order_id.order_number}</div>
                              <div className="text-xs text-gray-400 truncate">{m.order_id.customer_name}</div>
                            </>
                          ) : <span className="text-gray-300">—</span>}
                        </td>

                        {/* Shift */}
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          {m.shift_id ? (
                            <div>
                              <div className="text-xs font-medium text-gray-700">{m.shift_id.shift_number}</div>
                              <div className="text-xs text-gray-400">{new Date(m.shift_id.opened_at).toLocaleDateString('en-GH', { day: '2-digit', month: 'short' })}</div>
                            </div>
                          ) : <span className="text-gray-300">—</span>}
                        </td>

                        {/* Batch / Supplier */}
                        <td className="px-3 py-2.5 max-w-[140px]">
                          {m.batch_number || m.supplier_name ? (
                            <>
                              {m.batch_number  && <div className="text-xs font-medium text-gray-700">Batch: {m.batch_number}</div>}
                              {m.supplier_name && <div className="text-xs text-gray-400 truncate">{m.supplier_name}</div>}
                            </>
                          ) : <span className="text-gray-300">—</span>}
                        </td>

                        {/* Cost */}
                        <td className="px-3 py-2.5 whitespace-nowrap text-xs text-gray-600">
                          {m.cost_price != null ? fmt(m.cost_price) : <span className="text-gray-300">—</span>}
                        </td>

                        {/* Expiry */}
                        <td className="px-3 py-2.5 whitespace-nowrap text-xs">
                          {m.expiry_date ? (
                            <span className={new Date(m.expiry_date) < new Date() ? 'text-red-600 font-semibold' : 'text-gray-600'}>
                              {new Date(m.expiry_date).toLocaleDateString('en-GH', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>

                        {/* By */}
                        <td className="px-3 py-2.5 whitespace-nowrap text-xs text-gray-600">
                          {m.created_by?.name || <span className="text-gray-300">—</span>}
                        </td>

                        {/* Notes */}
                        <td className="px-3 py-2.5 max-w-[160px] text-xs text-gray-500 truncate">
                          {m.notes || <span className="text-gray-300">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
              {filtered.length} movement{filtered.length !== 1 ? 's' : ''}
              {' · '}In: <strong className="text-green-700">+{totalIn.toLocaleString()}</strong>
              {' · '}Out: <strong className="text-red-600">-{totalOut.toLocaleString()}</strong>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
