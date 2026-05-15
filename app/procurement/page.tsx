'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import AppLayout from '@/components/layout/AppLayout';
import { Modal, Badge, EmptyState, Spinner, toast } from '@/components/ui';
import { Plus, Search, Eye, CheckCircle, Truck, ClipboardList, Building2, Edit2, Trash2, Send, CreditCard } from 'lucide-react';
import api from '@/lib/api';
import ResponsiveTable from '@/components/ui/ResponsiveTable';

export default function ProcurementPage() {
  const { user } = useAuth();
  const canApprove = user?.role === 'business_owner' || user?.role === 'accountant';
  const [pos, setPOs] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'pos'|'suppliers'>('pos');
  const [modal, setModal] = useState<'add_po'|'view_po'|'add_supplier'|'receive'|null>(null);
  const [selected, setSelected] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [poForm, setPoForm] = useState({ supplier_id:'', expected_date:'', notes:'', items:[{product_id:'',quantity_ordered:1,unit_cost:''}] });
  const [supForm, setSupForm] = useState({ name:'', email:'', phone:'', address:'', payment_terms:'Net 30', notes:'' });
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [receiveItems, setReceiveItems] = useState<any[]>([]);
  const [poPayModal, setPoPayModal] = useState<any>(null);
  const [poPayForm, setPoPayForm] = useState({ amount:'', method:'bank_transfer', reference:'', note:'' });
  const [poPaySaving, setPoPaySaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [p, s, pr] = await Promise.all([
        api.get('/purchase-orders').catch(() => ({ data: { data: [] } })),
        api.get('/suppliers').catch(() => ({ data: { data: [] } })),
        api.get('/products?is_active=true'),
      ]);
      setPOs(p.data.data); setSuppliers(s.data.data); setProducts(pr.data.data);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const addPoItem = () => setPoForm({ ...poForm, items: [...poForm.items, { product_id:'', quantity_ordered:1, unit_cost:'' }] });
  const updatePoItem = (i: number, k: string, v: any) => {
    const items = [...poForm.items]; items[i] = { ...items[i], [k]: v }; setPoForm({ ...poForm, items });
  };
  const getPoTotal = () => poForm.items.reduce((s, item) => s + (parseFloat(item.unit_cost)||0) * item.quantity_ordered, 0);

  const createPO = async () => {
    setSaving(true); setError('');
    try {
      await api.post('/purchase-orders', { ...poForm, items: poForm.items.filter(i => i.product_id) });
      setModal(null); load();
    } catch(e:any) { setError(e.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const createSupplier = async () => {
    setSaving(true); setError('');
    try {
      if (selectedSupplier) await api.put(`/suppliers/${selectedSupplier.id}`, supForm);
      else await api.post('/suppliers', supForm);
      setModal(null); load();
    }
    catch(e:any) { setError(e.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const deleteSupplier = async (id: string) => {
    if (!confirm('Deactivate this supplier?')) return;
    await api.delete(`/suppliers/${id}`).catch(()=>{});
    toast.success('Supplier deactivated');
    load();
  };

  const openView = async (po: any) => {
    const r = await api.get(`/purchase-orders/${po.id}`).catch(() => ({ data: { data: po } }));
    setSelected(r.data.data); setModal('view_po');
  };

  const openReceive = (po: any) => {
    setSelected(po);
    setReceiveItems((po.items||[]).map((i:any) => ({ ...i, receive_qty: i.quantity_ordered - i.quantity_received })));
    setModal('receive');
  };

  const doReceive = async () => {
    setSaving(true);
    try {
      await api.post(`/purchase-orders/${selected.id}/receive`, { items: receiveItems });
      setModal(null); load();
    } catch(e:any) { toast.error(e.response?.data?.message || 'Something went wrong'); }
    finally { setSaving(false); }
  };

  const approvePO = async (id: number) => {
    await api.patch(`/purchase-orders/${id}/approve`).catch(()=>{});
    toast.success('PO approved');
    load();
  };

  const sendPO = async (id: number) => {
    try {
      await api.patch(`/purchase-orders/${id}/send`);
      toast.success('PO marked as sent to supplier');
      load();
    } catch(e:any) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  const recordPoPayment = async () => {
    if (!poPayModal) return;
    setPoPaySaving(true);
    try {
      const res = await api.patch(`/purchase-orders/${poPayModal.id}/pay`, poPayForm);
      const { paid, outstanding } = res.data;
      toast.success(`GHS ${parseFloat(paid).toFixed(2)} paid${ outstanding > 0 ? ` — GHS ${parseFloat(outstanding).toFixed(2)} still outstanding` : ' — fully cleared' }`);
      setPoPayModal(null);
      setPoPayForm({ amount:'', method:'bank_transfer', reference:'', note:'' });
      load();
    } catch(e:any) { toast.error(e.response?.data?.message || 'Payment failed'); }
    finally { setPoPaySaving(false); }
  };

  const filtered = pos.filter(p =>
    (!search || p.po_number?.toLowerCase().includes(search.toLowerCase())) &&
    (!statusFilter || p.status === statusFilter)
  );

  return (
    <AppLayout title="Procurement" subtitle="Purchase orders, suppliers and goods receipt" allowedRoles={['business_owner','procurement_officer']}>
      {/* Tabs */}
      <div className="flex flex-col sm:flex-row gap-2 mb-5">
        {([{t:'pos',l:'Purchase Orders',icon:<ClipboardList className="w-4 h-4"/>},{t:'suppliers',l:'Suppliers',icon:<Building2 className="w-4 h-4"/>}]).map(({t,l,icon}) => (
          <button key={t} onClick={() => setTab(t as any)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 w-full sm:w-auto ${tab===t ? 'bg-blue-700 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}>{icon}{l}</button>
        ))}
        <div className="sm:ml-auto flex gap-2 w-full sm:w-auto">
          {tab === 'pos' && <button className="btn-primary w-full sm:w-auto" onClick={() => { setPoForm({ supplier_id:'',expected_date:'',notes:'',items:[{product_id:'',quantity_ordered:1,unit_cost:''}] }); setError(''); setModal('add_po'); }}><Plus className="w-4 h-4" />New PO</button>}
          {tab === 'suppliers' && <button className="btn-primary w-full sm:w-auto" onClick={() => { setSelectedSupplier(null); setSupForm({ name:'',email:'',phone:'',address:'',payment_terms:'Net 30',notes:'' }); setError(''); setModal('add_supplier'); }}><Plus className="w-4 h-4" />Add Supplier</button>}
        </div>
      </div>

      {tab === 'pos' && (
        <>
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="form-input pl-9" placeholder="Search PO number…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="form-input w-48" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              {['draft','pending_approval','approved','sent','partially_received','completed','cancelled'].map(s => (
                <option key={s} value={s}>{s.replace(/_/g,' ')}</option>
              ))}
            </select>
            {(search || statusFilter) && (
              <button className="btn-secondary" onClick={() => { setSearch(''); setStatusFilter(''); }}>Clear</button>
            )}
          </div>
          <div className="card p-0 overflow-hidden">
            {loading ? <Spinner /> : filtered.length === 0
              ? <EmptyState message={search || statusFilter ? 'No POs match your filter' : 'No purchase orders yet'} icon={<ClipboardList className="w-8 h-8 text-gray-300"/>} />
              : (
              <ResponsiveTable
                headers={['PO Number','Supplier','Total Cost','Status','Payment','Expected','Actions']}
                data={filtered}
                renderRow={(po) => [
                  <span className="font-mono text-xs font-medium text-blue-700">{po.po_number}</span>,
                  <span className="font-medium">{po.supplier_name || po.supplier_id?.name || '—'}</span>,
                  <div>
                    <div className="font-semibold">GH₵ {parseFloat(po.total_cost||0).toFixed(2)}</div>
                    {po.amount_paid > 0 && <div className="text-xs text-green-600">Paid: GH₵ {parseFloat(po.amount_paid||0).toFixed(2)}</div>}
                  </div>,
                  <Badge status={po.status} />,
                  <span className={`badge ${
                    po.payment_status === 'paid'    ? 'bg-green-100 text-green-700' :
                    po.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>{po.payment_status || 'unpaid'}</span>,
                  <span className="text-gray-500 text-xs">{po.expected_date ? new Date(po.expected_date).toLocaleDateString() : '—'}</span>,
                  <div className="flex gap-2">
                    <button onClick={() => openView(po)} className="p-1.5 hover:bg-blue-50 rounded text-blue-600"><Eye className="w-4 h-4" /></button>
                    {po.status === 'draft' && canApprove && <button onClick={() => approvePO(po.id)} title="Approve PO" className="p-1.5 hover:bg-green-50 rounded text-green-600"><CheckCircle className="w-4 h-4" /></button>}
                    {po.status === 'approved' && <button onClick={() => sendPO(po.id)} title="Mark as Sent to Supplier" className="p-1.5 hover:bg-purple-50 rounded text-purple-600"><Send className="w-4 h-4" /></button>}
                    {['approved','sent','partially_received'].includes(po.status) && <button onClick={() => openReceive(po)} title="Receive Goods" className="p-1.5 hover:bg-yellow-50 rounded text-yellow-600"><Truck className="w-4 h-4" /></button>}
                    {['sent','partially_received','completed'].includes(po.status) && po.payment_status !== 'paid' && (
                      <button
                        onClick={() => {
                          const outstanding = parseFloat(po.total_cost||0) - parseFloat(po.amount_paid||0);
                          setPoPayModal({ ...po, outstanding });
                          setPoPayForm({ amount: outstanding.toFixed(2), method:'bank_transfer', reference:'', note:'' });
                        }}
                        title="Record Payment"
                        className="p-1.5 hover:bg-green-50 rounded text-green-600"
                      ><CreditCard className="w-4 h-4" /></button>
                    )}
                  </div>
                ]}
              />
            )}
          </div>
        </>
      )}

      {tab === 'suppliers' && (
        <div className="card p-0 overflow-hidden">
          {loading ? <Spinner /> : suppliers.length === 0 ? <EmptyState message="No suppliers yet" icon={<Building2 className="w-8 h-8 text-gray-300"/>} /> : (
            <ResponsiveTable
              headers={['Supplier','Email','Phone','Payment Terms','Status','']}
              data={suppliers}
              renderRow={(s) => [
                <span className="font-medium">{s.name}</span>,
                <span className="text-gray-500">{s.email||'—'}</span>,
                <span className="text-gray-500">{s.phone||'—'}</span>,
                <span className="text-gray-500">{s.payment_terms||'—'}</span>,
                <Badge status={s.is_active ? 'active':'inactive'} />,
                <div className="flex gap-1">
                  <button onClick={() => { setSelectedSupplier(s); setSupForm({ name:s.name, email:s.email||'', phone:s.phone||'', address:s.address||'', payment_terms:s.payment_terms||'Net 30', notes:s.notes||'' }); setError(''); setModal('add_supplier'); }} className="p-1.5 hover:bg-gray-100 rounded text-gray-500"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => deleteSupplier(s.id)} className="p-1.5 hover:bg-red-50 rounded text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              ]}
            />
          )}
        </div>
      )}

      {/* New PO Modal */}
      <Modal open={modal==='add_po'} onClose={() => setModal(null)} title="Create Purchase Order" size="lg">
        {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm mb-4">{error}</div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div><label className="form-label">Supplier *</label>
            <select className="form-input" value={poForm.supplier_id} onChange={e => setPoForm({...poForm,supplier_id:e.target.value})}>
              <option value="">Select supplier</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div><label className="form-label">Expected Delivery</label><input type="date" className="form-input" value={poForm.expected_date} onChange={e => setPoForm({...poForm,expected_date:e.target.value})} /></div>
          <div className="sm:col-span-2"><label className="form-label">Notes</label><textarea className="form-input" rows={2} value={poForm.notes} onChange={e => setPoForm({...poForm,notes:e.target.value})} /></div>
        </div>
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium">Order Items</h4>
            <button className="btn-secondary py-1 text-xs" onClick={addPoItem}><Plus className="w-3 h-3" />Add</button>
          </div>
          <div className="space-y-2">
            {poForm.items.map((item,i) => (
              <div key={i} className="flex gap-2">
                <select className="form-input flex-1" value={item.product_id} onChange={e => updatePoItem(i,'product_id',e.target.value)}>
                  <option value="">Select product</option>
                  {products.map((p:any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <input type="number" className="form-input w-20" placeholder="Qty" min={1} value={item.quantity_ordered} onChange={e => updatePoItem(i,'quantity_ordered',parseInt(e.target.value))} />
                <input type="number" className="form-input w-28" placeholder="Unit Cost" value={item.unit_cost} onChange={e => updatePoItem(i,'unit_cost',e.target.value)} />
                {poForm.items.length>1 && <button onClick={() => setPoForm({...poForm,items:poForm.items.filter((_,idx)=>idx!==i)})} className="text-red-400 px-1">✕</button>}
              </div>
            ))}
          </div>
          <div className="text-right font-semibold mt-3">Total: GH₵ {getPoTotal().toFixed(2)}</div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn-primary" onClick={createPO} disabled={saving}>{saving?'Creating…':'Create PO'}</button>
        </div>
      </Modal>

      {/* Add Supplier Modal */}
      <Modal open={modal==='add_supplier'} onClose={() => setModal(null)} title={selectedSupplier ? 'Edit Supplier' : 'Add Supplier'} size="md">
        {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm mb-4">{error}</div>}
        <div className="space-y-3">
          <div><label className="form-label">Name *</label><input className="form-input" value={supForm.name} onChange={e => setSupForm({...supForm,name:e.target.value})} /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="form-label">Email</label><input className="form-input" type="email" value={supForm.email} onChange={e => setSupForm({...supForm,email:e.target.value})} /></div>
            <div><label className="form-label">Phone</label><input className="form-input" value={supForm.phone} onChange={e => setSupForm({...supForm,phone:e.target.value})} /></div>
          </div>
          <div><label className="form-label">Payment Terms</label><input className="form-input" value={supForm.payment_terms} onChange={e => setSupForm({...supForm,payment_terms:e.target.value})} /></div>
          <div><label className="form-label">Address</label><textarea className="form-input" rows={2} value={supForm.address} onChange={e => setSupForm({...supForm,address:e.target.value})} /></div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn-primary" onClick={createSupplier} disabled={saving}>{saving ? 'Saving…' : selectedSupplier ? 'Update Supplier' : 'Save Supplier'}</button>
        </div>
      </Modal>

      {/* View PO Modal */}
      <Modal open={modal==='view_po'} onClose={() => setModal(null)} title={`PO — ${selected?.po_number}`} size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Supplier</span><div className="font-medium">{selected.supplier_id?.name || '—'}</div></div>
              <div><span className="text-gray-500">Status</span><div><Badge status={selected.status} /></div></div>
              <div><span className="text-gray-500">Total Cost</span><div className="font-semibold">GH₵ {parseFloat(selected.total_cost||0).toFixed(2)}</div></div>
              <div><span className="text-gray-500">Payment</span><div><Badge status={selected.payment_status || 'unpaid'} /></div></div>
              {selected.expected_date && <div><span className="text-gray-500">Expected</span><div>{new Date(selected.expected_date).toLocaleDateString()}</div></div>}
              {selected.notes && <div className="col-span-2"><span className="text-gray-500">Notes</span><div>{selected.notes}</div></div>}
            </div>
            <div className="border-t pt-3">
              <h4 className="font-medium text-sm mb-2">Items</h4>
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="table-header"><tr>{['Product','Ordered','Received','Unit Cost','Total'].map(h=><th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {(selected.items||[]).map((item:any,i:number) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium">{item.product_name}</td>
                      <td className="px-3 py-2">{item.quantity_ordered}</td>
                      <td className="px-3 py-2">{item.quantity_received}</td>
                      <td className="px-3 py-2">GH₵ {parseFloat(item.unit_cost||0).toFixed(2)}</td>
                      <td className="px-3 py-2 font-semibold">GH₵ {parseFloat(item.total||0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </div>
          </div>
        )}
        <div className="flex justify-end mt-6">
          <button className="btn-secondary" onClick={() => setModal(null)}>Close</button>
        </div>
      </Modal>

      {/* Receive Goods Modal */}
      <Modal open={modal==='receive'} onClose={() => setModal(null)} title="Receive Goods" size="md">
        <p className="text-sm text-gray-500 mb-4">PO: <strong>{selected?.po_number}</strong></p>
        <div className="space-y-2">
          {receiveItems.map((item, i) => (
            <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
              <div className="flex-1 text-sm font-medium">{item.product_name}</div>
              <div className="text-xs text-gray-500">Ordered: {item.quantity_ordered} | Received: {item.quantity_received}</div>
              <input type="number" className="form-input w-20" min={0} max={item.quantity_ordered - item.quantity_received}
                value={item.receive_qty} onChange={e => { const r=[...receiveItems]; r[i]={...r[i],receive_qty:parseInt(e.target.value)}; setReceiveItems(r); }} />
            </div>
          ))}
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn-primary" onClick={doReceive} disabled={saving}>{saving?'Saving…':'Confirm Receipt'}</button>
        </div>
      </Modal>
      {/* Supplier Payment Modal */}
      <Modal open={!!poPayModal} onClose={() => setPoPayModal(null)} title={`Pay Supplier — ${poPayModal?.po_number}`} size="sm">
        {poPayModal && (
          <div className="space-y-3">
            <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Supplier</span>
                <span className="font-medium">{poPayModal.supplier_id?.name || poPayModal.supplier_name || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">PO Total</span>
                <span className="font-medium">GHS {parseFloat(poPayModal.total_cost||0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Already Paid</span>
                <span className="font-medium text-green-600">GHS {parseFloat(poPayModal.amount_paid||0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t pt-1">
                <span className="text-gray-500 font-semibold">Outstanding</span>
                <span className="font-bold text-red-600">GHS {poPayModal.outstanding.toFixed(2)}</span>
              </div>
            </div>
            <div>
              <label className="form-label">Amount Paying (GHS) *</label>
              <input
                type="number" className="form-input"
                value={poPayForm.amount}
                onChange={e => setPoPayForm({...poPayForm, amount: e.target.value})}
                max={poPayModal.outstanding}
              />
              {parseFloat(poPayForm.amount||'0') > 0 && parseFloat(poPayForm.amount||'0') < poPayModal.outstanding && (
                <p className="text-xs text-yellow-600 mt-1">Partial payment — GHS {(poPayModal.outstanding - parseFloat(poPayForm.amount)).toFixed(2)} will remain outstanding.</p>
              )}
              {parseFloat(poPayForm.amount||'0') >= poPayModal.outstanding && (
                <p className="text-xs text-green-600 mt-1">✓ Full payment — payable will be cleared.</p>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="form-label">Method</label>
                <select className="form-input" value={poPayForm.method} onChange={e => setPoPayForm({...poPayForm, method: e.target.value})}>
                  {['bank_transfer','cash','cheque','mobile_money','card'].map(m => (
                    <option key={m} value={m}>{m.replace('_',' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Reference</label>
                <input className="form-input" value={poPayForm.reference} onChange={e => setPoPayForm({...poPayForm, reference: e.target.value})} placeholder="e.g. TXN-001" />
              </div>
            </div>
            <div>
              <label className="form-label">Note</label>
              <input className="form-input" value={poPayForm.note} onChange={e => setPoPayForm({...poPayForm, note: e.target.value})} placeholder="Optional" />
            </div>
          </div>
        )}
        <div className="flex gap-3 justify-end mt-6">
          <button className="btn-secondary" onClick={() => setPoPayModal(null)}>Cancel</button>
          <button
            className="btn-primary"
            disabled={poPaySaving || !parseFloat(poPayForm.amount||'0')}
            onClick={recordPoPayment}
          >{poPaySaving ? 'Processing…' : 'Record Payment'}</button>
        </div>
      </Modal>
    </AppLayout>
  );
}
