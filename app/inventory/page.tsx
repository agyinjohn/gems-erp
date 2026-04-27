'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Modal, Badge, EmptyState, Spinner, ConfirmDialog, toast } from '@/components/ui';
import { Plus, Search, Edit2, Trash2, TrendingDown, AlertTriangle, Package } from 'lucide-react';
import api from '@/lib/api';

export default function InventoryPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [modal, setModal] = useState<'add'|'edit'|'adjust'|null>(null);
  const [selected, setSelected] = useState<any>(null);
  const [confirm, setConfirm] = useState<any>(null);
  const [form, setForm] = useState({ name:'', sku:'', description:'', category_id:'', price:'', cost_price:'', stock_qty:'', low_stock_threshold:'10', unit:'piece' });
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustType, setAdjustType] = useState<'add'|'remove'>('add');
  const [adjustNote, setAdjustNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    const [p, c] = await Promise.all([api.get('/products'), api.get('/categories')]);
    setProducts(p.data.data);
    setCategories(c.data.data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = products.filter(p =>
    (!search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())) &&
    (!filterCat || (p.category_id?._id || p.category_id) == filterCat)
  );

  const openAdd = () => { setForm({ name:'',sku:'',description:'',category_id:'',price:'',cost_price:'',stock_qty:'',low_stock_threshold:'10',unit:'piece' }); setError(''); setModal('add'); };
  const openEdit = (p: any) => { setSelected(p); setForm({ name:p.name,sku:p.sku,description:p.description||'',category_id:p.category_id?._id||p.category_id||'',price:p.price,cost_price:p.cost_price,stock_qty:p.stock_qty,low_stock_threshold:p.low_stock_threshold,unit:p.unit }); setError(''); setModal('edit'); };
  const openAdjust = (p: any) => { setSelected(p); setAdjustQty(''); setAdjustType('add'); setAdjustNote(''); setModal('adjust'); };

  const save = async () => {
    setSaving(true); setError('');
    try {
      if (modal === 'add') await api.post('/products', form);
      else await api.put(`/products/${selected.id}`, form);
      toast.success('Saved successfully'); setModal(null); load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Error saving product'); }
    finally { setSaving(false); }
  };

  const doAdjust = async () => {
    if (!adjustQty || parseInt(adjustQty) <= 0) return;
    const delta = adjustType === 'remove' ? -Math.abs(parseInt(adjustQty)) : Math.abs(parseInt(adjustQty));
    setSaving(true);
    try { await api.post(`/products/${selected.id}/adjust-stock`, { quantity: delta, notes: adjustNote }); toast.success('Stock adjusted'); setModal(null); load(); }
    catch (e: any) { toast.error(e.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const doDelete = async (id: number) => {
    await api.delete(`/products/${id}`);
    toast.success('Deleted successfully');
    load();
  };

  const inputProps = (key: string) => ({ value: (form as any)[key], onChange: (e: any) => setForm({...form, [key]: e.target.value}), className: 'form-input' });

  return (
    <AppLayout title="Inventory" subtitle="Manage products, stock levels and categories" allowedRoles={['super_admin','warehouse_staff']}>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="form-input pl-9" placeholder="Search products or SKU…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-input w-auto" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button className="btn-primary" onClick={openAdd}><Plus className="w-4 h-4" />Add Product</button>
      </div>

      {/* Low stock alert */}
      {products.filter(p => p.stock_qty <= p.low_stock_threshold).length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 flex items-center gap-3 mb-5 text-sm text-yellow-800">
          <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
          <span><strong>{products.filter(p => p.stock_qty <= p.low_stock_threshold).length} products</strong> are at or below their low stock threshold.</span>
        </div>
      )}

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? <Spinner /> : filtered.length === 0 ? <EmptyState message="No products found" icon="📦" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="table-header">
                <tr>
                  <th className="px-5 py-3 text-left">Product</th>
                  <th className="px-5 py-3 text-left">Category</th>
                  <th className="px-5 py-3 text-right">Price</th>
                  <th className="px-5 py-3 text-right">Margin</th>
                  <th className="px-5 py-3 text-center">Stock Level</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(p => {
                  const isLow = p.stock_qty <= p.low_stock_threshold;
                  const isOut = p.stock_qty === 0;
                  const margin = p.price > 0 ? Math.round(((p.price - p.cost_price) / p.price) * 100) : 0;
                  const stockPct = Math.min(100, Math.round((p.stock_qty / Math.max(p.low_stock_threshold * 3, 1)) * 100));
                  const stockColor = isOut ? 'bg-red-500' : isLow ? 'bg-yellow-400' : 'bg-green-500';
                  const stockLabel = isOut ? 'Out of stock' : isLow ? 'Low stock' : 'In stock';
                  const stockTextColor = isOut ? 'text-red-600' : isLow ? 'text-yellow-600' : 'text-green-600';
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors group">
                      {/* Product */}
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-gray-900">{p.name}</div>
                        <div className="text-xs text-gray-400 font-mono mt-0.5">{p.sku}</div>
                      </td>
                      {/* Category */}
                      <td className="px-5 py-3.5">
                        {p.category_name
                          ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">{p.category_name}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      {/* Price */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="font-semibold text-gray-900">GHS {parseFloat(p.price).toLocaleString('en-GH', { minimumFractionDigits: 2 })}</div>
                        <div className="text-xs text-gray-400 mt-0.5">Cost: GHS {parseFloat(p.cost_price).toLocaleString('en-GH', { minimumFractionDigits: 2 })}</div>
                      </td>
                      {/* Margin */}
                      <td className="px-5 py-3.5 text-right">
                        <span className={`font-semibold text-sm ${ margin >= 30 ? 'text-green-600' : margin >= 15 ? 'text-yellow-600' : 'text-red-500' }`}>
                          {margin}%
                        </span>
                      </td>
                      {/* Stock Level */}
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col items-center gap-1 min-w-[110px]">
                          <div className="flex items-center justify-between w-full">
                            <span className={`text-xs font-medium ${stockTextColor}`}>{stockLabel}</span>
                            <span className="text-xs text-gray-500 font-mono">{p.stock_qty} <span className="text-gray-400">{p.unit}</span></span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${stockColor}`} style={{ width: `${stockPct}%` }} />
                          </div>
                        </div>
                      </td>
                      {/* Status */}
                      <td className="px-5 py-3.5 text-center">
                        <Badge status={p.is_active ? 'active' : 'inactive'} />
                      </td>
                      {/* Actions */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openAdjust(p)} title="Adjust Stock" className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"><TrendingDown className="w-4 h-4" /></button>
                          <button onClick={() => openEdit(p)} title="Edit" className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => setConfirm({ id: p.id, name: p.name })} title="Delete" className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {/* Footer count */}
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-400">
              Showing {filtered.length} of {products.length} products
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      <Modal open={modal === 'add' || modal === 'edit'} onClose={() => setModal(null)} title={modal === 'add' ? 'Add Product' : 'Edit Product'} size="lg">
        {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm mb-4">{error}</div>}
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="form-label">Product Name *</label><input {...inputProps('name')} placeholder="e.g. Laptop Pro 15" /></div>
          <div><label className="form-label">SKU *</label><input {...inputProps('sku')} placeholder="e.g. ELEC-001" /></div>
          <div>
            <label className="form-label">Category</label>
            <select {...inputProps('category_id')}><option value="">Select category</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          </div>
          <div><label className="form-label">Selling Price (GHS) *</label><input type="number" {...inputProps('price')} placeholder="0.00" /></div>
          <div><label className="form-label">Cost Price (GHS)</label><input type="number" {...inputProps('cost_price')} placeholder="0.00" /></div>
          <div><label className="form-label">{modal === 'add' ? 'Initial Stock' : 'Stock Quantity'}</label><input type="number" {...inputProps('stock_qty')} placeholder="0" /></div>
          <div><label className="form-label">Low Stock Alert</label><input type="number" {...inputProps('low_stock_threshold')} /></div>
          <div><label className="form-label">Unit</label><input {...inputProps('unit')} placeholder="piece, kg, box…" /></div>
          <div className="col-span-2"><label className="form-label">Description</label><textarea {...inputProps('description')} rows={3} placeholder="Product description…" /></div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Product'}</button>
        </div>
      </Modal>

      {/* Adjust Stock Modal */}
      <Modal open={modal === 'adjust'} onClose={() => setModal(null)} title={`Adjust Stock — ${selected?.name}`} size="sm">
        {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm mb-4">{error}</div>}
        {/* Add / Remove toggle */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden mb-5">
          <button
            onClick={() => setAdjustType('add')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${ adjustType === 'add' ? 'bg-green-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50' }`}
          >+ Add Stock</button>
          <button
            onClick={() => setAdjustType('remove')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${ adjustType === 'remove' ? 'bg-red-500 text-white' : 'bg-white text-gray-500 hover:bg-gray-50' }`}
          >− Remove Stock</button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="form-label">Quantity</label>
            <input
              type="number" min="1" className="form-input" placeholder="Enter quantity"
              value={adjustQty} onChange={e => setAdjustQty(e.target.value.replace(/[^0-9]/g, ''))}
            />
            {/* Live preview */}
            {adjustQty && parseInt(adjustQty) > 0 && (
              <div className={`mt-2 text-xs px-3 py-2 rounded-lg ${ adjustType === 'add' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700' }`}>
                {selected?.stock_qty} → <strong>{adjustType === 'add'
                  ? selected?.stock_qty + parseInt(adjustQty)
                  : Math.max(0, selected?.stock_qty - parseInt(adjustQty))
                } {selected?.unit}</strong>
                {adjustType === 'remove' && parseInt(adjustQty) > selected?.stock_qty && (
                  <span className="ml-2 font-semibold">⚠ Exceeds current stock</span>
                )}
              </div>
            )}
          </div>
          <div><label className="form-label">Reason / Notes</label><input className="form-input" placeholder="e.g. Received from supplier" value={adjustNote} onChange={e => setAdjustNote(e.target.value)} /></div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
          <button
            className={adjustType === 'add' ? 'btn-primary' : 'btn-danger'}
            onClick={doAdjust} disabled={saving || !adjustQty || parseInt(adjustQty) <= 0}
          >{saving ? 'Saving…' : adjustType === 'add' ? 'Add Stock' : 'Remove Stock'}</button>
        </div>
      </Modal>

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} onConfirm={() => doDelete(confirm?.id)} title="Delete Product" message={`Are you sure you want to deactivate "${confirm?.name}"? It will be hidden from the storefront.`} danger />
    </AppLayout>
  );
}
