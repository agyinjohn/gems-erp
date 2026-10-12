'use client';
import { useCallback, useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Modal, EmptyState, Spinner, ConfirmDialog, toast } from '@/components/ui';
import { Plus, Edit2, Trash2, CheckCircle2, Circle, PlayCircle, ClipboardList, Users } from 'lucide-react';
import api from '@/lib/api';
import ResponsiveTable from '@/components/ui/ResponsiveTable';

type Status = 'todo' | 'in_progress' | 'done';
interface Task {
  id: string;
  title: string;
  description?: string;
  status: Status;
  priority: 'low' | 'normal' | 'high';
  due_date: string;
  overdue?: boolean;
  assigned_by_name?: string;
  assignee_id?: string;
  assignee_name?: string;
  completed_at?: string;
  completion_note?: string;
}
interface Person { id: string; name: string; job_title?: string }
interface Tally { assignee_id: string; assignee_name: string; total: number; done: number; overdue: number }

const localDay = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayLabel = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const PRIORITY_STYLE: Record<string, string> = { high: 'bg-red-100 text-red-700', normal: 'bg-gray-100 text-gray-600', low: 'bg-blue-50 text-blue-600' };
const STATUS_LABEL: Record<Status, string> = { todo: 'To do', in_progress: 'In progress', done: 'Done' };
const EMPTY = { title: '', description: '', due_date: localDay(), priority: 'normal', assignee_ids: [] as string[] };

export default function TasksPage() {
  const [tab, setTab] = useState<'mine' | 'team'>('mine');
  const [people, setPeople] = useState<Person[]>([]);

  // ── My tasks ──
  const [date, setDate] = useState(localDay());
  const [mine, setMine] = useState<Task[]>([]);
  const [linked, setLinked] = useState(true);
  const [loadingMine, setLoadingMine] = useState(true);

  // ── Team tasks ──
  const [team, setTeam] = useState<Task[]>([]);
  const [tally, setTally] = useState<Tally[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [from, setFrom] = useState(localDay());
  const [to, setTo] = useState(localDay());
  const [filterPerson, setFilterPerson] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [modal, setModal] = useState<'new' | 'edit' | null>(null);
  const [editing, setEditing] = useState<Task | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Task | null>(null);

  const canAssign = people.length > 0;

  const loadMine = useCallback(async () => {
    setLoadingMine(true);
    try {
      const r = await api.get('/tasks/mine', { params: { date } });
      setMine(r.data.data || []);
      setLinked(r.data.linked !== false);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not load your tasks');
    } finally { setLoadingMine(false); }
  }, [date]);

  const loadTeam = useCallback(async () => {
    setLoadingTeam(true);
    try {
      const params: Record<string, string> = { from, to };
      if (filterPerson) params.assignee_id = filterPerson;
      if (filterStatus) params.status = filterStatus;
      const r = await api.get('/tasks', { params });
      setTeam(r.data.data || []);
      setTally(r.data.summary || []);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not load team tasks');
    } finally { setLoadingTeam(false); }
  }, [from, to, filterPerson, filterStatus]);

  useEffect(() => { api.get('/tasks/assignable').then(r => setPeople(r.data.data || [])).catch(() => {}); }, []);
  useEffect(() => { loadMine(); }, [loadMine]);
  useEffect(() => { if (tab === 'team' && canAssign) loadTeam(); }, [tab, canAssign, loadTeam]);

  const setStatus = async (t: Task, status: Status) => {
    try {
      await api.patch(`/tasks/${t.id}/status`, { status });
      loadMine();
      if (tab === 'team') loadTeam();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Could not update the task'); }
  };

  const openNew = () => { setForm({ ...EMPTY, due_date: localDay() }); setEditing(null); setModal('new'); };
  const openEdit = (t: Task) => {
    setEditing(t);
    setForm({ title: t.title, description: t.description || '', due_date: t.due_date.slice(0, 10), priority: t.priority, assignee_ids: [] });
    setModal('edit');
  };

  const save = async () => {
    if (!form.title.trim()) return toast.error('Give the task a title');
    if (modal === 'new' && form.assignee_ids.length === 0) return toast.error('Choose at least one employee');
    setSaving(true);
    try {
      if (modal === 'edit' && editing) await api.put(`/tasks/${editing.id}`, form);
      else await api.post('/tasks', form);
      toast.success(modal === 'edit' ? 'Task updated' : 'Task assigned');
      setModal(null);
      loadTeam(); loadMine();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Could not save the task'); }
    finally { setSaving(false); }
  };

  const remove = async (t: Task) => {
    try { await api.delete(`/tasks/${t.id}`); toast.success('Task deleted'); loadTeam(); loadMine(); }
    catch (e: any) { toast.error(e.response?.data?.message || 'Could not delete'); }
  };

  const togglePerson = (id: string) =>
    setForm(f => ({ ...f, assignee_ids: f.assignee_ids.includes(id) ? f.assignee_ids.filter(i => i !== id) : [...f.assignee_ids, id] }));

  const doneCount = mine.filter(t => t.status === 'done').length;
  const isToday = date === localDay();

  return (
    <AppLayout title="Tasks" subtitle="Daily work assigned to you and your team">
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <button onClick={() => setTab('mine')} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${tab === 'mine' ? 'bg-[#0D3B6E] text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
          <ClipboardList className="w-4 h-4" /> My tasks
        </button>
        {canAssign && (
          <button onClick={() => setTab('team')} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${tab === 'team' ? 'bg-[#0D3B6E] text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
            <Users className="w-4 h-4" /> Team tasks
          </button>
        )}
        {canAssign && (
          <button className="btn-primary ml-auto" onClick={openNew}><Plus className="w-4 h-4" /> Assign task</button>
        )}
      </div>

      {tab === 'mine' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <input type="date" className="form-input !w-auto" value={date} onChange={e => e.target.value && setDate(e.target.value)} />
            {!isToday && <button className="btn-secondary" onClick={() => setDate(localDay())}>Today</button>}
            {mine.length > 0 && <span className="text-sm text-gray-500">{doneCount} of {mine.length} done</span>}
          </div>
          {mine.length > 0 && (
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 transition-all" style={{ width: `${(doneCount / mine.length) * 100}%` }} />
            </div>
          )}
          {loadingMine ? <Spinner /> : !linked ? (
            <EmptyState message="Your account isn't linked to an employee record, so no tasks can be assigned to you." icon={<ClipboardList className="w-8 h-8 text-gray-300" />} />
          ) : mine.length === 0 ? (
            <EmptyState message={isToday ? 'No tasks for today' : 'No tasks on this day'} icon={<ClipboardList className="w-8 h-8 text-gray-300" />} />
          ) : (
            <div className="space-y-2">
              {mine.map(t => (
                <div key={t.id} className={`card flex items-start gap-3 ${t.status === 'done' ? 'opacity-60' : ''}`}>
                  <button onClick={() => setStatus(t, t.status === 'done' ? 'todo' : 'done')} className="mt-0.5 text-green-600 flex-shrink-0" aria-label={t.status === 'done' ? 'Mark as not done' : 'Mark as done'}>
                    {t.status === 'done' ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6 text-gray-300 hover:text-green-500" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`font-medium text-gray-900 ${t.status === 'done' ? 'line-through' : ''}`}>{t.title}</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold capitalize ${PRIORITY_STYLE[t.priority]}`}>{t.priority}</span>
                      {t.overdue && <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-red-100 text-red-700">Overdue · due {dayLabel(t.due_date)}</span>}
                      {t.status === 'in_progress' && <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-yellow-100 text-yellow-800">In progress</span>}
                    </div>
                    {t.description && <p className="text-sm text-gray-500 mt-1 whitespace-pre-wrap">{t.description}</p>}
                    {t.assigned_by_name && <p className="text-xs text-gray-400 mt-1">Assigned by {t.assigned_by_name}</p>}
                  </div>
                  {t.status === 'todo' && (
                    <button onClick={() => setStatus(t, 'in_progress')} className="btn-secondary flex-shrink-0"><PlayCircle className="w-4 h-4" /> Start</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'team' && canAssign && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <input type="date" className="form-input !w-auto" value={from} onChange={e => e.target.value && setFrom(e.target.value)} aria-label="From" />
            <span className="text-gray-400 text-sm">to</span>
            <input type="date" className="form-input !w-auto" value={to} onChange={e => e.target.value && setTo(e.target.value)} aria-label="To" />
            <select className="form-input !w-auto" value={filterPerson} onChange={e => setFilterPerson(e.target.value)}>
              <option value="">All employees</option>
              {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select className="form-input !w-auto" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">Any status</option>
              {(Object.keys(STATUS_LABEL) as Status[]).map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </div>

          {tally.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {tally.map(t => (
                <button key={t.assignee_id} onClick={() => setFilterPerson(filterPerson === t.assignee_id ? '' : t.assignee_id)}
                  className={`card text-left ${filterPerson === t.assignee_id ? 'ring-2 ring-[#0D3B6E]' : ''}`}>
                  <div className="font-semibold text-gray-900 truncate">{t.assignee_name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{t.done} of {t.total} done{t.overdue > 0 && <span className="text-red-600 font-semibold"> · {t.overdue} overdue</span>}</div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-2">
                    <div className="h-full bg-green-500" style={{ width: `${t.total ? (t.done / t.total) * 100 : 0}%` }} />
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="card p-0 overflow-hidden">
            {loadingTeam ? <Spinner /> : team.length === 0 ? (
              <EmptyState message="No tasks in this period" icon={<ClipboardList className="w-8 h-8 text-gray-300" />} />
            ) : (
              <ResponsiveTable
                headers={['Task', 'Employee', 'Due', 'Priority', 'Status', 'Actions']}
                data={team}
                renderRow={(t: Task) => [
                  <div><div className="font-medium">{t.title}</div>{t.description && <div className="text-xs text-gray-400 truncate max-w-xs">{t.description}</div>}</div>,
                  <span>{t.assignee_name}</span>,
                  <span className={t.overdue ? 'text-red-600 font-medium' : 'text-gray-500'}>{dayLabel(t.due_date)}</span>,
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold capitalize ${PRIORITY_STYLE[t.priority]}`}>{t.priority}</span>,
                  <span className={`text-xs font-medium ${t.status === 'done' ? 'text-green-600' : t.status === 'in_progress' ? 'text-yellow-700' : 'text-gray-500'}`}>{STATUS_LABEL[t.status]}{t.completed_at && ` · ${new Date(t.completed_at).toLocaleString()}`}</span>,
                  <div className="flex gap-1 justify-end">
                    <button title="Edit" onClick={() => openEdit(t)} className="p-1.5 hover:bg-gray-100 rounded text-[#0D3B6E]"><Edit2 className="w-4 h-4" /></button>
                    <button title="Delete" onClick={() => setConfirmDelete(t)} className="p-1.5 hover:bg-red-50 rounded text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>,
                ]}
              />
            )}
          </div>
        </div>
      )}

      <Modal open={modal !== null} onClose={() => setModal(null)} title={modal === 'edit' ? 'Edit task' : 'Assign task'} size="md">
        <div className="space-y-3">
          <div><label className="form-label">Title *</label><input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
          <div><label className="form-label">Details</label><textarea rows={3} className="form-input resize-none" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="form-label">Due date *</label><input type="date" className="form-input" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} /></div>
            <div>
              <label className="form-label">Priority</label>
              <select className="form-input" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option>
              </select>
            </div>
          </div>
          {modal === 'new' && (
            <div>
              <label className="form-label">Assign to *</label>
              <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto divide-y divide-gray-50">
                {people.map(p => (
                  <label key={p.id} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-gray-50">
                    <input type="checkbox" className="w-4 h-4" checked={form.assignee_ids.includes(p.id)} onChange={() => togglePerson(p.id)} />
                    <span className="text-sm">{p.name}{p.job_title && <span className="text-gray-400"> — {p.job_title}</span>}</span>
                  </label>
                ))}
              </div>
              <p className="form-hint">{form.assignee_ids.length} selected — each person gets their own copy to tick off.</p>
            </div>
          )}
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : modal === 'edit' ? 'Save' : 'Assign'}</button>
        </div>
      </Modal>

      <ConfirmDialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} onConfirm={() => confirmDelete && remove(confirmDelete)}
        title="Delete task" message={`Delete "${confirmDelete?.title}"?`} danger />
    </AppLayout>
  );
}
