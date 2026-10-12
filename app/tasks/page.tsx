'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { ConfirmDialog, toast } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import {
  Plus, Edit2, Trash2, ClipboardList, Users, CheckCircle2, AlertCircle, ChevronDown,
  ListTodo, Loader, CalendarRange, Sparkles, Link2Off,
} from 'lucide-react';
import TaskCard from '@/components/tasks/TaskCard';
import WeekStrip from '@/components/tasks/WeekStrip';
import ProgressRing from '@/components/tasks/ProgressRing';
import AssignTaskModal, { type TaskForm } from '@/components/tasks/AssignTaskModal';
import {
  type Task, type Status, type Person, type Tally,
  localDay, addDays, fromDay, dueLabel, initials, avatarColor, greeting, PRIORITY, STATUS,
} from '@/components/tasks/shared';

const EMPTY: TaskForm = { title: '', description: '', due_date: localDay(), priority: 'normal', assignee_ids: [] };
type Filter = 'all' | 'todo' | 'in_progress' | 'done';

export default function TasksPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'mine' | 'team'>('mine');
  const [people, setPeople] = useState<Person[]>([]);
  const canAssign = people.length > 0;

  // ── My tasks ──
  const [date, setDate] = useState(localDay());
  const [mine, setMine] = useState<Task[]>([]);
  const [linked, setLinked] = useState(true);
  const [loadingMine, setLoadingMine] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [showDone, setShowDone] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  // ── Team ──
  const [team, setTeam] = useState<Task[]>([]);
  const [tally, setTally] = useState<Tally[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [range, setRange] = useState<'today' | 'week' | 'custom'>('today');
  const [from, setFrom] = useState(localDay());
  const [to, setTo] = useState(localDay());
  const [filterPerson, setFilterPerson] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [modal, setModal] = useState<'new' | 'edit' | null>(null);
  const [editing, setEditing] = useState<Task | null>(null);
  const [form, setForm] = useState<TaskForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Task | null>(null);

  const loadMine = useCallback(async () => {
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

  const pickDate = (d: string) => { setLoadingMine(true); setDate(d); };

  const pickRange = (r: 'today' | 'week' | 'custom') => {
    setRange(r);
    const today = localDay();
    if (r === 'today') { setFrom(today); setTo(today); }
    if (r === 'week') {
      const monday = addDays(today, -((fromDay(today).getDay() + 6) % 7));
      setFrom(monday); setTo(addDays(monday, 6));
    }
  };

  // Ticking a box should feel instant: update first, roll back if the server says no.
  const setStatus = async (t: Task, status: Status, note?: string) => {
    const before = mine;
    setBusyId(t.id);
    setMine(list => list.map(x => x.id === t.id
      ? { ...x, status, completed_at: status === 'done' ? new Date().toISOString() : undefined, completion_note: note ?? x.completion_note, overdue: status === 'done' ? false : x.overdue }
      : x));
    try {
      await api.patch(`/tasks/${t.id}/status`, { status, ...(note !== undefined && { note }) });
      if (status === 'done' && t.status !== 'done') toast.success('Nice — task completed');
      if (tab === 'team') loadTeam();
    } catch (e: any) {
      setMine(before);
      toast.error(e.response?.data?.message || 'Could not update the task');
    } finally { setBusyId(null); }
  };

  const openNew = () => { setForm({ ...EMPTY, due_date: tab === 'mine' ? date : localDay() }); setEditing(null); setModal('new'); };
  const openEdit = (t: Task) => {
    setEditing(t);
    setForm({ title: t.title, description: t.description || '', due_date: t.due_date.slice(0, 10), priority: t.priority, assignee_ids: [] });
    setModal('edit');
  };

  const save = async () => {
    if (!form.title.trim()) return toast.error('Give the task a title');
    if (!form.due_date) return toast.error('Pick a due date');
    if (modal === 'new' && form.assignee_ids.length === 0) return toast.error('Choose at least one person');
    setSaving(true);
    try {
      if (modal === 'edit' && editing) await api.put(`/tasks/${editing.id}`, form);
      else await api.post('/tasks', form);
      toast.success(modal === 'edit' ? 'Task updated' : form.assignee_ids.length > 1 ? `Assigned to ${form.assignee_ids.length} people` : 'Task assigned');
      setModal(null);
      if (canAssign) loadTeam();
      loadMine();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Could not save the task'); }
    finally { setSaving(false); }
  };

  const remove = async (t: Task) => {
    try { await api.delete(`/tasks/${t.id}`); toast.success('Task deleted'); loadTeam(); loadMine(); }
    catch (e: any) { toast.error(e.response?.data?.message || 'Could not delete'); }
  };

  // ── Derived: my day ──
  const counts = useMemo(() => ({
    all: mine.length,
    todo: mine.filter(t => t.status === 'todo').length,
    in_progress: mine.filter(t => t.status === 'in_progress').length,
    done: mine.filter(t => t.status === 'done').length,
    overdue: mine.filter(t => t.overdue).length,
  }), [mine]);
  const visible = mine.filter(t => filter === 'all' || t.status === filter);
  const overdueList = visible.filter(t => t.overdue && t.status !== 'done');
  const activeList = visible.filter(t => !t.overdue && t.status !== 'done')
    .sort((a, b) => (a.status === 'in_progress' ? -1 : 0) - (b.status === 'in_progress' ? -1 : 0));
  const doneList = visible.filter(t => t.status === 'done');
  const isToday = date === localDay();
  const left = counts.all - counts.done;
  const firstName = (user?.name || '').split(' ')[0];

  // ── Derived: team ──
  const teamStats = useMemo(() => {
    const total = team.length;
    const done = team.filter(t => t.status === 'done').length;
    return {
      total, done,
      in_progress: team.filter(t => t.status === 'in_progress').length,
      overdue: team.filter(t => t.overdue).length,
      rate: total ? Math.round((done / total) * 100) : 0,
    };
  }, [team]);

  return (
    <AppLayout title="Tasks" subtitle="Your day's work, and your team's">
      <div className="max-w-5xl mx-auto space-y-5">

        {/* Tabs + primary action */}
        <div className="flex items-center gap-3">
          {canAssign ? (
            <div className="inline-flex bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
              {([
                { k: 'mine', l: 'My tasks', icon: ClipboardList, n: counts.all - counts.done },
                { k: 'team', l: 'Team', icon: Users, n: null },
              ] as const).map(t => (
                <button key={t.k} onClick={() => setTab(t.k)}
                  className={`inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    tab === t.k ? 'bg-[#0D3B6E] text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'
                  }`}>
                  <t.icon className="w-4 h-4" />{t.l}
                  {t.n ? <span className={`text-[11px] px-1.5 rounded-full ${tab === t.k ? 'bg-white/20' : 'bg-gray-100'}`}>{t.n}</span> : null}
                </button>
              ))}
            </div>
          ) : <div />}
          {canAssign && (
            <button className="btn-primary !bg-[#0D3B6E] hover:!bg-[#0a2f58] ml-auto shadow-sm" onClick={openNew}>
              <Plus className="w-4 h-4" /> Assign<span className="hidden sm:inline"> task</span>
            </button>
          )}
        </div>

        {tab === 'mine' && (
          <>
            {/* Hero: who, which day, how far through it */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0D3B6E] via-[#0f4580] to-[#155a9e] text-white shadow-lg">
              <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-white/5" aria-hidden />
              <div className="absolute right-24 -bottom-20 w-40 h-40 rounded-full bg-white/5" aria-hidden />
              <div className="relative p-5 sm:p-6 space-y-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-white/60 text-sm">{greeting()}{firstName ? `, ${firstName}` : ''}</p>
                    <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-0.5">
                      {isToday ? 'Today' : fromDay(date).toLocaleDateString(undefined, { weekday: 'long' })}
                    </h2>
                    <p className="text-white/70 text-sm mt-0.5">
                      {fromDay(date).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    {!loadingMine && linked && (
                      <p className="mt-3 text-sm text-white/90">
                        {counts.all === 0 ? 'Nothing scheduled.'
                          : left === 0 ? <span className="inline-flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-emerald-300" /> All done — great work.</span>
                          : <>{left} task{left > 1 ? 's' : ''} left{counts.overdue > 0 && <span className="text-red-200"> · {counts.overdue} overdue</span>}</>}
                      </p>
                    )}
                  </div>
                  {linked && counts.all > 0 && <ProgressRing value={counts.done} total={counts.all} />}
                </div>
                <WeekStrip value={date} onChange={pickDate} />
              </div>
            </div>

            {/* Status filter */}
            {linked && counts.all > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {([
                  { k: 'all', l: 'All', icon: ListTodo },
                  { k: 'todo', l: 'To do', icon: ClipboardList },
                  { k: 'in_progress', l: 'In progress', icon: Loader },
                  { k: 'done', l: 'Done', icon: CheckCircle2 },
                ] as const).map(f => (
                  <button key={f.k} onClick={() => setFilter(f.k)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border transition-colors ${
                      filter === f.k ? 'bg-[#0D3B6E] text-white border-[#0D3B6E]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                    }`}>
                    <f.icon className="w-3.5 h-3.5" />{f.l}
                    <span className={`text-xs ${filter === f.k ? 'text-white/70' : 'text-gray-400'}`}>{counts[f.k]}</span>
                  </button>
                ))}
              </div>
            )}

            {loadingMine ? (
              <div className="space-y-2.5">
                {[0, 1, 2].map(i => (
                  <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 flex gap-3 animate-pulse">
                    <div className="w-6 h-6 rounded-full bg-gray-100" />
                    <div className="flex-1 space-y-2"><div className="h-4 bg-gray-100 rounded w-2/3" /><div className="h-3 bg-gray-100 rounded w-1/3" /></div>
                  </div>
                ))}
              </div>
            ) : !linked ? (
              <EmptyPanel icon={Link2Off} title="Your account isn't linked to an employee" body="Tasks are assigned to employee records. Ask your administrator to link your login to your employee profile." />
            ) : counts.all === 0 ? (
              <EmptyPanel icon={Sparkles} title={isToday ? "You're all clear today" : 'Nothing on this day'}
                body={canAssign ? 'No tasks assigned to you. Use “Assign task” to hand out work to your team.' : 'When work is assigned to you, it will show up here.'} />
            ) : visible.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">No {filter === 'in_progress' ? 'tasks in progress' : filter === 'todo' ? 'tasks to do' : 'completed tasks'}.</p>
            ) : (
              <div className="space-y-6">
                {overdueList.length > 0 && (
                  <Section title="Overdue" count={overdueList.length} tone="red">
                    {overdueList.map(t => <TaskCard key={t.id} task={t} busy={busyId === t.id} onStatus={setStatus} />)}
                  </Section>
                )}
                {activeList.length > 0 && (
                  <Section title={isToday ? 'Today' : 'Scheduled'} count={activeList.length}>
                    {activeList.map(t => <TaskCard key={t.id} task={t} busy={busyId === t.id} onStatus={setStatus} />)}
                  </Section>
                )}
                {doneList.length > 0 && (
                  <Section title="Completed" count={doneList.length} tone="green" collapsible open={showDone} onToggle={() => setShowDone(s => !s)}>
                    {doneList.map(t => <TaskCard key={t.id} task={t} busy={busyId === t.id} onStatus={setStatus} />)}
                  </Section>
                )}
              </div>
            )}
          </>
        )}

        {tab === 'team' && canAssign && (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Kpi label="Assigned" value={teamStats.total} icon={ClipboardList} tone="text-[#0D3B6E] bg-[#0D3B6E]/8" />
              <Kpi label="Completed" value={teamStats.done} sub={`${teamStats.rate}%`} icon={CheckCircle2} tone="text-emerald-600 bg-emerald-50" />
              <Kpi label="In progress" value={teamStats.in_progress} icon={Loader} tone="text-amber-600 bg-amber-50" />
              <Kpi label="Overdue" value={teamStats.overdue} icon={AlertCircle} tone={teamStats.overdue ? 'text-red-600 bg-red-50' : 'text-gray-400 bg-gray-50'} />
            </div>

            {/* Filters */}
            <div className="card !p-3 flex flex-wrap items-center gap-2">
              <div className="inline-flex bg-gray-100 rounded-lg p-0.5">
                {([['today', 'Today'], ['week', 'This week'], ['custom', 'Custom']] as const).map(([k, l]) => (
                  <button key={k} onClick={() => pickRange(k)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${range === k ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>{l}</button>
                ))}
              </div>
              {range === 'custom' && (
                <div className="flex items-center gap-1.5">
                  <CalendarRange className="w-4 h-4 text-gray-400" />
                  <input type="date" className="form-input !w-auto !py-1.5" value={from} onChange={e => e.target.value && setFrom(e.target.value)} aria-label="From" />
                  <span className="text-gray-400 text-sm">–</span>
                  <input type="date" className="form-input !w-auto !py-1.5" value={to} onChange={e => e.target.value && setTo(e.target.value)} aria-label="To" />
                </div>
              )}
              <div className="flex gap-2 sm:ml-auto w-full sm:w-auto">
                <select className="form-input sm:!w-44 !py-1.5" value={filterPerson} onChange={e => setFilterPerson(e.target.value)}>
                  <option value="">Everyone</option>
                  {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <select className="form-input sm:!w-36 !py-1.5" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                  <option value="">Any status</option>
                  {(Object.keys(STATUS) as Status[]).map(s => <option key={s} value={s}>{STATUS[s].label}</option>)}
                </select>
              </div>
            </div>

            {/* People */}
            {tally.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {tally.map(t => {
                  const pct = t.total ? Math.round((t.done / t.total) * 100) : 0;
                  const on = filterPerson === t.assignee_id;
                  return (
                    <button key={t.assignee_id} onClick={() => setFilterPerson(on ? '' : t.assignee_id)}
                      className={`bg-white rounded-xl border p-4 text-left transition-all hover:shadow-md ${on ? 'border-[#0D3B6E] ring-2 ring-[#0D3B6E]/15' : 'border-gray-100 shadow-sm'}`}>
                      <div className="flex items-center gap-3">
                        <span className={`w-10 h-10 rounded-full text-sm font-bold text-white flex items-center justify-center flex-shrink-0 ${avatarColor(t.assignee_name)}`}>{initials(t.assignee_name)}</span>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-gray-900 truncate">{t.assignee_name}</div>
                          <div className="text-xs text-gray-500">
                            {t.done}/{t.total} done{t.overdue > 0 && <span className="text-red-600 font-semibold"> · {t.overdue} overdue</span>}
                          </div>
                        </div>
                        <span className={`text-sm font-bold ${pct === 100 ? 'text-emerald-600' : 'text-gray-700'}`}>{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-3">
                        <div className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-emerald-500' : 'bg-[#0D3B6E]'}`} style={{ width: `${pct}%` }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Task list */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-800">Tasks</h3>
                <span className="text-xs text-gray-400">{team.length}</span>
              </div>
              {loadingTeam ? (
                <div className="p-4 space-y-3 animate-pulse">{[0, 1, 2].map(i => <div key={i} className="h-10 bg-gray-50 rounded-lg" />)}</div>
              ) : team.length === 0 ? (
                <EmptyPanel icon={ClipboardList} title="No tasks in this period" body="Assign a task, or widen the date range." flat />
              ) : (
                <ul className="divide-y divide-gray-50">
                  {team.map(t => (
                    <li key={t.id} className="group flex items-center gap-3 px-4 py-3 hover:bg-gray-50/70 transition-colors">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY[t.priority].dot}`} title={`${PRIORITY[t.priority].label} priority`} />
                      <div className="min-w-0 flex-1">
                        <div className={`text-sm font-medium truncate ${t.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{t.title}</div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                          <span className={`w-4 h-4 rounded-full text-[8px] font-bold text-white flex items-center justify-center ${avatarColor(t.assignee_name)}`}>{initials(t.assignee_name)}</span>
                          <span className="truncate">{t.assignee_name}</span>
                          <span>·</span>
                          <span className={t.overdue ? 'text-red-600 font-semibold' : ''}>{dueLabel(t.due_date)}</span>
                          {t.completion_note && <span className="hidden sm:inline truncate">· “{t.completion_note}”</span>}
                        </div>
                      </div>
                      <span className={`hidden sm:inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-md ${t.overdue ? 'bg-red-50 text-red-700 ring-1 ring-red-100' : STATUS[t.status].chip}`}>
                        {t.overdue ? 'Overdue' : STATUS[t.status].label}
                      </span>
                      <div className="flex gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <button title="Edit" onClick={() => openEdit(t)} className="p-1.5 hover:bg-white rounded-md text-gray-400 hover:text-[#0D3B6E]"><Edit2 className="w-4 h-4" /></button>
                        <button title="Delete" onClick={() => setConfirmDelete(t)} className="p-1.5 hover:bg-white rounded-md text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>

      <AssignTaskModal
        open={modal !== null}
        mode={modal === 'edit' ? 'edit' : 'new'}
        form={form}
        setForm={setForm}
        people={people}
        saving={saving}
        onClose={() => setModal(null)}
        onSave={save}
      />

      <ConfirmDialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} onConfirm={() => confirmDelete && remove(confirmDelete)}
        title="Delete task" message={`Delete “${confirmDelete?.title}”? The assignee will no longer see it.`} danger />
    </AppLayout>
  );
}

function Section({ title, count, tone, collapsible, open = true, onToggle, children }: {
  title: string; count: number; tone?: 'red' | 'green'; collapsible?: boolean; open?: boolean; onToggle?: () => void; children: React.ReactNode;
}) {
  const color = tone === 'red' ? 'text-red-600' : tone === 'green' ? 'text-emerald-600' : 'text-gray-500';
  const Head = collapsible ? 'button' : 'div';
  return (
    <section>
      <Head {...(collapsible ? { type: 'button' as const, onClick: onToggle } : {})} className="flex items-center gap-2 mb-2.5 w-full text-left">
        <h3 className={`text-xs font-bold uppercase tracking-wider ${color}`}>{title}</h3>
        <span className="text-xs text-gray-400 font-medium">{count}</span>
        <span className="flex-1 h-px bg-gray-100" />
        {collapsible && <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? '' : '-rotate-90'}`} />}
      </Head>
      {open && <div className="space-y-2.5">{children}</div>}
    </section>
  );
}

function Kpi({ label, value, sub, icon: Icon, tone }: { label: string; value: number; sub?: string; icon: React.ComponentType<{ className?: string }>; tone: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
      <span className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${tone}`}><Icon className="w-5 h-5" /></span>
      <div className="min-w-0">
        <div className="text-2xl font-extrabold text-gray-900 leading-none">{value}</div>
        <div className="text-xs text-gray-500 mt-1 truncate">{label}{sub && <span className="text-gray-400"> · {sub}</span>}</div>
      </div>
    </div>
  );
}

function EmptyPanel({ icon: Icon, title, body, flat }: { icon: React.ComponentType<{ className?: string }>; title: string; body: string; flat?: boolean }) {
  return (
    <div className={`text-center py-14 px-6 ${flat ? '' : 'bg-white rounded-2xl border border-dashed border-gray-200'}`}>
      <div className="w-14 h-14 rounded-2xl bg-[#0D3B6E]/5 text-[#0D3B6E] flex items-center justify-center mx-auto mb-4"><Icon className="w-7 h-7" /></div>
      <p className="font-semibold text-gray-800">{title}</p>
      <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">{body}</p>
    </div>
  );
}
