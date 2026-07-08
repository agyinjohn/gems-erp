'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Modal, Badge, EmptyState, Spinner, toast, ConfirmDialog } from '@/components/ui';
import { Plus, Search, Eye, Edit2, X, FileText, ShoppingCart } from 'lucide-react';
import api from '@/lib/api';
import InvoiceModal from '@/components/InvoiceModal';
import ResponsiveTable from '@/components/ui/ResponsiveTable';

const CedisIcon = ({ className }: { className?: string }) => (
  <span className={`font-bold leading-none flex items-center justify-center ${className}`} style={{ fontFamily: 'serif' }}>₵</span>
);

const SOURCE_OPTIONS = [
  { value: '', label: 'All sources' },
  { value: 'storefront', label: 'Storefront' },
  { value: 'internal', label: 'Internal' },
  { value: 'pos', label: 'POS' },
];

const STATUS_OPTIONS = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

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
  const [payModal, setPayModal] = useState<any>(null);
  const [payMethod, setPayMethod] = useState('cash');
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
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

  const clearFilters = () => {
    setSearch('');
    setFilterStatus('');
    setFilterSource('');
    setDateFrom('');
    setDateTo('');
  };
  const hasFilters = search || filterStatus || filterSource || dateFrom || dateTo;

  const openNewOrder = () => {
    setForm({
      customer_name: '', customer_email: '', customer_phone: '', delivery_address: '',
      payment_status: 'paid', payment_method: 'cash', items: [{ product_id: '', quantity: 1 }],
    });
    setError('');
    setModal('add');
  };

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
    try {
      await api.patch(`/orders/${selected.id}/status`, { status: newStatus });
      toast.success('Status updated');
      setModal(null);
      setStatusConfirmOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Error');
    } finally {
      setSaving(false);
    }
  };

  const markOrderPaid = async () => {
    if (!payModal) return;
    setSaving(true);
    try {
      await api.patch(`/orders/${payModal.id}/pay`, { payment_method: payMethod });
      toast.success('Order marked as paid');
      setPayModal(null);
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const sourceLabel: Record<string,string> = { storefront: 'Storefront', internal: 'Internal', pos: 'POS' };
  const sourceBadgeColor: Record<string,string> = {
    storefront: 'bg-[#0D3B6E]/8 text-[#0D3B6E]',
    internal:   'bg-[#0D3B6E]/8 text-[#0D3B6E]',
    pos:        'bg-[#0D3B6E]/8 text-[#0D3B6E]',
  };

  return (
    <AppLayout title="Sales & Orders" subtitle="Manage customer orders and track payments" allowedRoles={['business_owner','branch_manager','sales_staff']}>

      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="form-input pl-9 w-full"
            placeholder="Search order # or customer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="form-input w-32 shrink-0"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          title="Filter by status"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        <select
          className="form-input w-32 shrink-0"
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value)}
          title="Filter by source"
          aria-label="Filter by source"
        >
          {SOURCE_OPTIONS.map((s) => (
            <option key={s.value || 'all'} value={s.value}>{s.label}</option>
          ))}
        </select>
        <input
          type="date"
          className="form-input w-36 shrink-0"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          title="From date"
          aria-label="From date"
        />
        <input
          type="date"
          className="form-input w-36 shrink-0"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          title="To date"
          aria-label="To date"
        />
        {hasFilters && (
          <button type="button" className="btn-secondary shrink-0 p-2" onClick={clearFilters} title="Clear filters" aria-label="Clear filters">
            <X className="w-4 h-4" />
          </button>
        )}
        <button type="button" className="btn-primary shrink-0 p-2" onClick={openNewOrder} title="New Order" aria-label="New Order">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? <Spinner /> : filtered.length === 0 ? (
          <EmptyState
            message={orders.length === 0 ? 'No orders yet' : 'No orders match your filters'}
            icon={<ShoppingCart className="w-8 h-8 text-gray-300" />}
          />
        ) : (
          <>
            <ResponsiveTable
              headers={['Order #', 'Customer', 'Source', 'Total', 'Payment', 'Method', 'Status', 'Date', '']}
              data={filtered}
              renderRow={(o) => ([
                <span className="font-mono text-xs font-medium text-[#0D3B6E]">{o.order_number}</span>,
                <div>
                  <div className="font-medium text-gray-900">{o.customer_name}</div>
                  <div className="text-xs text-gray-400">{o.customer_email || '—'}</div>
                </div>,
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sourceBadgeColor[o.source] || 'bg-gray-100 text-gray-500'}`}>
                  {sourceLabel[o.source] || o.source || '—'}
                </span>,
                <span className="font-semibold">GH₵ {parseFloat(o.total).toFixed(2)}</span>,
                <Badge status={o.payment_status} />,
                <span className="text-xs text-gray-600 capitalize">{o.payment_method ? o.payment_method.replace(/_/g, ' ') : '—'}</span>,
                <Badge status={o.status} />,
                <span className="text-gray-500 text-xs whitespace-nowrap">{new Date(o.created_at || o.createdAt).toLocaleDateString('en-GH', { day: '2-digit', month: 'short', year: 'numeric' })}</span>,
                <div className="flex gap-1">
                  <button type="button" onClick={() => openInvoice(o)} className="p-1.5 hover:bg-[#0D3B6E]/8 rounded text-[#0D3B6E]" title="View invoice">
                    <FileText className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => openView(o)} className="p-1.5 hover:bg-[#0D3B6E]/8 rounded text-[#0D3B6E]" title="View order">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => openStatus(o)} className="p-1.5 hover:bg-[#0D3B6E]/8 rounded text-[#0D3B6E]" title="Update status">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {o.payment_status === 'pending' && o.source === 'internal' && (
                    <button
                      type="button"
                      title="Mark as paid"
                      onClick={() => { setPayModal(o); setPayMethod('cash'); }}
                      className="p-1.5 hover:bg-[#0D3B6E]/8 rounded text-[#0D3B6E]"
                    >
                      <CedisIcon className="w-4 h-4 text-sm" />
                    </button>
                  )}
                </div>
              ])}
            />
            <div className="px-3 sm:px-4 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
              {filtered.length} order{filtered.length !== 1 ? 's' : ''} · Total: <strong className="text-gray-800">GH₵ {filtered.reduce((s, o) => s + parseFloat(o.total || 0), 0).toFixed(2)}</strong>
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
            <p className="text-xs text-[#0D3B6E] mt-2 bg-[#0D3B6E]/8 border border-[#0D3B6E]/15 rounded-lg px-3 py-2">⏳ Order will appear in Accounts Receivable until payment is collected.</p>
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
                  {products.map((p:any) => <option key={p.id} value={p.id}>{p.name} — GH₵ {p.price} (stock: {p.stock_qty})</option>)}
                </select>
                <input type="number" className="form-input w-20" min={1} value={item.quantity} onChange={e => updateItem(i,'quantity',parseInt(e.target.value))} />
                {form.items.length > 1 && <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 px-1">✕</button>}
              </div>
            ))}
          </div>
          <div className="mt-4 text-right font-semibold text-gray-900">Total: GH₵ {getTotal().toFixed(2)}</div>
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
                  <tr key={item._id || item.product_id} className="border-t"><td className="px-3 py-2">{item.product_name}</td><td className="px-3 py-2 text-right">{item.quantity}</td><td className="px-3 py-2 text-right">GH₵ {parseFloat(item.unit_price).toFixed(2)}</td><td className="px-3 py-2 text-right font-semibold">GH₵ {parseFloat(item.total).toFixed(2)}</td></tr>
                ))}</tbody>
              </table>
              <div className="text-right font-bold text-gray-900 mt-3 text-lg">Total: GH₵ {parseFloat(selected.total).toFixed(2)}</div>
            </div>
          </div>
        )}
      </Modal>

      {/* Update Status Modal */}
      <Modal open={modal === 'status'} onClose={() => setModal(null)} title="Update Order Status" size="sm">
        <div><label className="form-label">New Status</label>
          <select className="form-input" value={newStatus} onChange={e => setNewStatus(e.target.value)}>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn-primary" onClick={() => setStatusConfirmOpen(true)} disabled={saving || newStatus === selected?.status}>
            {saving ? 'Saving…' : 'Update Status'}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={statusConfirmOpen}
        onClose={() => setStatusConfirmOpen(false)}
        onConfirm={updateStatus}
        title="Update order status?"
        message={`Change ${selected?.order_number} from "${selected?.status}" to "${newStatus}"?`}
      />

      <Modal open={!!payModal} onClose={() => setPayModal(null)} title="Mark Order as Paid" size="sm">
        {payModal && (
          <>
            <p className="text-sm text-gray-600 mb-4">
              Record payment for <strong>{payModal.order_number}</strong> — GH₵ {parseFloat(payModal.total).toFixed(2)}
            </p>
            <div>
              <label className="form-label">Payment Method</label>
              <select className="form-input" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                <option value="cash">Cash</option>
                <option value="mobile_money">Mobile Money</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="card">Card</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button type="button" className="btn-secondary" onClick={() => setPayModal(null)}>Cancel</button>
              <button type="button" className="btn-primary" onClick={markOrderPaid} disabled={saving}>
                {saving ? 'Saving…' : 'Confirm payment'}
              </button>
            </div>
          </>
        )}
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
