'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Modal, EmptyState, Spinner, ConfirmDialog, ResponsiveTable, toast } from '@/components/ui';
import {
  Plus, Search, Pencil, Trash2, Tag, Paperclip, EyeOff, Eye, Layers, X,
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
 * Two kinds live here. A service is one piece of work. A solution is several
 * of them sold as one thing — "new business starter pack" being a logo, five
 * hundred cards and a banner. The server calls that second one a bundle; the
 * business calls it a solution, and the business gets the label.
 *
 * It is also the list a client picks from when they send a request in, so the
 * settings that decide what happens next — the kind of work, whether something
 * has to be sent with it, and where the thing can be reached at all — are shown
 * here rather than buried behind an edit form.
 */

type Kind = 'service' | 'bundle';

interface BundleLine { product_id: string; quantity: number }

interface Offering {
  id: string;
  name: string;
  description?: string;
  item_type?: string;
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
  sell_online?: boolean;
  requestable?: boolean;
  bundle_items?: { product_id: string | { _id: string; name: string }; quantity: number }[];
}

interface Category { id: string; _id?: string; name: string; scope?: string }

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

/** A populated reference comes back as an object; an unpopulated one as an id. */
const idOf = (v: unknown): string =>
  typeof v === 'object' && v !== null ? String((v as { _id?: string })._id || '') : String(v || '');

interface FormState {
  name: string;
  description: string;
  category_id: string;
  service_type: string;
  requires_file: boolean;
  pricing_mode: 'fixed' | 'open';
  price: string;
  min_price: string;
  max_price: string;
  unit_type: string;
  duration: string;
  revenue_account_code: string;
  sell_online: boolean;
  requestable: boolean;
  bundle_items: BundleLine[];
}

const EMPTY: FormState = {
  name: '', description: '', category_id: '',
  service_type: 'general', requires_file: false,
  pricing_mode: 'fixed',
  price: '', min_price: '', max_price: '',
  unit_type: 'fixed', duration: '', revenue_account_code: '',
  sell_online: true, requestable: true,
  bundle_items: [],
};

export default function OfferingsPage() {
  const { user } = useAuth();
  const canManage = ['platform_admin', 'business_owner', 'branch_manager'].includes(user?.role || '');
  const isOwner = ['platform_admin', 'business_owner'].includes(user?.role || '');

  const [tab, setTab] = useState<Kind>('service');
  const [all, setAll] = useState<Offering[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [editing, setEditing] = useState<Offering | null>(null);
  const [form, setForm] = useState<FormState>({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<{ title: string; message: string; run: () => void } | null>(null);

  const load = useCallback(async () => {
    try {
      const [p, c] = await Promise.all([
        api.get('/products'),
        api.get('/categories').catch(() => ({ data: { data: [] } })),
      ]);
      setAll(p.data.data || []);
      setCategories(c.data.data || []);
    } catch (e) {
      toast.error(reason(e, 'Could not load what the business offers'));
    } finally { setLoading(false); setLoadedOnce(true); }
  }, []);

  // Deferred a tick: the rule objects to a state update reached synchronously
  // from an effect, and fetching on mount is exactly what this page is for.
  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load]);

  // One table holds products, services and solutions; two of the three belong
  // here, and the third is only here to be put inside a solution.
  const rows = useMemo(
    () => all.filter(x => (x.item_type || 'product') === tab),
    [all, tab],
  );
  /** Anything a solution can be built out of — everything except other solutions. */
  const parts = useMemo(
    () => all.filter(x => x.item_type !== 'bundle' && x.is_active !== false),
    [all],
  );
  const partName = useCallback(
    (v: unknown) => {
      if (typeof v === 'object' && v !== null && (v as { name?: string }).name) return (v as { name: string }).name;
      return parts.find(p => p.id === idOf(v))?.name || 'Removed item';
    },
    [parts],
  );

  const isSolution = tab === 'bundle';
  const noun = isSolution ? 'solution' : 'service';

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(f => ({ ...f, [k]: v }));

  const openAdd = () => { setForm({ ...EMPTY }); setEditing(null); setModal('add'); };
  const openEdit = (s: Offering) => {
    setEditing(s);
    setForm({
      name: s.name || '',
      description: s.description || '',
      category_id: idOf(s.category_id),
      service_type: s.service_type || 'general',
      requires_file: !!s.requires_file,
      pricing_mode: s.pricing_mode === 'open' ? 'open' : 'fixed',
      price: String(s.price ?? ''),
      min_price: s.min_price ? String(s.min_price) : '',
      max_price: s.max_price ? String(s.max_price) : '',
      unit_type: s.unit_type || 'fixed',
      duration: s.duration ? String(s.duration) : '',
      revenue_account_code: s.revenue_account_code || '',
      // Absent means the old behaviour, which was to offer it everywhere.
      sell_online: s.sell_online !== false,
      requestable: s.requestable !== false,
      bundle_items: (s.bundle_items || []).map(bi => ({
        product_id: idOf(bi.product_id),
        quantity: bi.quantity || 1,
      })),
    });
    setModal('edit');
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error(`Give the ${noun} a name`); return; }
    if (form.pricing_mode === 'fixed' && !form.price) { toast.error('Set a price, or switch to “we’ll quote it”'); return; }
    if (isSolution && form.bundle_items.length === 0) {
      toast.error('A solution is made of other things — add at least one');
      return;
    }
    setSaving(true);
    try {
      // item_type comes from the tab, never from the form. Letting it be
      // anything else is how you end up with a laptop in the list a client
      // picks a service from.
      const payload = {
        ...form,
        item_type: tab,
        price: parseFloat(form.price) || 0,
        min_price: parseFloat(form.min_price) || 0,
        max_price: parseFloat(form.max_price) || 0,
        duration: form.duration ? parseFloat(form.duration) : null,
        category_id: form.category_id || null,
        bundle_items: isSolution ? form.bundle_items : [],
      };
      if (modal === 'edit' && editing) await api.put(`/products/${editing.id}`, payload);
      else await api.post('/products', payload);
      toast.success(modal === 'edit' ? 'Saved' : `${isSolution ? 'Solution' : 'Service'} added`);
      setModal(null);
      await load();
    } catch (e) {
      toast.error(reason(e, `Could not save the ${noun}`));
    } finally { setSaving(false); }
  };

  const toggleActive = async (s: Offering) => {
    try {
      await api.put(`/products/${s.id}`, { is_active: s.is_active === false });
      await load();
    } catch (e) {
      toast.error(reason(e, `Could not update the ${noun}`));
    }
  };

  const remove = (s: Offering) => setConfirm({
    title: `Remove ${s.name}?`,
    message: 'It comes off the price list and clients can no longer request it. '
      + 'Work already done under it is unaffected — the record is archived rather than erased, '
      + 'so past invoices and jobs keep their link to it.',
    run: async () => {
      try {
        await api.delete(`/products/${s.id}`);
        toast.success('Removed');
        await load();
      } catch (e) {
        toast.error(reason(e, `Could not remove the ${noun}`));
      }
    },
  });

  const q = search.toLowerCase().trim();
  const visible = rows.filter(s =>
    (showInactive || s.is_active !== false)
    && (isSolution || !typeFilter || s.service_type === typeFilter)
    && (!q || s.name.toLowerCase().includes(q) || (s.description || '').toLowerCase().includes(q)),
  );

  const hiddenCount = rows.filter(s => s.is_active === false).length;
  const quotedCount = rows.filter(s => s.pricing_mode === 'open').length;
  const fileCount = rows.filter(s => s.requires_file).length;
  const storeCount = rows.filter(s => s.is_active !== false && s.sell_online !== false && s.pricing_mode !== 'open').length;

  const stats: [string, number, string][] = isSolution
    ? [
      ['On the price list', rows.length - hiddenCount, 'text-gray-900'],
      ['Priced by hand', quotedCount, quotedCount ? 'text-amber-700' : 'text-gray-400'],
      ['On the store', storeCount, 'text-gray-900'],
      ['Hidden', hiddenCount, hiddenCount ? 'text-gray-500' : 'text-gray-400'],
    ]
    : [
      ['On the price list', rows.length - hiddenCount, 'text-gray-900'],
      ['Priced by hand', quotedCount, quotedCount ? 'text-amber-700' : 'text-gray-400'],
      ['Need a file', fileCount, 'text-gray-900'],
      ['Hidden', hiddenCount, hiddenCount ? 'text-gray-500' : 'text-gray-400'],
    ];

  /** Where an offering can be reached. Only the closed doors are worth saying. */
  const reachBadges = (s: Offering) => {
    const out: string[] = [];
    if (s.sell_online === false) out.push('Not on the store');
    if (s.requestable === false) out.push('Not requestable');
    return out;
  };

  const nameCell = (s: Offering) => (
    <div key="name" className={s.is_active === false ? 'opacity-60' : ''}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-medium text-gray-900">{s.name}</span>
        {s.is_active === false && <span className="badge bg-gray-100 text-gray-400">Hidden</span>}
        {reachBadges(s).map(b => (
          <span key={b} className="badge bg-gray-50 text-gray-500 border border-gray-200">{b}</span>
        ))}
      </div>
      {s.description && <div className="text-xs text-gray-400 mt-0.5">{s.description}</div>}
    </div>
  );

  const priceCell = (s: Offering) => (s.pricing_mode === 'open'
    ? <span key="price" className="text-xs font-medium text-amber-700">Priced by hand</span>
    : <span key="price" className="font-semibold text-gray-900 tabular-nums">{money(s.price)}</span>);

  const actionsCell = (s: Offering) => (canManage ? (
    <div key="actions" className="flex items-center gap-1 justify-end">
      <button type="button" onClick={() => toggleActive(s)}
        title={s.is_active === false ? 'Put back on the list' : 'Hide from the list'}
        className="p-1.5 hover:bg-gray-100 rounded text-gray-500">
        {s.is_active === false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
      </button>
      <button type="button" onClick={() => openEdit(s)} title="Edit"
        className="p-1.5 hover:bg-[#0D3B6E]/8 rounded text-[#0D3B6E]"><Pencil className="w-4 h-4" /></button>
      {isOwner && (
        <button type="button" onClick={() => remove(s)} title="Remove"
          className="p-1.5 hover:bg-red-50 rounded text-red-600"><Trash2 className="w-4 h-4" /></button>
      )}
    </div>
  ) : <span key="actions" />);

  const addLine = () => {
    const taken = new Set(form.bundle_items.map(b => b.product_id));
    const next = parts.find(p => !taken.has(p.id));
    if (!next) { toast.error('Everything is already in this solution'); return; }
    setForm(f => ({ ...f, bundle_items: [...f.bundle_items, { product_id: next.id, quantity: 1 }] }));
  };

  return (
    <AppLayout
      title="Services & solutions"
      subtitle="What the business offers, and what a client can ask for"
      allowedRoles={['platform_admin', 'business_owner', 'branch_manager']}
    >
      <div className="space-y-5">

        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 w-fit">
          {([['service', 'Services', Tag], ['bundle', 'Solutions', Layers]] as const).map(([k, label, Icon]) => (
            <button key={k} type="button" onClick={() => { setTab(k); setTypeFilter(''); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === k ? 'bg-[#0D3B6E] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}>
              <Icon className="w-4 h-4" /> {label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                tab === k ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
              }`}>{all.filter(x => (x.item_type || 'product') === k).length}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map(([l, v, tone]) => (
            <div key={l} className="card">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">{l}</p>
              <p className={`text-2xl font-extrabold mt-1 ${tone}`}>{v}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="form-input pl-9 w-full !py-1.5 text-sm"
              placeholder={isSolution ? 'Search solutions…' : 'Search services…'}
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {!isSolution && (
            <select className="form-input !w-auto !py-1.5 text-sm" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="">All kinds of work</option>
              {SERVICE_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          )}
          <button type="button" className={showInactive ? 'btn-primary !py-1.5 text-sm' : 'btn-secondary !py-1.5 text-sm'}
            onClick={() => setShowInactive(v => !v)}>
            {showInactive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {showInactive ? 'Showing hidden' : 'Hidden'}
          </button>
          {canManage && (
            <button type="button" className="btn-primary ml-auto" onClick={openAdd}>
              <Plus className="w-4 h-4" /> {isSolution ? 'New solution' : 'New service'}
            </button>
          )}
        </div>

        <div className="card p-0 overflow-hidden">
          {loading && !loadedOnce ? <Spinner /> : visible.length === 0 ? (
            <EmptyState
              message={rows.length === 0
                ? (isSolution
                  ? 'No solutions yet — bundle a few services together and sell them as one thing'
                  : 'Nothing on the price list yet — add a service and clients can start requesting it')
                : `No ${isSolution ? 'solutions' : 'services'} match that`}
              icon={isSolution ? <Layers className="w-8 h-8 text-gray-300" /> : <Tag className="w-8 h-8 text-gray-300" />}
            />
          ) : isSolution ? (
            <ResponsiveTable
              headers={['Solution', 'What’s in it', 'Price', '']}
              data={visible}
              renderRow={(s: Offering) => [
                nameCell(s),

                (() => {
                  const items = s.bundle_items || [];
                  if (!items.length) return <span key="parts" className="text-xs text-amber-700">Nothing in it yet</span>;
                  return (
                    <div key="parts" className="text-xs text-gray-600 space-y-0.5">
                      {items.slice(0, 3).map((bi, i) => (
                        <div key={i}>{bi.quantity}× {partName(bi.product_id)}</div>
                      ))}
                      {items.length > 3 && <div className="text-gray-400">+{items.length - 3} more</div>}
                    </div>
                  );
                })(),

                priceCell(s),
                actionsCell(s),
              ]}
            />
          ) : (
            <ResponsiveTable
              headers={['Service', 'Kind of work', 'Client sends', 'Billed', 'Price', '']}
              data={visible}
              renderRow={(s: Offering) => [
                nameCell(s),

                <span key="type" className="text-gray-600">{typeLabel(s.service_type)}</span>,

                // The one column worth scanning down: which services a client
                // cannot request without attaching something.
                s.requires_file ? (
                  <span key="file" className="badge bg-[#0D3B6E]/8 text-[#0D3B6E] gap-1">
                    <Paperclip className="w-3 h-3" /> A file
                  </span>
                ) : <span key="file" className="text-gray-300">—</span>,

                <span key="billed" className="text-gray-600">
                  {unitLabel(s.unit_type)}
                  {s.duration ? <span className="text-gray-400"> · ~{s.duration} {s.unit_type === 'hour' ? 'hrs' : 'days'}</span> : null}
                </span>,

                priceCell(s),
                actionsCell(s),
              ]}
            />
          )}
        </div>
      </div>

      <Modal open={modal !== null} onClose={() => setModal(null)}
        title={`${modal === 'edit' ? 'Edit' : 'New'} ${noun}`} size="md">
        <div className="space-y-3">
          <div>
            <label className="form-label">Name *</label>
            <input className="form-input"
              placeholder={isSolution ? 'e.g. New business starter pack' : 'e.g. A5 flyers, double sided'}
              value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div>
            <label className="form-label">Description</label>
            <input className="form-input" placeholder="Shown to clients on the request page"
              value={form.description} onChange={e => set('description', e.target.value)} />
          </div>

          {isSolution ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="form-label !mb-0">What&apos;s in it *</label>
                <button type="button" onClick={addLine}
                  className="text-xs text-[#0D3B6E] font-semibold hover:underline flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
              {form.bundle_items.length === 0 ? (
                <p className="text-xs text-gray-400 py-3 text-center border border-dashed border-gray-200 rounded-xl">
                  Nothing in it yet. Add the services and products this is made of.
                </p>
              ) : (
                <div className="space-y-2">
                  {form.bundle_items.map((bi, i) => (
                    <div key={i} className="flex gap-2 items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                      <select className="form-input flex-1 text-sm !py-1.5" value={bi.product_id}
                        onChange={e => setForm(f => ({
                          ...f,
                          bundle_items: f.bundle_items.map((b, idx) => idx === i ? { ...b, product_id: e.target.value } : b),
                        }))}>
                        {parts.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name}{p.item_type === 'service' ? ' (service)' : ''}
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-xs text-gray-400">Qty</span>
                        <input type="number" min="1" className="form-input w-16 text-sm !py-1.5 text-center"
                          value={bi.quantity}
                          onChange={e => setForm(f => ({
                            ...f,
                            bundle_items: f.bundle_items.map((b, idx) => idx === i
                              ? { ...b, quantity: Math.max(1, parseInt(e.target.value, 10) || 1) } : b),
                          }))} />
                      </div>
                      <button type="button" className="text-gray-400 hover:text-red-500 flex-shrink-0"
                        onClick={() => setForm(f => ({ ...f, bundle_items: f.bundle_items.filter((_, idx) => idx !== i) }))}>
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {(() => {
                    // What the parts come to on their own, so the price below
                    // can be set as a discount against it deliberately.
                    const apart = form.bundle_items.reduce((sum, bi) => {
                      const p = parts.find(x => x.id === bi.product_id);
                      return sum + (p && p.pricing_mode !== 'open' ? p.price * bi.quantity : 0);
                    }, 0);
                    if (!apart) return null;
                    const asked = parseFloat(form.price) || 0;
                    const savedBy = apart - asked;
                    return (
                      <p className="text-xs text-gray-400 text-right">
                        Bought separately: <span className="font-semibold text-gray-600">{money(apart)}</span>
                        {asked > 0 && savedBy > 0 && (
                          <span className="text-emerald-600 font-semibold"> · saves {money(savedBy)}</span>
                        )}
                        {asked > apart && <span className="text-amber-700 font-semibold"> · priced above its parts</span>}
                      </p>
                    );
                  })()}
                </div>
              )}
            </div>
          ) : (
            <>
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
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Pricing</label>
              <select className="form-input" value={form.pricing_mode}
                onChange={e => set('pricing_mode', e.target.value === 'open' ? 'open' : 'fixed')}>
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

          {/* Where it can be reached. Both on by default, because that is what
              everything already on the list has been doing. */}
          <div className="border-t border-gray-100 pt-3 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Where it&apos;s offered</p>
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input type="checkbox" className="mt-0.5" checked={form.sell_online}
                onChange={e => set('sell_online', e.target.checked)} />
              <span>
                <span className="text-sm font-medium text-gray-800">Sell it on the online store</span>
                <span className="block text-xs text-gray-400">
                  {form.pricing_mode === 'open'
                    ? 'Quoted work never appears on the store regardless — a customer can’t quote themselves.'
                    : 'Customers can buy it themselves and pay online.'}
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input type="checkbox" className="mt-0.5" checked={form.requestable}
                onChange={e => set('requestable', e.target.checked)} />
              <span>
                <span className="text-sm font-medium text-gray-800">Clients can request it</span>
                <span className="block text-xs text-gray-400">
                  It appears on the request page clients send work in through. Turn off for anything
                  sold face to face or quoted first.
                </span>
              </span>
            </label>
            {!form.sell_online && !form.requestable && (
              <p className="text-xs text-amber-700">
                With both off, only staff can add this — at the till or on an order.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Category <span className="text-gray-400 font-normal">(optional)</span></label>
              <select className="form-input" value={form.category_id} onChange={e => set('category_id', e.target.value)}>
                <option value="">None</option>
                {categories
                  .filter(c => (isSolution ? true : c.scope === 'service'))
                  .map(c => <option key={c.id || c._id} value={c.id || c._id}>{c.name}</option>)}
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
              {saving ? 'Saving…' : modal === 'edit' ? 'Save changes' : `Add ${noun}`}
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
