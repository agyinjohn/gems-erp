'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Modal, Badge, EmptyState, Spinner, toast } from '@/components/ui';
import { Plus, Search, Eye, Edit2, Calendar, X, FileText, DollarSign } from 'lucide-react';
import api from '@/lib/api';
import InvoiceModal from '@/components/InvoiceModal';
import ResponsiveTable from '@/components/ui/ResponsiveTable';

const SOURCES = [
  { key: '',            label: 'All Orders' },
  { key: 'storefront',  label: 'Storefront' },
  { key: 'internal',    label: 'Internal' },
  { key: 'pos',         label: 'POS' },
];

export default function OrdersPage() {
  const [orders, setOrders]         = useState<any[]>([]);
  const [products, setProducts]     = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [dateFrom, setDateFrom]     = useState('');
  const [dateTo, setDateTo]         = useState('');
  const [modal, setModal]           = useState<'add'|'view'|'status'|'invoice'|null>(null);
  const [selected, setSelected]     = useState<any>(null);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');
  const [newStatus, setNewStatus]   = useState('');
  const [invoiceData, setInvoiceData] = useState<{ order: any; business: any } | null>(null);
  const [form, setForm]             = useState({ customer_name:'', customer_email:'', customer_phone:'', delivery_address:'', payment_status:'paid', payment_method:'cash', items:[{ product_id:'', quantity:1 }] });

  const load = async () => {
    setLoading(true);
    const [o, p] = await Promise.all([api.get('/orders'), api.get('/products?is_active=true')]);
    setOrders(o.data.data); setProducts(p.data.data); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = orders.filter(o => {
    const matchSearch  = !search || o.order_number.toLowerCase().includes(search.toLowerCase()) || o.customer_name.toLowerCase().includes(search.toLowerCase());
    const matchStatus  = !filterStatus || o.status === filterStatus;
    const matchSource  = !filterSource || o.source === filterSource;
    const orderDate    = new Date(o.created_at || o.createdAt);
    const matchFrom    = !dateFrom || orderDate >= new Date(dateFrom);
    const matchTo      = !dateTo   || orderDate <= new Date(dateTo + 'T23:59:59');
    return matchSearch && matchStatus && matchSource && matchFrom && matchTo;
  });

  // Summary counts per source
  const counts = {
    '':           orders.length,
    storefront:   orders.filter(o => o.source === 'storefront').length,
    internal:     orders.filter(o => o.source === 'internal').length,
    pos:          orders.filter(o => o.source === 'pos').length,
  } as Record<string, number>;

  const clearFilters = () => { setSearch(''); setFilterStatus(''); setDateFrom(''); setDateTo(''); };
  const hasFilters = search || filterStatus || dateFrom || dateTo;

  const openInvoice = async (o: any) => {
    try {
      const r = await api.get(`/orders/${o._id || o.id}/invoice`);
      setInvoiceData(r.data.data);
      setModal('invoice');
    } catch { toast.error('Could not load invoice'); }
  };

  const openView = async (o: any) => {
    try {
      const r = await api.get(`/orders/${o._id || o.id}`);
      setSelected(r.data.data); setModal('view');
    } catch { toast.error('Could not load order details'); }
  };

  const openStatus = (o: any) => { setSelected(o); setNewStatus(o.status); setModal('status'); };

  const addItem    = () => setForm({ ...form, items: [...form.items, { product_id:'', quantity:1 }] });
  const removeItem = (i: number) => setForm({ ...form, items: form.items.filter((_,idx) => idx !== i) });
  const updateItem = (i: number, key: string, val: any) => {
    const items = [...form.items]; items[i] = { ...items[i], [key]: val }; setForm({ ...form, items });
  };
  const getTotal = () => form.items.reduce((sum, item) => {
    const p = products.find((pr:any) => pr.id == item.product_id);
    return sum + (p ? p.price * item.quantity : 0);
  }, 0);

  const createOrder = async () => {
    setSaving(true); setError('');
    try {
      await api.post('/orders', { ...form, items: form.items.filter(i => i.product_id) });
      toast.success('Order created'); setModal(null); load();
    } catch(e:any) { toast.error(e.response?.data?.message || 'Error creating order'); }
    finally { setSaving(false); }
  };

  const updateStatus = async () => {
    setSaving(true);
    try { await api.patch(`/orders/${selected.id}/status`, { status: newStatus }); toast.success('Status updated'); setModal(null); load(); }
    catch(e:any) { toast.error(e.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const sourceLabel: Record<string,string> = { storefront: 'Storefront', internal: 'Internal', pos: 'POS' };
  const sourceBadgeColor: Record<string,string> = {
    storefront: 'bg-blue-50 text-blue-700',
    internal:   'bg-purple-50 text-purple-700',
    pos:        'bg-green-50 text-green-700',
  };

  return (
    <AppLayout title="Sales & Orders" subtitle="Manage customer orders and track payments" allowedRoles={['business_owner','branch_manager','sales_staff']}>

      {/* ── Source Tabs ── */}
      <div className="flex gap-0 border-b border-gray-200 mb-5 -mt-1 overflow-x-auto">
        {SOURCES.map(s => (
          <button
            key={s.key}
            onClick={() => setFilterSource(s.key)}
            className={`flex items-center gap-2 px-3 sm:px-5 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
              filterSource === s.key
                ? 'border-[#0D3B6E] text-[#0D3B6E]'
                : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
            }`}
          >
            {s.label}
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
              filterSource === s.key ? 'bg-[#0D3B6E] text-white' : 'bg-gray-100 text-gray-500'
            }`}>
              {counts[s.key] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col gap-3 mb-5">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="form-input pl-9" placeholder="Search order # or customer…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {/* Status */}
          <select className="form-input w-full sm:w-auto" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            {['pending','processing','shipped','delivered','cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* Date From */}
          <div className="relative flex-1 sm:flex-initial">
            <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="date" className="form-input pl-9 w-full sm:w-40"
              value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            />
          </div>

          {/* Date To */}
          <div className="relative flex-1 sm:flex-initial">
            <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="date" className="form-input pl-9 w-full sm:w-40"
              value={dateTo} onChange={e => setDateTo(e.target.value)}
            />
          </div>

          {/* Clear filters */}
          {hasFilters && (
            <button onClick={clearFilters} className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg border border-red-200 transition-colors w-full sm:w-auto">
              <X className="w-4 h-4" /> Clear
            </button>
          )}
        </div>

        <button className="btn-primary w-full sm:w-auto" onClick={() => { setForm({ customer_name:'',customer_email:'',customer_phone:'',delivery_address:'',payment_status:'paid',payment_method:'cash',items:[{product_id:'',quantity:1}] }); setError(''); setModal('add'); }}>
          <Plus className="w-4 h-4" />New Order
        </button>
      </div>

      {/* ── Results summary ── */}
      {!loading && (
        <p className="text-xs text-gray-400 mb-3">
          Showing <strong className="text-gray-600">{filtered.length}</strong> of {orders.length} orders
          {filterSource && <span> · <strong>{sourceLabel[filterSource]}</strong></span>}
          {dateFrom && <span> · From <strong>{dateFrom}</strong></span>}
          {dateTo   && <span> · To <strong>{dateTo}</strong></span>}
        </p>
      )}

      {/* ── Table ── */}
      <div className="card p-0 overflow-hidden">
        {loading ? <Spinner /> : filtered.length === 0 ? <EmptyState message="No orders found" icon="🛒" /> : (
          <>
            <ResponsiveTable
              headers={['Order #','Customer','Source','Total','Payment','Status','Date','Actions']}
              data={filtered}
              renderRow={(o) => ([
                <span className="font-mono text-xs font-medium text-blue-700">{o.order_number}</span>,
                <div>
                  <div className="font-medium text-gray-900">{o.customer_name}</div>
                  <div className="text-xs text-gray-400">{o.customer_email}</div>
                </div>,
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sourceBadgeColor[o.source] || 'bg-gray-100 text-gray-500'}`}>
                  {sourceLabel[o.source] || o.source || '—'}
                </span>,
                <span className="font-semibold">GHS {parseFloat(o.total).toFixed(2)}</span>,
                <Badge status={o.payment_status} />,
                <Badge status={o.status} />,
                <span className="text-gray-500 text-xs whitespace-nowrap">{new Date(o.created_at || o.createdAt).toLocaleDateString('en-GH', { day:'2-digit', month:'short', year:'numeric' })}</span>,
                <div className="flex gap-2">
                  <button onClick={() => openInvoice(o)} className="p-1.5 hover:bg-green-50 rounded text-green-600" title="View Invoice"><FileText className="w-4 h-4" /></button>
                  <button onClick={() => openView(o)} className="p-1.5 hover:bg-blue-50 rounded text-blue-600"><Eye className="w-4 h-4" /></button>
                  <button onClick={() => openStatus(o)} className="p-1.5 hover:bg-gray-100 rounded text-gray-600"><Edit2 className="w-4 h-4" /></button>
                  {o.payment_status === 'pending' && o.source === 'internal' && (
                    <button
                      title="Mark as Paid"
                      onClick={async () => {
                        const method = prompt('Payment method? (cash / mobile_money / bank_transfer / card)', 'cash');
                        if (!method) return;
                        try {
                          await api.patch(`/orders/${o.id}/pay`, { payment_method: method });
                          toast.success('Order marked as paid');
                          load();
                        } catch(e:any) { toast.error(e.response?.data?.message || 'Failed'); }
                      }}
                      className="p-1.5 hover:bg-yellow-50 rounded text-yellow-600"
                    ><DollarSign className="w-4 h-4" /></button>
                  )}
                </div>
              ])}
            />
            <div className="px-3 sm:px-4 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-400">
              {filtered.length} order{filtered.length !== 1 ? 's' : ''} · Total: <strong className="text-gray-700">GHS {filtered.reduce((s,o) => s + parseFloat(o.total||0), 0).toFixed(2)}</strong>
            </div>
          </>
        )}
      </div>

      {/* New Order Modal */}
      <Modal open={modal === 'add'} onClose={() => setModal(null)} title="Create Internal Order" size="lg">
        {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm mb-4">{error}</div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div className="sm:col-span-2"><label className="form-label">Customer Name *</label><input className="form-input" value={form.customer_name} onChange={e => setForm({...form,customer_name:e.target.value})} /></div>
          <div><label className="form-label">Email</label><input className="form-input" type="email" value={form.customer_email} onChange={e => setForm({...form,customer_email:e.target.value})} /></div>
          <div><label className="form-label">Phone</label><input className="form-input" value={form.customer_phone} onChange={e => setForm({...form,customer_phone:e.target.value})} /></div>
          <div className="sm:col-span-2"><label className="form-label">Delivery Address</label><input className="form-input" value={form.delivery_address} onChange={e => setForm({...form,delivery_address:e.target.value})} /></div>
        </div>

        {/* Payment section */}
        <div className="border border-gray-100 rounded-xl p-4 mb-4 bg-gray-50">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Payment</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="form-label">Payment Status *</label>
              <select className="form-input" value={form.payment_status} onChange={e => setForm({...form, payment_status: e.target.value})}>
                <option value="paid">Paid — collected now</option>
                <option value="pending">Pending — pay later (credit)</option>
              </select>
            </div>
            {form.payment_status === 'paid' && (
              <div>
                <label className="form-label">Payment Method *</label>
                <select className="form-input" value={form.payment_method} onChange={e => setForm({...form, payment_method: e.target.value})}>
                  <option value="cash">Cash</option>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="card">Card</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
            )}
          </div>
          {form.payment_status === 'pending' && (
            <p className="text-xs text-yellow-600 mt-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">⏳ Order will appear in Accounts Receivable until payment is collected.</p>
          )}
        </div>
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-800">Order Items</h4>
            <button className="btn-secondary py-1 text-xs" onClick={addItem}><Plus className="w-3 h-3" />Add Item</button>
          </div>
          <div className="space-y-2">
            {form.items.map((item, i) => (
              <div key={i} className="flex gap-2 items-center">
                <select className="form-input flex-1" value={item.product_id} onChange={e => updateItem(i,'product_id',e.target.value)}>
                  <option value="">Select product</option>
                  {products.map((p:any) => <option key={p.id} value={p.id}>{p.name} — GHS {p.price} (stock: {p.stock_qty})</option>)}
                </select>
                <input type="number" className="form-input w-20" min={1} value={item.quantity} onChange={e => updateItem(i,'quantity',parseInt(e.target.value))} />
                {form.items.length > 1 && <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 px-1">✕</button>}
              </div>
            ))}
          </div>
          <div className="mt-4 text-right font-semibold text-gray-900">Total: GHS {getTotal().toFixed(2)}</div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn-primary" onClick={createOrder} disabled={saving}>{saving ? 'Creating…' : 'Create Order'}</button>
        </div>
      </Modal>

      {/* View Order Modal */}
      <Modal open={modal === 'view'} onClose={() => setModal(null)} title={`Order — ${selected?.order_number}`} size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Customer:</span> <strong>{selected.customer_name}</strong></div>
              <div><span className="text-gray-500">Email:</span> {selected.customer_email || '—'}</div>
              <div><span className="text-gray-500">Phone:</span> {selected.customer_phone || '—'}</div>
              <div><span className="text-gray-500">Source:</span> <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sourceBadgeColor[selected.source] || 'bg-gray-100 text-gray-500'}`}>{sourceLabel[selected.source] || selected.source}</span></div>
              <div><span className="text-gray-500">Payment:</span> <Badge status={selected.payment_status} /></div>
              <div><span className="text-gray-500">Status:</span> <Badge status={selected.status} /></div>
              <div><span className="text-gray-500">Date:</span> {new Date(selected.created_at || selected.createdAt).toLocaleString()}</div>
              {selected.delivery_address && <div className="sm:col-span-2"><span className="text-gray-500">Address:</span> {selected.delivery_address}</div>}
            </div>
            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-800 mb-3">Items</h4>
              <table className="w-full text-sm">
                <thead className="table-header"><tr><th className="px-3 py-2 text-left">Product</th><th className="px-3 py-2 text-right">Qty</th><th className="px-3 py-2 text-right">Price</th><th className="px-3 py-2 text-right">Total</th></tr></thead>
                <tbody>{selected.items?.map((item:any) => (
                  <tr key={item._id || item.product_id} className="border-t"><td className="px-3 py-2">{item.product_name}</td><td className="px-3 py-2 text-right">{item.quantity}</td><td className="px-3 py-2 text-right">GHS {parseFloat(item.unit_price).toFixed(2)}</td><td className="px-3 py-2 text-right font-semibold">GHS {parseFloat(item.total).toFixed(2)}</td></tr>
                ))}</tbody>
              </table>
              <div className="text-right font-bold text-gray-900 mt-3 text-lg">Total: GHS {parseFloat(selected.total).toFixed(2)}</div>
            </div>
          </div>
        )}
      </Modal>

      {/* Update Status Modal */}
      <Modal open={modal === 'status'} onClose={() => setModal(null)} title="Update Order Status" size="sm">
        <div><label className="form-label">New Status</label>
          <select className="form-input" value={newStatus} onChange={e => setNewStatus(e.target.value)}>
            {['pending','processing','shipped','delivered','cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn-primary" onClick={updateStatus} disabled={saving}>{saving ? 'Saving…':'Update Status'}</button>
        </div>
      </Modal>
      <InvoiceModal
        open={modal === 'invoice'}
        onClose={() => { setModal(null); setInvoiceData(null); }}
        order={invoiceData?.order}
        business={invoiceData?.business}
      />
    </AppLayout>
  );
}
