'use client';

import { useCallback, useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Modal, EmptyState, Spinner, ConfirmDialog, toast } from '@/components/ui';
import {
  Plus, Search, Pencil, Trash2, Tag, Paperclip, EyeOff, Eye,
} from 'lucide-react';

/**
 * What the business offers.
 *
 * Separate from Inventory on purpose. Inventory answers "what do we have" —
 * stock counts, reorder levels, SKUs, a label to print. This answers "what do
 * we sell", which for a service business is a different question asked by
 * different people at different times, and the two only shared a page because
 * they happen to share a table.
 *
 * It is also the list a client picks from when they send a request in, so the
 * two settings that decide what happens next — the kind of work, and whether
 * something has to be sent with it — are shown here rather than buried behind
 * an edit form.
 */

interface Service {
  id: string;
  name: string;
  description?: string;
  category_id?: string | { _id: string; name: string } | null;
  category_name?: string;
  service_type: string;
  requires_file: boolean;
  unit_type: string;
  duration?: number | null;
  pricing_mode: 'fixed' | 'open';
  price: number;
  min_price?: number;
  max_price?: number;
  revenue_account_code?: string | null;
  is_active?: boolean;
}

interface Category { id: string; _id?: string; name: string; scope?: string }

/** Everything in the catalogue; only the services are this page's business. */
interface CatalogItem extends Service { item_type?: string }

/** What axios hands back when a request fails. */
type ApiError = { response?: { data?: { message?: string } } };
const reason = (e: unknown, fallback: string) =>
  (e as ApiError)?.response?.data?.message || fallback;

const SERVICE_TYPES = [
  { key: 'general',      label: 'General service',        stages: 'In the queue → under way → ready → delivered' },
  { key: 'printing',     label: 'Printing & production',  stages: 'Queue → preparing → proof → on the press → finishing → ready' },
  { key: 'design',       label: 'Design & artwork',       stages: 'Queue → drafting → approval → revisions → ready' },
  { key: 'repair',       label: 'Repair & servicing',     stages: 'Received → assessing → repairing → testing → ready' },
  { key: 'installation', label: 'Installation & site work', stages: 'Scheduled → on site → installing → final checks' },
  { key: 'professional', label: 'Professional services',  stages: 'Scheduled → in progress → with client → delivered' },
];
const UNIT_TYPES = [
  { key: 'fixed', label: 'Fixed price' },
  { key: 'hour',  label: 'Per hour' },
  { key: 'day',   label: 'Per day' },
  { key: 'unit',  label: 'Per unit' },
];

const typeLabel = (k: string) => SERVICE_TYPES.find(t => t.key === k)?.label || k;
const unitLabel = (k: string) => UNIT_TYPES.find(u => u.key === k)?.label || k;
const money = (n: number) =>
  `GH₵ ${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type FormValue = string | boolean;

const EMPTY = {
  name: '', description: '', category_id: '',
  service_type: 'general', requires_file: false,
  pricing_mode: 'fixed' as 'fixed' | 'open',
  price: '', min_price: '', max_price: '',
  unit_type: 'fixed', duration: '', revenue_account_code: '',
};

export default function ServiceCatalogPage() {
  const { user } = useAuth();
  const canManage = ['platform_admin', 'business_owner', 'branch_manager'].includes(user?.role || '');
  const isOwner = ['platform_admin', 'business_owner'].includes(user?.role || '');

  const [rows, setRows] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<{ title: string; message: string; run: () => void } | null>(null);

  const load = useCallback(async () => {
    try {
      const [p, c] = await Promise.all([
        api.get('/products'),
        api.get('/categories').catch(() => ({ data: { data: [] } })),
      ]);
      // One table holds products, services and bundles; only services belong here.
      const items: CatalogItem[] = p.data.data || [];
      setRows(items.filter((x) => x.item_type === 'service'));
      setCategories((c.data.data || []).filter((x: Category) => x.scope === 'service'));
    } catch (e) {
      toast.error(reason(e, 'Could not load services'));
    } finally { setLoading(false); setLoadedOnce(true); }
  }, []);

  // Deferred a tick: the rule objects to a state update reached synchronously
  // from an effect, and fetching on mount is exactly what this page is for.
  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load]);

  const set = (k: keyof typeof EMPTY, v: FormValue) => setForm(f => ({ ...f, [k]: v }));

  const openAdd = () => { setForm({ ...EMPTY }); setEditing(null); setModal('add'); };
  const openEdit = (s: Service) => {
    setEditing(s);
    setForm({
      name: s.name || '',
      description: s.description || '',
      category_id: typeof s.category_id === 'object' && s.category_id ? s.category_id._id : s.category_id || '',
      service_type: s.service_type || 'general',
      requires_file: !!s.requires_file,
      pricing_mode: s.pricing_mode === 'open' ? 'open' : 'fixed',
      price: String(s.price ?? ''),
      min_price: s.min_price ? String(s.min_price) : '',
      max_price: s.max_price ? String(s.max_price) : '',
      unit_type: s.unit_type || 'fixed',
      duration: s.duration ? String(s.duration) : '',
      revenue_account_code: s.revenue_account_code || '',
    });
    setModal('edit');
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error('Give the service a name'); return; }
    if (form.pricing_mode === 'fixed' && !form.price) { toast.error('Set a price, or switch to “we’ll quote it”'); return; }
    setSaving(true);
    try {
      // item_type is fixed here — this page only ever makes services, and
      // letting it be anything else is how you end up with a product in the
      // list a client picks a service from.
      const payload = {
        ...form,
        item_type: 'service',
        price: parseFloat(form.price) || 0,
        min_price: parseFloat(form.min_price) || 0,
        max_price: parseFloat(form.max_price) || 0,
        duration: form.duration ? parseFloat(form.duration) : null,
        category_id: form.category_id || null,
      };
      if (modal === 'edit' && editing) await api.put(`/products/${editing.id}`, payload);
      else await api.post('/products', payload);
      toast.success(modal === 'edit' ? 'Service updated' : 'Service added');
      setModal(null);
      await load();
    } catch (e) {
      toast.error(reason(e, 'Could not save the service'));
    } finally { setSaving(false); }
  };

  const toggleActive = async (s: Service) => {
    try {
      await api.put(`/products/${s.id}`, { is_active: s.is_active === false });
      await load();
    } catch (e) {
      toast.error(reason(e, 'Could not update the service'));
    }
  };

  const remove = (s: Service) => setConfirm({
    title: `Delete ${s.name}?`,
    message: 'Clients will no longer be able to request it, and it disappears from the price list. '
      + 'Work already done under it is unaffected. If you only want it off the list for now, hide it instead.',
    run: async () => {
      try {
        await api.delete(`/products/${s.id}`);
        toast.success('Service deleted');
        await load();
      } catch (e) {
        toast.error(reason(e, 'Could not delete the service'));
      }
    },
  });

  const q = search.toLowerCase().trim();
  const visible = rows.filter(s =>
    (showInactive || s.is_active !== false)
    && (!typeFilter || s.service_type === typeFilter)
    && (!q || s.name.toLowerCase().includes(q) || (s.description || '').toLowerCase().includes(q)),
  );

  const hiddenCount = rows.filter(s => s.is_active === false).length;
  const quotedCount = rows.filter(s => s.pricing_mode === 'open').length;
  const fileCount = rows.filter(s => s.requires_file).length;

  return (
    <AppLayout
      title="Our services"
      subtitle="What the business offers, and what a client can ask for"
      allowedRoles={['platform_admin', 'business_owner', 'branch_manager']}
    >
      <div className="space-y-5">

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            ['On the price list', rows.length - hiddenCount, 'text-gray-900'],
            ['Priced by hand', quotedCount, quotedCount ? 'text-amber-700' : 'text-gray-400'],
            ['Need a file', fileCount, 'text-gray-900'],
            ['Hidden', hiddenCount, hiddenCount ? 'text-gray-500' : 'text-gray-400'],
          ].map(([l, v, tone]) => (
            <div key={l as string} className="card">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">{l as string}</p>
              <p className={`text-2xl font-extrabold mt-1 ${tone as string}`}>{v as number}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="form-input pl-9 w-full !py-1.5 text-sm" placeholder="Search services…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-input !w-auto !py-1.5 text-sm" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">All kinds of work</option>
            {SERVICE_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
          <button type="button" className={showInactive ? 'btn-primary !py-1.5 text-sm' : 'btn-secondary !py-1.5 text-sm'}
            onClick={() => setShowInactive(v => !v)}>
            {showInactive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {showInactive ? 'Showing hidden' : 'Hidden'}
          </button>
          {canManage && (
            <button type="button" className="btn-primary ml-auto" onClick={openAdd}>
              <Plus className="w-4 h-4" /> New service
            </button>
          )}
        </div>

        {loading && !loadedOnce ? <Spinner /> : visible.length === 0 ? (
          <EmptyState
            message={rows.length === 0
              ? 'Nothing on the price list yet — add a service and clients can start requesting it'
              : 'No services match that'}
            icon={<Tag className="w-8 h-8 text-gray-300" />}
          />
        ) : (
          <div className="space-y-2">
            {visible.map(s => (
              <div key={s.id} className={`card !p-0 overflow-hidden ${s.is_active === false ? 'opacity-60' : ''}`}>
                <div className="flex items-start gap-3 px-4 py-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 text-sm">{s.name}</span>
                      <span className="badge bg-gray-100 text-gray-600">{typeLabel(s.service_type)}</span>
                      {s.requires_file && (
                        <span className="badge bg-blue-50 text-blue-700 gap-1" title="A client must attach something to request this">
                          <Paperclip className="w-3 h-3" /> File
                        </span>
                      )}
                      {s.is_active === false && <span className="badge bg-gray-100 text-gray-400">Hidden</span>}
                    </div>
                    {s.description && <p className="text-xs text-gray-500 mt-0.5">{s.description}</p>}
                    <p className="text-xs text-gray-400 mt-1">
                      {unitLabel(s.unit_type)}
                      {s.duration ? ` · about ${s.duration} ${s.unit_type === 'hour' ? 'hours' : 'days'}` : ''}
                      {s.revenue_account_code ? ` · posts to ${s.revenue_account_code}` : ''}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {s.pricing_mode === 'open' ? (
                      <span className="text-xs font-medium text-amber-700">Priced by hand</span>
                    ) : (
                      <p className="font-bold text-gray-900 tabular-nums">{money(s.price)}</p>
                    )}
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button type="button" onClick={() => toggleActive(s)}
                        title={s.is_active === false ? 'Put back on the list' : 'Hide from the list'}
                        className="p-1.5 hover:bg-gray-100 rounded text-gray-500">
                        {s.is_active === false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      <button type="button" onClick={() => openEdit(s)} title="Edit"
                        className="p-1.5 hover:bg-[#0D3B6E]/8 rounded text-[#0D3B6E]"><Pencil className="w-4 h-4" /></button>
                      {isOwner && (
                        <button type="button" onClick={() => remove(s)} title="Delete"
                          className="p-1.5 hover:bg-red-50 rounded text-red-600"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={modal !== null} onClose={() => setModal(null)}
        title={modal === 'edit' ? 'Edit service' : 'New service'} size="md">
        <div className="space-y-3">
          <div>
            <label className="form-label">Name *</label>
            <input className="form-input" placeholder="e.g. A5 flyers, double sided"
              value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div>
            <label className="form-label">Description</label>
            <input className="form-input" placeholder="Shown to clients on the request page"
              value={form.description} onChange={e => set('description', e.target.value)} />
          </div>

          <div>
            <label className="form-label">Kind of work</label>
            <select className="form-input" value={form.service_type}
              onChange={e => setForm(f => ({
                ...f,
                service_type: e.target.value,
                // Printing and design normally need something sent in. Ticked
                // for you, and yours to change.
                requires_file: ['printing', 'design'].includes(e.target.value),
              }))}>
              {SERVICE_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              {SERVICE_TYPES.find(t => t.key === form.service_type)?.stages}
            </p>
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input type="checkbox" className="mt-0.5" checked={form.requires_file}
              onChange={e => set('requires_file', e.target.checked)} />
            <span>
              <span className="text-sm font-medium text-gray-800">Needs a file from the client</span>
              <span className="block text-xs text-gray-400">
                Requests for this can&apos;t be sent without an attachment. Right for artwork and
                documents; wrong for a call-out, where there&apos;s nothing to attach.
              </span>
            </span>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Pricing</label>
              <select className="form-input" value={form.pricing_mode}
                onChange={e => set('pricing_mode', e.target.value)}>
                <option value="fixed">Set price</option>
                <option value="open">We&apos;ll quote it</option>
              </select>
            </div>
            {form.pricing_mode === 'fixed' ? (
              <div>
                <label className="form-label">Price (GH₵) *</label>
                <input type="number" className="form-input" placeholder="0.00"
                  value={form.price} onChange={e => set('price', e.target.value)} />
              </div>
            ) : (
              <div>
                <label className="form-label">Billed</label>
                <select className="form-input" value={form.unit_type} onChange={e => set('unit_type', e.target.value)}>
                  {UNIT_TYPES.map(u => <option key={u.key} value={u.key}>{u.label}</option>)}
                </select>
              </div>
            )}
          </div>

          {form.pricing_mode === 'open' ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Minimum <span className="text-gray-400 font-normal">(optional)</span></label>
                <input type="number" className="form-input" placeholder="No minimum"
                  value={form.min_price} onChange={e => set('min_price', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Maximum <span className="text-gray-400 font-normal">(optional)</span></label>
                <input type="number" className="form-input" placeholder="No maximum"
                  value={form.max_price} onChange={e => set('max_price', e.target.value)} />
                <p className="text-xs text-gray-400 mt-1">Guards against a mistyped amount at the till.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Billed</label>
                <select className="form-input" value={form.unit_type} onChange={e => set('unit_type', e.target.value)}>
                  {UNIT_TYPES.map(u => <option key={u.key} value={u.key}>{u.label}</option>)}
                </select>
              </div>
              {form.unit_type !== 'fixed' && (
                <div>
                  <label className="form-label">Typical {form.unit_type === 'hour' ? 'hours' : 'days'}</label>
                  <input type="number" className="form-input" placeholder="e.g. 2"
                    value={form.duration} onChange={e => set('duration', e.target.value)} />
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Category <span className="text-gray-400 font-normal">(optional)</span></label>
              <select className="form-input" value={form.category_id} onChange={e => set('category_id', e.target.value)}>
                <option value="">None</option>
                {categories.map(c => <option key={c.id || c._id} value={c.id || c._id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Revenue account <span className="text-gray-400 font-normal">(optional)</span></label>
              <input className="form-input" placeholder="4010"
                value={form.revenue_account_code} onChange={e => set('revenue_account_code', e.target.value)} />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
            <button type="button" className="btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : modal === 'edit' ? 'Save changes' : 'Add service'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => { confirm?.run(); setConfirm(null); }}
        title={confirm?.title || ''}
        message={confirm?.message || ''}
        danger
      />
    </AppLayout>
  );
}
