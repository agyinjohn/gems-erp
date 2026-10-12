'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { toast, ConfirmDialog, Modal } from '@/components/ui';
import {
  Plus, Briefcase, Pencil, Trash2, FileText, ChevronDown, ChevronLeft, ChevronRight,
  Search, PlayCircle, CheckCircle2, CalendarDays, AlertCircle,
} from 'lucide-react';
import JobForm, { JOB_TYPES, EMPTY_FORM, EMPTY_ITEM, type JobFormState, type ItemRow } from '@/components/jobs/JobForm';

type ViewKey = 'day' | 'upcoming' | 'all';
const STATUSES = ['open', 'in_progress', 'done'] as const;

const STATUS_CHIP: Record<string, string> = {
  open:        'bg-gray-100 text-gray-600',
  in_progress: 'bg-[#0D3B6E]/8 text-[#0D3B6E]',
  done:        'bg-gray-100 text-gray-700',
  invoiced:    'bg-gray-100 text-gray-500',
};

const label = (s: string) => (s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
const money = (n: number) => `GHS ${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Calendar days in the viewer's own timezone, as 'YYYY-MM-DD'.
const localDay = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fromDay = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const shiftDay = (s: string, n: number) => { const d = fromDay(s); d.setDate(d.getDate() + n); return localDay(d); };
const dueDay = (iso?: string | null) => (iso ? String(iso).slice(0, 10) : '');
const prettyDay = (s: string) => {
  const today = localDay();
  if (s === today) return 'Today';
  if (s === shiftDay(today, 1)) return 'Tomorrow';
  if (s === shiftDay(today, -1)) return 'Yesterday';
  return fromDay(s).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
};
const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?';

interface JobItem { description: string; quantity: number; unit_price: number; total: number }
interface Job {
  id: string; code: string; title: string; description?: string;
  customer_id?: string | null; customer_name?: string; walk_in_name?: string; walk_in_phone?: string;
  job_type: string; status: string;
  assigned_to?: { _id?: string; id?: string; name?: string } | string | null; assigned_name?: string;
  due_date?: string; notes?: string;
  items: JobItem[];
  invoice_id?: { invoice_number: string; status: string } | null;
  createdAt: string;
}

const jobTotal = (j: Job) => j.items.reduce((s, i) => s + (i.total || 0), 0);
const isOpen = (j: Job) => j.status === 'open' || j.status === 'in_progress';

export default function JobsPage() {
  const { user } = useAuth();
  const canManage = ['platform_admin', 'business_owner', 'branch_manager', 'sales_staff', 'accountant'].includes(user?.role || '');
  const isOwner = ['platform_admin', 'business_owner'].includes(user?.role || '');

  const [rows, setRows] = useState<Job[]>([]);
  const [customers, setCustomers] = useState<{ id: string; name: string; company?: string }[]>([]);
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewKey>('day');
  const [date, setDate] = useState(localDay());
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const [modal, setModal] = useState<{ mode: 'new' | 'edit'; job?: Job } | null>(null);
  const [form, setForm] = useState<JobFormState>(EMPTY_FORM);
  const [items, setItems] = useState<ItemRow[]>([{ ...EMPTY_ITEM }]);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<{ title: string; message: string; danger?: boolean; run: () => void } | null>(null);

  const today = localDay();
  const isToday = date === today;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (view === 'day') {
        params.date = date;
        params.tz = String(-new Date().getTimezoneOffset());
        // Today also carries forward anything unfinished from earlier days.
        if (date === localDay()) params.carryover = 'true';
      }
      if (view === 'upcoming') params.after = localDay();
      if (typeFilter) params.job_type = typeFilter;
      if (search.trim()) params.search = search.trim();
      const r = await api.get('/jobs', { params });
      setRows(r.data.data || []);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not load jobs');
    } finally { setLoading(false); }
  }, [view, date, typeFilter, search]);

  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [load]);
  useEffect(() => {
    api.get('/customers').then(r => setCustomers(r.data.data || [])).catch(() => {});
    // The full staff list needs HR; without it, fall back to the people this
    // user may hand work to.
    api.get('/employees')
      .then(r => setEmployees((r.data.data || []).filter((e: { status?: string }) => e.status !== 'terminated')))
      .catch(() => api.get('/tasks/assignable').then(r => setEmployees(r.data.data || [])).catch(() => {}));
  }, []);

  // ── Create / edit ───────────────────────────────────────────────────────────
  const openNew = () => {
    setForm({ ...EMPTY_FORM, due_date: view === 'day' ? date : '' });
    setItems([{ ...EMPTY_ITEM }]);
    setModal({ mode: 'new' });
  };
  const openEdit = (j: Job) => {
    const assignee = typeof j.assigned_to === 'object' && j.assigned_to ? (j.assigned_to._id || j.assigned_to.id || '') : (j.assigned_to || '');
    setForm({
      title: j.title, description: j.description || '',
      customer_id: j.customer_id ? String(j.customer_id) : '', job_type: j.job_type,
      assigned_to: String(assignee), due_date: dueDay(j.due_date), notes: j.notes || '',
      walk_in_name: j.walk_in_name || '', walk_in_phone: j.walk_in_phone || '',
      is_walk_in: !!j.walk_in_name,
    });
    setItems(j.items.length
      ? j.items.map(i => ({ description: i.description, quantity: String(i.quantity), unit_price: String(i.unit_price) }))
      : [{ ...EMPTY_ITEM }]);
    setModal({ mode: 'edit', job: j });
  };

  const save = async () => {
    if (!form.title.trim()) return toast.error('Give the job a title');
    if (form.is_walk_in && !form.walk_in_name.trim()) return toast.error("Add the walk-in client's name");
    setSaving(true);
    const body = {
      ...form,
      customer_id: form.is_walk_in ? '' : form.customer_id,
      walk_in_name: form.is_walk_in ? form.walk_in_name : '',
      walk_in_phone: form.is_walk_in ? form.walk_in_phone : '',
      assigned_to: form.assigned_to,
      due_date: form.due_date || null,
      items: items.filter(i => i.description.trim()).map(i => ({
        description: i.description.trim(),
        quantity: parseFloat(i.quantity) || 1,
        unit_price: parseFloat(i.unit_price) || 0,
      })),
    };
    try {
      if (modal?.mode === 'edit' && modal.job) await api.put(`/jobs/${modal.job.id}`, body);
      else await api.post('/jobs', { ...body, customer_id: body.customer_id || undefined, assigned_to: body.assigned_to || undefined, due_date: body.due_date || undefined });
      toast.success(modal?.mode === 'edit' ? 'Job updated' : 'Job created');
      // A new job dated for another day would vanish from this list — follow it.
      if (modal?.mode === 'new' && view === 'day' && form.due_date && form.due_date !== date) setDate(form.due_date);
      setModal(null);
      await load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not save the job');
    } finally { setSaving(false); }
  };

  const moveTo = async (j: Job, status: string) => {
    setRows(list => list.map(x => (x.id === j.id ? { ...x, status } : x)));
    try { await api.put(`/jobs/${j.id}`, { status }); }
    catch (e: any) { toast.error(e.response?.data?.message || 'Could not update status'); await load(); }
  };

  const invoiceJob = (j: Job) => setConfirm({
    title: `Invoice ${j.code}?`,
    message: `This raises an invoice for ${money(jobTotal(j))} and marks the job as invoiced.`,
    run: async () => {
      try {
        const r = await api.post(`/jobs/${j.id}/invoice`);
        toast.success(`${r.data.data.invoice.invoice_number} raised`);
        await load();
      } catch (e: any) { toast.error(e.response?.data?.message || 'Could not invoice'); }
    },
  });

  const deleteJob = (j: Job) => setConfirm({
    title: `Delete ${j.code}?`,
    message: `"${j.title}" will be permanently deleted.`,
    danger: true,
    run: async () => {
      try { await api.delete(`/jobs/${j.id}`); toast.success('Job deleted'); await load(); }
      catch (e: any) { toast.error(e.response?.data?.message || 'Could not delete'); }
    },
  });

  // ── Grouping ────────────────────────────────────────────────────────────────
  const overdue = (j: Job) => isOpen(j) && !!j.due_date && dueDay(j.due_date) < today;
  const groups = useMemo(() => {
    if (view === 'day') {
      const carried = rows.filter(j => j.due_date && dueDay(j.due_date) < date);
      const due = rows.filter(j => j.due_date && dueDay(j.due_date) === date);
      const undated = rows.filter(j => !j.due_date);
      return [
        { key: 'over', title: 'Overdue', tone: 'red', jobs: carried },
        { key: 'due', title: `Due ${isToday ? 'today' : prettyDay(date)}`, jobs: due },
        { key: 'none', title: isToday ? 'No due date' : 'Booked in, no due date', jobs: undated },
      ].filter(g => g.jobs.length);
    }
    if (view === 'upcoming') {
      const byDay = new Map<string, Job[]>();
      rows.forEach(j => { const d = dueDay(j.due_date); byDay.set(d, [...(byDay.get(d) || []), j]); });
      return [...byDay.entries()].map(([d, jobs]) => ({ key: d, title: prettyDay(d), jobs }));
    }
    return [{ key: 'all', title: 'All jobs', jobs: rows }];
  }, [rows, view, date, isToday]);

  const stats = {
    total: rows.length,
    wip: rows.filter(j => j.status === 'in_progress').length,
    done: rows.filter(j => j.status === 'done' || j.status === 'invoiced').length,
    value: rows.reduce((s, j) => s + jobTotal(j), 0),
  };

  return (
    <AppLayout
      title="Jobs"
      subtitle="Customer work, from a day's printing to a piece that runs for weeks"
      allowedRoles={['platform_admin', 'business_owner', 'branch_manager', 'sales_staff', 'accountant']}
    >
      <div className="max-w-6xl mx-auto space-y-4">

        {/* Views + date + actions */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex flex-wrap items-center gap-2">
          <div className="inline-flex bg-gray-100 rounded-lg p-0.5">
            {([['day', 'By day'], ['upcoming', 'Upcoming'], ['all', 'All']] as const).map(([k, l]) => (
              <button key={k} type="button" onClick={() => setView(k)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${view === k ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                {l}
              </button>
            ))}
          </div>

          {view === 'day' && (
            <div className="flex items-center gap-1">
              <button type="button" className="btn-icon" onClick={() => setDate(shiftDay(date, -1))} aria-label="Previous day"><ChevronLeft className="w-4 h-4" /></button>
              <label className="relative inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-800 cursor-pointer hover:border-gray-300 min-w-[150px] justify-center">
                <CalendarDays className="w-4 h-4 text-gray-400" />
                {prettyDay(date)}
                {!isToday && <span className="text-gray-400 font-normal">{fromDay(date).getFullYear() !== new Date().getFullYear() ? fromDay(date).getFullYear() : ''}</span>}
                <input type="date" value={date} onChange={e => e.target.value && setDate(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer" aria-label="Pick a date" />
              </label>
              <button type="button" className="btn-icon" onClick={() => setDate(shiftDay(date, 1))} aria-label="Next day"><ChevronRight className="w-4 h-4" /></button>
              {!isToday && <button type="button" className="text-xs font-semibold text-[#0D3B6E] px-2 hover:underline" onClick={() => setDate(today)}>Today</button>}
            </div>
          )}

          <div className="relative flex-1 min-w-[160px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="form-input pl-9 !py-1.5 text-sm" placeholder="Code, title or customer…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-input !w-auto !py-1.5 text-sm" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">All types</option>
            {JOB_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
          {canManage && (
            <button type="button" className="btn-primary !bg-[#0D3B6E] hover:!bg-[#0a2f58]" onClick={openNew}>
              <Plus className="w-4 h-4" /> New job
            </button>
          )}
        </div>

        {/* Summary for what's on screen */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { l: 'Jobs', v: String(stats.total) },
            { l: 'In progress', v: String(stats.wip) },
            { l: 'Done', v: String(stats.done) },
            { l: 'Value', v: money(stats.value) },
          ].map(s => (
            <div key={s.l} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
              <div className="text-xs text-gray-500">{s.l}</div>
              <div className="text-xl font-extrabold text-gray-900 mt-0.5 truncate">{s.v}</div>
            </div>
          ))}
        </div>

        {/* List */}
        {loading && !rows.length ? (
          <div className="space-y-2">{[0, 1, 2, 3].map(i => <div key={i} className="h-16 bg-white rounded-xl border border-gray-100 animate-pulse" />)}</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
            <div className="w-12 h-12 rounded-2xl bg-[#0D3B6E]/5 text-[#0D3B6E] flex items-center justify-center mx-auto mb-3"><Briefcase className="w-6 h-6" /></div>
            <p className="font-semibold text-gray-800">
              {search.trim() ? 'Nothing matches that' : view === 'day' ? `No jobs for ${isToday ? 'today' : prettyDay(date)}` : view === 'upcoming' ? 'Nothing scheduled ahead' : 'No jobs yet'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {view === 'day' ? 'Jobs due on this day, or booked in on it without a due date, show here.' : 'Create a job, or accept a service request to raise one.'}
            </p>
            {canManage && <button type="button" className="btn-secondary mt-4" onClick={openNew}><Plus className="w-4 h-4" /> New job</button>}
          </div>
        ) : (
          <div className="space-y-5">
            {groups.map(g => (
              <section key={g.key}>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className={`text-xs font-bold uppercase tracking-wider ${'tone' in g && g.tone === 'red' ? 'text-red-600' : 'text-gray-500'}`}>{g.title}</h3>
                  <span className="text-xs text-gray-400">{g.jobs.length}</span>
                  <span className="flex-1 h-px bg-gray-100" />
                </div>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-100 overflow-hidden">
                  {g.jobs.map(j => (
                    <JobRow key={j.id} job={j} open={expanded === j.id} overdue={overdue(j)} showDue={view !== 'upcoming'}
                      canManage={canManage} isOwner={isOwner}
                      onToggle={() => setExpanded(expanded === j.id ? null : j.id)}
                      onMove={s => moveTo(j, s)} onEdit={() => openEdit(j)} onInvoice={() => invoiceJob(j)} onDelete={() => deleteJob(j)} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'edit' ? `Edit ${modal.job?.code}` : 'New job'} size="lg">
        <JobForm form={form} setForm={setForm} items={items} setItems={setItems} customers={customers} employees={employees} />
        <div className="flex gap-2 justify-end mt-6 pt-4 border-t border-gray-100">
          <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
          <button type="button" className="btn-primary !bg-[#0D3B6E] hover:!bg-[#0a2f58]" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : modal?.mode === 'edit' ? 'Save changes' : 'Create job'}
          </button>
        </div>
      </Modal>

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

function JobRow({ job: j, open, overdue, showDue, canManage, isOwner, onToggle, onMove, onEdit, onInvoice, onDelete }: {
  job: Job; open: boolean; overdue: boolean; showDue: boolean; canManage: boolean; isOwner: boolean;
  onToggle: () => void; onMove: (s: string) => void; onEdit: () => void; onInvoice: () => void; onDelete: () => void;
}) {
  const total = jobTotal(j);
  const who = j.walk_in_name || j.customer_name;
  const typeLabel = JOB_TYPES.find(t => t.key === j.job_type)?.label || label(j.job_type);
  const finished = j.status === 'done' || j.status === 'invoiced';

  // The one obvious next step for this job.
  const next = !canManage ? null
    : j.status === 'open' ? { label: 'Start', icon: PlayCircle, run: () => onMove('in_progress'), primary: false }
    : j.status === 'in_progress' ? { label: 'Mark done', icon: CheckCircle2, run: () => onMove('done'), primary: true }
    : j.status === 'done' && !j.invoice_id ? { label: 'Invoice', icon: FileText, run: onInvoice, primary: true }
    : null;

  return (
    <div>
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/70 transition-colors">
        <button type="button" onClick={onToggle} className="flex-1 min-w-0 text-left flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className={`font-semibold text-sm truncate ${finished ? 'text-gray-500' : 'text-gray-900'}`}>{j.title}</span>
              <span className={`hidden sm:inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-md ${STATUS_CHIP[j.status] || STATUS_CHIP.open}`}>
                {j.status === 'invoiced' && j.invoice_id ? j.invoice_id.invoice_number : label(j.status)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-500 min-w-0 overflow-hidden">
              <span className="font-mono text-gray-400 whitespace-nowrap flex-shrink-0">{j.code}</span>
              <span className="hidden sm:inline">·</span><span className="hidden sm:inline whitespace-nowrap">{typeLabel}</span>
              {who && <><span>·</span><span className="truncate">{who}</span></>}
              {showDue && j.due_date && (
                <span className={`sm:hidden whitespace-nowrap ${overdue ? 'text-red-600 font-semibold' : ''}`}>· {prettyDay(dueDay(j.due_date))}</span>
              )}
            </div>
          </div>
        </button>

        <div className="hidden md:flex items-center gap-1.5 w-36 text-xs text-gray-600" title={j.assigned_name ? `Assigned to ${j.assigned_name}` : 'Unassigned'}>
          {j.assigned_name ? (
            <><span className="w-6 h-6 rounded-full bg-[#0D3B6E] text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0">{initials(j.assigned_name)}</span><span className="truncate">{j.assigned_name}</span></>
          ) : <span className="text-gray-400">Unassigned</span>}
        </div>

        {showDue && (
          <div className={`hidden sm:block w-24 text-xs text-right ${overdue ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
            {j.due_date ? <span className="inline-flex items-center gap-1">{overdue && <AlertCircle className="w-3 h-3" />}{prettyDay(dueDay(j.due_date))}</span> : <span className="text-gray-300">No date</span>}
          </div>
        )}

        <div className="w-28 text-right text-sm font-bold text-gray-900 hidden sm:block">{total > 0 ? money(total) : <span className="text-gray-300 font-normal">—</span>}</div>

        <div className="sm:w-28 flex justify-end flex-shrink-0">
          {next ? (
            <button type="button" onClick={next.run}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap ${
                next.primary ? 'bg-[#0D3B6E] text-white hover:bg-[#0a2f58]' : 'text-[#0D3B6E] bg-[#0D3B6E]/5 hover:bg-[#0D3B6E]/10'
              }`}>
              <next.icon className="w-3.5 h-3.5" />{next.label}
            </button>
          ) : (
            <span className="text-xs text-gray-400">{label(j.status)}</span>
          )}
        </div>
        <button type="button" onClick={onToggle} className="btn-icon !p-1" aria-label={open ? 'Hide details' : 'Show details'}>
          <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {open && (
        <div className="px-4 pb-4 pt-1 bg-gray-50/50 border-t border-gray-100 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm pt-3">
            <Fact k="Client" v={who ? `${who}${j.walk_in_phone ? ` · ${j.walk_in_phone}` : ''}` : '—'} />
            <Fact k="Assigned to" v={j.assigned_name || 'Unassigned'} />
            <Fact k="Due" v={j.due_date ? fromDay(dueDay(j.due_date)).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'No due date'} />
            <Fact k="Booked in" v={new Date(j.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })} />
          </div>

          {j.items.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
              {j.items.map((i, n) => (
                <div key={n} className="flex justify-between gap-3 px-3 py-2 text-sm border-b border-gray-50 last:border-0">
                  <span className="text-gray-700">{i.quantity} × {i.description}</span>
                  <span className="text-gray-900 font-medium">{money(i.total)}</span>
                </div>
              ))}
              <div className="flex justify-between px-3 py-2 text-sm font-bold bg-gray-50"><span>Total</span><span>{money(total)}</span></div>
            </div>
          )}

          {j.notes && <p className="text-sm text-gray-600 whitespace-pre-wrap"><span className="font-semibold text-gray-700">Notes: </span>{j.notes}</p>}

          {canManage && (
            <div className="flex flex-wrap items-center gap-2">
              {j.status !== 'invoiced' && (
                <>
                  <span className="text-xs text-gray-500">Status</span>
                  <div className="inline-flex bg-white border border-gray-200 rounded-lg p-0.5">
                    {STATUSES.map(s => (
                      <button key={s} type="button" onClick={() => onMove(s)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium ${j.status === s ? 'bg-[#0D3B6E] text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                        {label(s)}
                      </button>
                    ))}
                  </div>
                  <button type="button" className="btn-secondary text-xs !py-1.5 ml-auto" onClick={onEdit}><Pencil className="w-3.5 h-3.5" /> Edit</button>
                </>
              )}
              {isOwner && j.status !== 'invoiced' && (
                <button type="button" className="btn-ghost text-xs !py-1.5 !text-red-600" onClick={onDelete}><Trash2 className="w-3.5 h-3.5" /> Delete</button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] uppercase tracking-wide font-semibold text-gray-400">{k}</div>
      <div className="text-gray-800 truncate">{v}</div>
    </div>
  );
}
