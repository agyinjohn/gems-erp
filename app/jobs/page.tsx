'use client';
import { useCallback, useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { toast, ConfirmDialog } from '@/components/ui';
import {
  Plus, RefreshCw, Briefcase, X, Pencil, Trash2, Check, FileText, ChevronDown, ChevronUp, Search,
} from 'lucide-react';

const JOB_TYPES = [
  { key: 'printing',     label: 'Printing' },
  { key: 'design',       label: 'Design' },
  { key: 'repair',       label: 'Repair' },
  { key: 'installation', label: 'Installation' },
  { key: 'professional', label: 'Professional' },
  { key: 'general',      label: 'General' },
];

const STATUSES = ['open', 'in_progress', 'done', 'invoiced'];

type ViewKey = 'today' | 'scheduled' | 'all';
const VIEWS: { key: ViewKey; label: string; hint: string }[] = [
  { key: 'today',     label: 'Today',     hint: 'Due today, overdue, or with no due date — counter work' },
  { key: 'scheduled', label: 'Scheduled', hint: 'Due further out — work that runs over days' },
  { key: 'all',       label: 'All',       hint: 'Everything, including done and invoiced' },
];

/** Midnight tonight — anything due before it is today's problem. */
const endOfToday = () => { const d = new Date(); d.setHours(23, 59, 59, 999); return d; };

/**
 * A job belongs to today if it is due today, overdue, or carries no due date
 * at all. The last case is the important one: nobody types a due date on a
 * walk-in print run they mean to hand over the same afternoon.
 */
const isForToday = (j: Job) => !j.due_date || new Date(j.due_date) <= endOfToday();
const isOverdue  = (j: Job) =>
  !!j.due_date && new Date(j.due_date) < new Date(new Date().setHours(0, 0, 0, 0))
  && j.status !== 'done' && j.status !== 'invoiced';

const STATUS_STYLE: Record<string, string> = {
  open:        'bg-gray-100 text-gray-600',
  in_progress: 'bg-[#0D3B6E]/10 text-[#0D3B6E]',
  done:        'bg-green-50 text-green-700',
  invoiced:    'bg-blue-50 text-blue-700',
};

const label = (s: string) => (s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
const money = (n: number) =>
  `GHS ${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dateVal = (d?: string | null) => (d ? String(d).slice(0, 10) : '');

interface JobItem { description: string; quantity: number; unit_price: number; total: number; }
interface Job {
  id: string; code: string; title: string; description?: string;
  customer_name?: string; walk_in_name?: string; walk_in_phone?: string;
  job_type: string; status: string;
  assigned_name?: string; due_date?: string; notes?: string;
  items: JobItem[];
  invoice_id?: { invoice_number: string; status: string } | null;
  createdAt: string;
}

const EMPTY_FORM = {
  title: '', description: '', customer_id: '', job_type: 'general',
  assigned_to: '', due_date: '', notes: '',
  walk_in_name: '', walk_in_phone: '', is_walk_in: false,
};
const EMPTY_ITEM = { description: '', quantity: '1', unit_price: '' };

export default function JobsPage() {
  const { user } = useAuth();
  const canManage = ['platform_admin', 'business_owner', 'branch_manager', 'sales_staff', 'accountant'].includes(user?.role || '');
  const isOwner   = ['platform_admin', 'business_owner'].includes(user?.role || '');

  const [rows,       setRows]      = useState<Job[]>([]);
  const [customers,  setCustomers] = useState<{ id: string; name: string; company?: string }[]>([]);
  const [employees,  setEmployees] = useState<{ id: string; name: string }[]>([]);
  const [loading,    setLoading]   = useState(true);
  const [view,       setView]      = useState<ViewKey>('today');
  const [typeFilter, setTypeFilter] = useState('');
  const [search,     setSearch]    = useState('');
  const [expanded,   setExpanded]  = useState<string | null>(null);
  const [showAdd,    setShowAdd]   = useState(false);
  const [editId,     setEditId]    = useState<string | null>(null);
  const [saving,     setSaving]    = useState(false);
  const [form,       setForm]      = useState(EMPTY_FORM);
  const [items,      setItems]     = useState([{ ...EMPTY_ITEM }]);
  const [editForm,   setEditForm]  = useState(EMPTY_FORM);
  const [editItems,  setEditItems] = useState([{ ...EMPTY_ITEM }]);
  const [confirm,    setConfirm]   = useState<{ title: string; message: string; danger?: boolean; run: () => void } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      // Today and Scheduled are two cuts of live work; All is the archive.
      if (view !== 'all')  params.open     = 'true';
      if (typeFilter)      params.job_type = typeFilter;
      if (search.trim())   params.search   = search.trim();
      const r = await api.get('/jobs', { params });
      setRows(r.data.data || []);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not load jobs');
    } finally { setLoading(false); }
  }, [view, typeFilter, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.get('/customers').then(r => setCustomers(r.data.data || [])).catch(() => {});
    api.get('/hr/employees').then(r => setEmployees(r.data.data || [])).catch(() => {});
  }, []);

  // ── Item helpers ────────────────────────────────────────────────────────────
  const updateItem = (arr: typeof items, setArr: typeof setItems, i: number, k: string, v: string) =>
    setArr(arr.map((row, idx) => idx === i ? { ...row, [k]: v } : row));
  const addItem    = (arr: typeof items, setArr: typeof setItems) =>
    setArr([...arr, { ...EMPTY_ITEM }]);
  const dropItem   = (arr: typeof items, setArr: typeof setItems, i: number) =>
    setArr(arr.filter((_, idx) => idx !== i));
  const buildLines = (arr: typeof items) =>
    arr.filter(i => i.description.trim()).map(i => ({
      description: i.description.trim(),
      quantity:    parseFloat(i.quantity)   || 1,
      unit_price:  parseFloat(i.unit_price) || 0,
    }));
  const previewTotal = (arr: typeof items) =>
    arr.reduce((s, i) => s + (parseFloat(i.quantity) || 1) * (parseFloat(i.unit_price) || 0), 0);

  // ── Create ──────────────────────────────────────────────────────────────────
  const create = async () => {
    if (!form.title.trim()) return toast.error('Title is required');
    setSaving(true);
    try {
      await api.post('/jobs', {
        ...form,
        customer_id:   form.is_walk_in ? undefined : (form.customer_id || undefined),
        walk_in_name:  form.is_walk_in ? (form.walk_in_name  || undefined) : undefined,
        walk_in_phone: form.is_walk_in ? (form.walk_in_phone || undefined) : undefined,
        assigned_to:   form.assigned_to || undefined,
        due_date:      form.due_date    || undefined,
        items: buildLines(items),
      });
      toast.success('Job created');
      setShowAdd(false);
      setForm(EMPTY_FORM);
      setItems([{ ...EMPTY_ITEM }]);
      await load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not create job');
    } finally { setSaving(false); }
  };

  // ── Edit ────────────────────────────────────────────────────────────────────
  const openEdit = (j: Job) => {
    setEditId(j.id);
    setEditForm({
      title: j.title, description: j.description || '',
      customer_id: '', job_type: j.job_type,
      assigned_to: '', due_date: dateVal(j.due_date), notes: j.notes || '',
      walk_in_name: j.walk_in_name || '', walk_in_phone: j.walk_in_phone || '',
      is_walk_in: !!j.walk_in_name,
    });
    setEditItems(j.items.length
      ? j.items.map(i => ({ description: i.description, quantity: String(i.quantity), unit_price: String(i.unit_price) }))
      : [{ ...EMPTY_ITEM }]);
  };

  const saveEdit = async (j: Job) => {
    if (!editForm.title.trim()) return toast.error('Title is required');
    setSaving(true);
    try {
      await api.put(`/jobs/${j.id}`, {
        ...editForm,
        customer_id:   editForm.is_walk_in ? undefined : (editForm.customer_id || undefined),
        walk_in_name:  editForm.is_walk_in ? (editForm.walk_in_name  || undefined) : undefined,
        walk_in_phone: editForm.is_walk_in ? (editForm.walk_in_phone || undefined) : undefined,
        assigned_to:   editForm.assigned_to || undefined,
        due_date:      editForm.due_date    || undefined,
        items: buildLines(editItems),
      });
      toast.success('Job updated');
      setEditId(null);
      await load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not update');
    } finally { setSaving(false); }
  };

  // ── Status ──────────────────────────────────────────────────────────────────
  const moveTo = async (j: Job, status: string) => {
    try {
      await api.put(`/jobs/${j.id}`, { status });
      await load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Could not update status'); }
  };

  // ── Invoice ─────────────────────────────────────────────────────────────────
  const invoiceJob = (j: Job) => setConfirm({
    title: `Invoice ${j.code}?`,
    message: `This will raise an invoice for ${money(j.items.reduce((s, i) => s + i.total, 0))} and mark the job as invoiced.`,
    run: async () => {
      try {
        const r = await api.post(`/jobs/${j.id}/invoice`);
        toast.success(`${r.data.data.invoice.invoice_number} raised`);
        await load();
      } catch (e: any) { toast.error(e.response?.data?.message || 'Could not invoice'); }
    },
  });

  // ── Delete ──────────────────────────────────────────────────────────────────
  const deleteJob = (j: Job) => setConfirm({
    title: `Delete ${j.code}?`,
    message: `"${j.title}" will be permanently deleted.`,
    danger: true,
    run: async () => {
      try {
        await api.delete(`/jobs/${j.id}`);
        toast.success('Job deleted');
        await load();
      } catch (e: any) { toast.error(e.response?.data?.message || 'Could not delete'); }
    },
  });

  // What separates counter work from a job that runs for days is when it is
  // due, which the job already records — so the two views are cuts of one list
  // rather than two tables. Work with no due date counts as today's: nobody
  // types a due date on a walk-in print run they intend to hand over at 4pm.
  const visible = view === 'all' ? rows : rows.filter(j => (view === 'today' ? isForToday(j) : !isForToday(j)));

  const open_count = visible.filter(j => j.status === 'open').length;
  const wip_count  = visible.filter(j => j.status === 'in_progress').length;
  const done_count = visible.filter(j => j.status === 'done').length;
  const inv_count  = visible.filter(j => j.status === 'invoiced').length;
  const overdue    = visible.filter(j => isOverdue(j)).length;

  return (
    <AppLayout
      title="Jobs"
      subtitle="Work for customers, from a day's printing to a piece that runs for weeks"
      allowedRoles={['platform_admin', 'business_owner', 'branch_manager', 'sales_staff', 'accountant']}
    >
      <div className="space-y-5">

        {/* Summary strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Open',        value: open_count, tone: open_count ? 'text-gray-900'    : 'text-gray-400' },
            { label: 'In progress', value: wip_count,  tone: wip_count  ? 'text-[#0D3B6E]'  : 'text-gray-400' },
            { label: 'Done',        value: done_count, tone: done_count ? 'text-green-600'   : 'text-gray-400' },
            { label: view === 'all' ? 'Invoiced' : 'Overdue',
              value: view === 'all' ? inv_count : overdue,
              tone: view === 'all' ? 'text-blue-600' : (overdue ? 'text-red-600' : 'text-gray-400') },
          ].map(s => (
            <div key={s.label} className="card">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">{s.label}</p>
              <p className={`text-2xl font-extrabold mt-1 ${s.tone}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl bg-gray-100 p-1">
            {VIEWS.map(v => (
              <button
                key={v.key}
                type="button"
                onClick={() => setView(v.key)}
                title={v.hint}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  view === v.key ? 'bg-white text-[#0D3B6E] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >{v.label}</button>
            ))}
          </div>
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="form-input pl-9 w-full !py-1.5 text-sm"
              placeholder="Job code, title or customer…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select className="form-input !w-auto !py-1.5 text-sm" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">All types</option>
            {JOB_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
          <button type="button" onClick={load} className="btn-secondary" disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          {canManage && (
            <button type="button" className="btn-primary ml-auto" onClick={() => setShowAdd(v => !v)}>
              <Plus className="w-4 h-4" /> New job
            </button>
          )}
        </div>

        {/* New job modal */}
        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowAdd(false); setForm(EMPTY_FORM); setItems([{ ...EMPTY_ITEM }]); }} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
                <div>
                  <h2 className="font-bold text-gray-900 text-base">New job</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Assign a piece of work to staff.</p>
                </div>
                <button type="button" className="btn-icon" onClick={() => { setShowAdd(false); setForm(EMPTY_FORM); setItems([{ ...EMPTY_ITEM }]); }}>
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="px-6 py-5">
                <JobForm
                  form={form} setForm={setForm}
                  items={items} setItems={setItems}
                  customers={customers} employees={employees}
                  updateItem={updateItem} addItem={addItem} dropItem={dropItem}
                  previewTotal={previewTotal}
                />
              </div>
              <div className="flex gap-2 px-6 pb-6 pt-2 border-t border-gray-100">
                <button type="button" className="btn-primary" onClick={create} disabled={saving}>
                  {saving ? 'Creating…' : 'Create job'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => { setShowAdd(false); setForm(EMPTY_FORM); setItems([{ ...EMPTY_ITEM }]); }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* List */}
        {loading && !visible.length ? (
          <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="card animate-pulse h-20" />)}</div>
        ) : visible.length === 0 ? (
          <div className="card text-center py-16">
            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Briefcase className="w-7 h-7 text-gray-300" />
            </div>
            <p className="font-semibold text-gray-700">
              {search.trim() ? 'Nothing matches that'
                : view === 'today' ? 'Nothing due today'
                : view === 'scheduled' ? 'Nothing scheduled ahead'
                : 'No jobs yet'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {search.trim() ? 'Try a job code, a title or a customer name.'
                : view === 'today' ? 'Work with no due date, or due today, lands here.'
                : view === 'scheduled' ? 'Jobs with a due date further out land here.'
                : 'Accepted service requests raise a job automatically, or create one here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {visible.map(j => {
              const isExpanded = expanded === j.id;
              const isEditing  = editId   === j.id;
              const total = j.items.reduce((s, i) => s + i.total, 0);

              return (
                <div key={j.id} className="card !p-0 overflow-hidden">
                  {/* Row header */}
                  <button
                    type="button"
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                    onClick={() => setExpanded(isExpanded ? null : j.id)}
                  >
                    <div className="flex items-start gap-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs text-gray-400">{j.code}</span>
                          <span className={`badge ${STATUS_STYLE[j.status] || STATUS_STYLE.open}`}>{label(j.status)}</span>
                          <span className="text-[10px] uppercase tracking-wide font-semibold text-gray-400">
                            {JOB_TYPES.find(t => t.key === j.job_type)?.label || label(j.job_type)}
                          </span>
                        </div>
                        <p className="font-semibold text-gray-900 text-sm mt-0.5">{j.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {(j.walk_in_name || j.customer_name) && (
                            <span>{j.walk_in_name || j.customer_name}{j.walk_in_phone ? ` · ${j.walk_in_phone}` : ''} · </span>
                          )}
                          {j.assigned_name && <span>→ {j.assigned_name} · </span>}
                          {new Date(j.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {total > 0 && <span className="font-bold text-gray-900 text-sm">{money(total)}</span>}
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </div>
                    </div>
                  </button>

                  {/* Expanded panel */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 px-4 py-4 bg-gray-50/60 space-y-4">
                      {isEditing ? (
                        <>
                          <JobForm
                            form={editForm} setForm={setEditForm}
                            items={editItems} setItems={setEditItems}
                            customers={customers} employees={employees}
                            updateItem={updateItem} addItem={addItem} dropItem={dropItem}
                            previewTotal={previewTotal}
                          />
                          <div className="flex gap-2 pt-2 border-t border-gray-100">
                            <button type="button" className="btn-primary text-sm" onClick={() => saveEdit(j)} disabled={saving}>
                              <Check className="w-4 h-4" /> {saving ? 'Saving…' : 'Save'}
                            </button>
                            <button type="button" className="btn-secondary text-sm" onClick={() => setEditId(null)}>Cancel</button>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Items */}
                          {j.items.length > 0 && (
                            <div>
                              <p className="form-label">Items</p>
                              <div className="space-y-1">
                                {j.items.map((i, n) => (
                                  <div key={n} className="flex justify-between text-sm">
                                    <span className="text-gray-700">{i.quantity} × {i.description}</span>
                                    <span className="font-semibold text-gray-900">{money(i.total)}</span>
                                  </div>
                                ))}
                                <div className="flex justify-between text-sm font-bold border-t border-gray-100 pt-1 mt-1">
                                  <span>Total</span><span>{money(total)}</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {j.notes && (
                            <div>
                              <p className="form-label">Notes</p>
                              <p className="text-sm text-gray-700">{j.notes}</p>
                            </div>
                          )}

                          {/* Invoice badge */}
                          {j.invoice_id && (
                            <div className="flex items-center gap-2 text-sm">
                              <FileText className="w-4 h-4 text-blue-500" />
                              <span className="text-blue-700 font-semibold">{j.invoice_id.invoice_number}</span>
                              <span className="badge bg-blue-50 text-blue-700">{label(j.invoice_id.status)}</span>
                            </div>
                          )}

                          {/* Status buttons */}
                          {j.status !== 'invoiced' && canManage && (
                            <div>
                              <p className="form-label">Move to</p>
                              <div className="flex flex-wrap gap-1.5">
                                {STATUSES.filter(s => s !== j.status && s !== 'invoiced').map(s => (
                                  <button key={s} type="button" onClick={() => moveTo(j, s)}
                                    className="text-xs px-3 py-1.5 rounded-full bg-white ring-1 ring-gray-200 text-gray-600 hover:ring-gray-300 transition-colors">
                                    {label(s)}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Actions */}
                          {canManage && (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {j.status !== 'invoiced' && (
                                <button type="button" className="btn-secondary text-xs !py-1.5" onClick={() => openEdit(j)}>
                                  <Pencil className="w-3.5 h-3.5" /> Edit
                                </button>
                              )}
                              {j.status === 'done' && !j.invoice_id && (
                                <button type="button" className="btn-primary text-xs !py-1.5" onClick={() => invoiceJob(j)}>
                                  <FileText className="w-3.5 h-3.5" /> Invoice
                                </button>
                              )}
                              {isOwner && j.status !== 'invoiced' && (
                                <button type="button" className="btn-secondary text-xs !py-1.5 !text-red-600 hover:!bg-red-50" onClick={() => deleteJob(j)}>
                                  <Trash2 className="w-3.5 h-3.5" /> Delete
                                </button>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => { confirm?.run(); setConfirm(null); }}
        title={confirm?.title || ''}
        message={confirm?.message || ''}
        danger={confirm?.danger}
      />
    </AppLayout>
  );
}

// ── Shared form ───────────────────────────────────────────────────────────────
function JobForm({ form, setForm, items, setItems, customers, employees, updateItem, addItem, dropItem, previewTotal }: {
  form: any; setForm: any; items: any[]; setItems: any;
  customers: any[]; employees: any[];
  updateItem: any; addItem: any; dropItem: any; previewTotal: any;
}) {
  const set   = (k: string, v: string) => setForm((f: any) => ({ ...f, [k]: v }));
  const setBool = (k: string, v: boolean) => setForm((f: any) => ({ ...f, [k]: v }));
  const total = previewTotal(items);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="form-label">Title *</label>
          <input className="form-input" placeholder="e.g. Print 200 flyers" value={form.title} onChange={e => set('title', e.target.value)} />
        </div>
        <div>
          <label className="form-label">Type</label>
          <select className="form-input" value={form.job_type} onChange={e => set('job_type', e.target.value)}>
            {[
              { key: 'printing', label: 'Printing' }, { key: 'design', label: 'Design' },
              { key: 'repair', label: 'Repair' },     { key: 'installation', label: 'Installation' },
              { key: 'professional', label: 'Professional' }, { key: 'general', label: 'General' },
            ].map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        </div>
        {/* Client — toggle between CRM lookup and walk-in */}
        <div className="sm:col-span-2">
          <div className="flex items-center gap-4 mb-2">
            <label className="form-label !mb-0">Client</label>
            <div className="flex rounded-lg overflow-hidden ring-1 ring-gray-200 text-xs">
              <button type="button"
                className={`px-3 py-1 transition-colors ${!form.is_walk_in ? 'bg-[#0D3B6E] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                onClick={() => setBool('is_walk_in', false)}>
                Existing client
              </button>
              <button type="button"
                className={`px-3 py-1 transition-colors ${form.is_walk_in ? 'bg-[#0D3B6E] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                onClick={() => setBool('is_walk_in', true)}>
                Walk-in
              </button>
            </div>
          </div>
          {form.is_walk_in ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input className="form-input" placeholder="Full name *" value={form.walk_in_name} onChange={e => set('walk_in_name', e.target.value)} />
              <input className="form-input" placeholder="Phone number" value={form.walk_in_phone} onChange={e => set('walk_in_phone', e.target.value)} />
            </div>
          ) : (
            <select className="form-input" value={form.customer_id} onChange={e => set('customer_id', e.target.value)}>
              <option value="">Not linked</option>
              {customers.map((c: any) => <option key={c.id} value={c.id}>{c.company || c.name}</option>)}
            </select>
          )}
        </div>
        <div>
          <label className="form-label">Assigned to</label>
          <select className="form-input" value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)}>
            <option value="">Unassigned</option>
            {employees.map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Due date</label>
          <input type="date" className="form-input" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="form-label">Notes</label>
          <textarea rows={2} className="form-input resize-none" value={form.notes} onChange={e => set('notes', e.target.value)} />
        </div>
      </div>

      {/* Line items */}
      <div>
        <p className="form-label">Items</p>
        <div className="space-y-2">
          {items.map((item: any, i: number) => (
            <div key={i} className="grid grid-cols-[1fr_72px_100px_32px] gap-2 items-center">
              <input className="form-input !py-1.5 text-sm" placeholder="Description"
                value={item.description} onChange={e => updateItem(items, setItems, i, 'description', e.target.value)} />
              <input type="number" min={1} className="form-input !py-1.5 text-sm" placeholder="Qty"
                value={item.quantity} onChange={e => updateItem(items, setItems, i, 'quantity', e.target.value)} />
              <input type="number" min={0} className="form-input !py-1.5 text-sm" placeholder="Unit price"
                value={item.unit_price} onChange={e => updateItem(items, setItems, i, 'unit_price', e.target.value)} />
              <button type="button" className="btn-icon" onClick={() => dropItem(items, setItems, i)} disabled={items.length === 1}>
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mt-2">
          <button type="button" className="btn-ghost text-xs" onClick={() => addItem(items, setItems)}>
            <Plus className="w-3.5 h-3.5" /> Add item
          </button>
          {total > 0 && (
            <span className="text-sm font-bold text-gray-900">
              Total: GHS {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
