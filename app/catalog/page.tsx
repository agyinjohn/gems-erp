'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import api from '@/lib/api';
import { Modal, Spinner, toast, EmptyState } from '@/components/ui';
import { Plus, Search, Package, Edit2 } from 'lucide-react';

interface Product {
  id: string;
  _id?: string;
  name: string;
  sku: string;
  price: number;
  cost_price?: number;
  stock_qty: number;
  category_name?: string;
  is_active: boolean;
}

export default function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({ name: '', sku: '', price: '', cost_price: '', stock_qty: '0', category_id: '' });

  const load = async () => {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([
        api.get('/products', { params: { search: search || undefined } }),
        api.get('/categories'),
      ]);
      setProducts(p.data.data.map((x: any) => ({ ...x, id: x.id || x._id })));
      setCategories(c.data.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [search]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', sku: '', price: '', cost_price: '', stock_qty: '0', category_id: categories[0]?._id || '' });
    setModal(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      sku: p.sku || '',
      price: String(p.price),
      cost_price: String(p.cost_price || 0),
      stock_qty: String(p.stock_qty),
      category_id: '',
    });
    setModal(true);
  };

  const save = async () => {
    if (!form.name || !form.price) { toast.error('Name and price are required.'); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        sku: form.sku || undefined,
        price: parseFloat(form.price),
        cost_price: parseFloat(form.cost_price) || 0,
        stock_qty: parseInt(form.stock_qty, 10) || 0,
        category_id: form.category_id || undefined,
        is_active: true,
      };
      if (editing) {
        await api.put(`/products/${editing.id}`, payload);
        toast.success('Product updated');
      } else {
        await api.post('/products', payload);
        toast.success('Product added to catalog');
      }
      setModal(false);
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const filtered = products.filter((p) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <AppLayout title="Product Catalog" subtitle="Manage products for your online store" allowedRoles={['business_owner', 'branch_manager', 'warehouse_staff']}>
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="form-input pl-9" placeholder="Search catalog…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button className="btn-primary" onClick={openCreate}><Plus className="w-4 h-4" /> Add Product</button>
      </div>

      {loading ? <Spinner /> : filtered.length === 0 ? (
        <EmptyState message="No products yet — add your first catalog item." icon={<Package className="w-8 h-8 text-gray-300" />} />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="table-header">
              <tr>
                <th className="px-4 py-2 text-left">Product</th>
                <th className="px-4 py-2 text-left">SKU</th>
                <th className="px-4 py-2 text-right">Price</th>
                <th className="px-4 py-2 text-right">Stock</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{p.sku || '—'}</td>
                  <td className="px-4 py-3 text-right font-semibold">GH₵ {parseFloat(String(p.price)).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">{p.stock_qty}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(p)} className="text-blue-600 hover:text-blue-800 text-xs font-semibold inline-flex items-center gap-1">
                      <Edit2 className="w-3.5 h-3.5" /> Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Product' : 'Add Product'}>
        <div className="space-y-3">
          <div><label className="form-label">Name *</label><input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="form-label">SKU</label><input className="form-input" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></div>
            <div><label className="form-label">Stock</label><input type="number" className="form-input" value={form.stock_qty} onChange={(e) => setForm({ ...form, stock_qty: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="form-label">Price (GH₵) *</label><input type="number" className="form-input" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
            <div><label className="form-label">Cost price</label><input type="number" className="form-input" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} /></div>
          </div>
          {categories.length > 0 && (
            <div>
              <label className="form-label">Category</label>
              <select className="form-input" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                <option value="">— None —</option>
                {categories.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
          )}
          <button className="btn-primary w-full" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Product'}</button>
        </div>
      </Modal>
    </AppLayout>
  );
}
