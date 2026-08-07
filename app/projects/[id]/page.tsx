'use client';
import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { toast, ConfirmDialog } from '@/components/ui';
import {
  Plus, RefreshCw, Trash2, Check, X, ArrowLeft, AlertTriangle,
  TrendingUp, TrendingDown, Clock,
} from 'lucide-react';

interface Milestone {
  id: string; name: string; description?: string; weight: number; sequence: number;
  planned_start?: string; planned_end?: string; actual_end?: string;
  status: string; progress_pct: number; billable_amount: number;
}
interface Task {
  id: string; name: string; milestone_id?: string; weight: number; status: string;
  due_date?: string; assignee_id?: { first_name: string; last_name: string } | null;
}
interface Variation {
  id: string; reference: string; description: string; amount: number;
  status: string; raised_on: string;
}
interface Financials {
  currency: string;
  contract_value: number; approved_variations: number; pending_variations: number; effective_contract: number;
  budget: number; expenses: number; labour_cost: number; labour_hours: number;
  actual_cost: number; committed_cost: number; forecast_cost: number;
  budget_variance: number; is_over_budget: boolean;
  progress_pct: number; earned_value: number; margin_to_date: number;
  invoiced: number; received: number; retention_pct: number; retention_held: number; unbilled: number;
}

interface BillingPosition {
  currency: string; effective_contract: number; earned_value: number;
  certified_to_date: number; remaining_to_certify: number; uncertified_earned: number;
  retention_pct: number; retention_withheld: number; retention_released: number; retention_outstanding: number;
  invoiced_net: number; received: number; applications: number;
}
interface ProjectInvoice {
  id: string; invoice_number: string; issue_date: string; due_date: string;
  work_value: number; retention_amount: number; total: number; amount_paid: number;
  status: string; is_retention_release: boolean;
}
interface BillableMilestone { id: string; name: string; billable_amount: number; actual_end?: string }

const MILESTONE_STATUS = ['not_started', 'in_progress', 'completed', 'blocked'];
const TASK_STATUS = ['todo', 'in_progress', 'done', 'blocked'];
const label = (s: string) => (s || '').replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());

const STATUS_TONE: Record<string, string> = {
  not_started: 'bg-gray-100 text-gray-600', in_progress: 'bg-amber-50 text-amber-700',
  completed: 'bg-green-50 text-green-700', blocked: 'bg-red-50 text-red-600',
  todo: 'bg-gray-100 text-gray-600', done: 'bg-green-50 text-green-700',
  pending: 'bg-amber-50 text-amber-700', approved: 'bg-green-50 text-green-700', rejected: 'bg-red-50 text-red-600',
};

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const canManage = ['business_owner', 'platform_admin', 'branch_manager', 'accountant'].includes(user?.role || '');
  const isOwner = ['business_owner', 'platform_admin'].includes(user?.role || '');

  const [project, setProject] = useState<any>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [fin, setFin] = useState<Financials | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'progress' | 'money' | 'billing'>('progress');
  const [billing, setBilling] = useState<{ position: BillingPosition | null; invoices: ProjectInvoice[]; billable_milestones: BillableMilestone[] } | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [billForm, setBillForm] = useState({ amount: '', due_date: '', notes: '' });
  const [releaseForm, setReleaseForm] = useState({ amount: '', due_date: '' });
  const [billing_busy, setBillingBusy] = useState(false);
  const [confirm, setConfirm] = useState<{ title: string; message: string; danger?: boolean; run: () => void } | null>(null);

  const [msForm, setMsForm] = useState({ name: '', weight: '1', planned_end: '', billable_amount: '' });
  const [taskForm, setTaskForm] = useState({ name: '', milestone_id: '', weight: '1' });
  const [voForm, setVoForm] = useState({ description: '', amount: '', reference: '' });

  const money = (n: number) => `${fin?.currency || 'GHS'} ${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get(`/projects/${id}`);
      const d = r.data.data;
      setProject(d.project);
      setMilestones(d.milestones || []);
      setTasks(d.tasks || []);
      setVariations(d.variations || []);
      setFin(d.financials);
      const b = await api.get(`/projects/${id}/billing`);
      setBilling(b.data.data);
      setPicked([]);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not load the project');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const addMilestone = async () => {
    if (!msForm.name.trim()) return toast.error('Give the milestone a name');
    try {
      await api.post(`/projects/${id}/milestones`, {
        name: msForm.name,
        weight: parseFloat(msForm.weight) || 1,
        planned_end: msForm.planned_end || undefined,
        billable_amount: parseFloat(msForm.billable_amount) || 0,
      });
      setMsForm({ name: '', weight: '1', planned_end: '', billable_amount: '' });
      await load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Could not add'); }
  };

  const setMilestoneStatus = async (m: Milestone, status: string) => {
    try {
      await api.put(`/projects/${id}/milestones/${m.id}`, { status });
      await load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Could not update'); }
  };

  const addTask = async () => {
    if (!taskForm.name.trim()) return toast.error('Give the task a name');
    try {
      await api.post(`/projects/${id}/tasks`, {
        name: taskForm.name,
        milestone_id: taskForm.milestone_id || undefined,
        weight: parseFloat(taskForm.weight) || 1,
      });
      setTaskForm({ name: '', milestone_id: '', weight: '1' });
      await load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Could not add'); }
  };

  const cycleTask = async (t: Task) => {
    const next = t.status === 'done' ? 'todo' : t.status === 'todo' ? 'in_progress' : 'done';
    try {
      await api.put(`/projects/${id}/tasks/${t.id}`, { status: next });
      await load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Could not update'); }
  };

  const addVariation = async () => {
    const amt = parseFloat(voForm.amount);
    if (!voForm.description.trim() || !Number.isFinite(amt) || amt === 0) {
      return toast.error('Describe the change and give a non-zero amount');
    }
    try {
      await api.post(`/projects/${id}/variations`, { ...voForm, amount: amt });
      setVoForm({ description: '', amount: '', reference: '' });
      await load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Could not add'); }
  };

  const decide = async (v: Variation, decision: 'approved' | 'rejected') => {
    try {
      await api.patch(`/projects/${id}/variations/${v.id}`, { decision });
      toast.success(`${v.reference} ${decision}`);
      await load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Could not update'); }
  };

  const raiseApplication = async () => {
    if (!billForm.due_date) return toast.error('Set a due date');
    const usingMilestones = picked.length > 0;
    const amt = parseFloat(billForm.amount);
    if (!usingMilestones && (!Number.isFinite(amt) || amt <= 0)) {
      return toast.error('Pick milestones to certify, or enter an amount');
    }
    setBillingBusy(true);
    try {
      const r = await api.post(`/projects/${id}/invoices`, {
        ...(usingMilestones ? { milestone_ids: picked } : { amount: amt }),
        due_date: billForm.due_date,
        notes: billForm.notes || undefined,
      });
      toast.success(`${r.data.data.invoice_number} raised as a draft invoice`);
      setBillForm({ amount: '', due_date: '', notes: '' });
      await load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not raise the application');
    } finally { setBillingBusy(false); }
  };

  const releaseRetention = async () => {
    if (!releaseForm.due_date) return toast.error('Set a due date');
    const amt = parseFloat(releaseForm.amount);
    if (!Number.isFinite(amt) || amt <= 0) return toast.error('Enter the amount to release');
    setBillingBusy(true);
    try {
      const r = await api.post(`/projects/${id}/retention-release`, { amount: amt, due_date: releaseForm.due_date });
      toast.success(`${r.data.data.invoice_number} raised for retention`);
      setReleaseForm({ amount: '', due_date: '' });
      await load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not release retention');
    } finally { setBillingBusy(false); }
  };

  const removeIt = (what: string, url: string, name: string) => setConfirm({
    title: `Remove this ${what}?`,
    message: `“${name}” will be deleted. Progress is recalculated afterwards.`,
    danger: true,
    run: async () => {
      try { await api.delete(url); await load(); }
      catch (e: any) { toast.error(e.response?.data?.message || 'Could not remove'); }
    },
  });

  if (loading && !project) {
    return <AppLayout title="Project" subtitle="Loading…"><div className="card animate-pulse h-40" /></AppLayout>;
  }
  if (!project) {
    return <AppLayout title="Project" subtitle="Not found"><div className="card text-center py-16 text-gray-500">This project could not be loaded.</div></AppLayout>;
  }

  const overdue = project.planned_end_date && !['completed', 'cancelled'].includes(project.status)
    && new Date(project.planned_end_date) < new Date();

  return (
    <AppLayout
      title={project.name}
      subtitle={`${project.code}${project.customer_name ? ` · ${project.customer_name}` : ''}`}
      allowedRoles={['platform_admin', 'business_owner', 'branch_manager', 'accountant']}
    >
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <button type="button" onClick={() => router.push('/projects')} className="btn-ghost text-sm">
            <ArrowLeft className="w-4 h-4" /> All projects
          </button>
          <button type="button" onClick={load} className="btn-secondary" disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        {overdue && (
          <div className="flex items-start gap-2.5 bg-red-50 text-red-800 rounded-xl px-4 py-3 text-sm">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>Past its planned completion of {new Date(project.planned_end_date).toLocaleDateString()} and still {label(project.status).toLowerCase()}.</span>
          </div>
        )}

        {/* Headline numbers */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="card">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Progress</p>
            <p className="text-2xl font-extrabold text-gray-900 mt-1">{Math.round(fin?.progress_pct || 0)}%</p>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-2">
              <div className="h-full bg-[#0D3B6E] rounded-full" style={{ width: `${Math.min(100, fin?.progress_pct || 0)}%` }} />
            </div>
          </div>
          <div className="card">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Contract</p>
            <p className="text-2xl font-extrabold text-gray-900 mt-1">{money(fin?.effective_contract || 0)}</p>
            {!!fin?.approved_variations && (
              <p className="text-xs text-gray-400 mt-1">incl. {money(fin.approved_variations)} variations</p>
            )}
          </div>
          <div className="card">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Cost so far</p>
            <p className="text-2xl font-extrabold text-gray-900 mt-1">{money(fin?.actual_cost || 0)}</p>
            {!!fin?.committed_cost && <p className="text-xs text-gray-400 mt-1">+ {money(fin.committed_cost)} committed</p>}
          </div>
          <div className="card">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Margin to date</p>
            <p className={`text-2xl font-extrabold mt-1 inline-flex items-center gap-1 ${(fin?.margin_to_date || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {(fin?.margin_to_date || 0) >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              {money(Math.abs(fin?.margin_to_date || 0))}
            </p>
            <p className="text-xs text-gray-400 mt-1">Work done less cost</p>
          </div>
        </div>

        {fin?.is_over_budget && (
          <div className="flex items-start gap-2.5 bg-amber-50 text-amber-800 rounded-xl px-4 py-3 text-sm">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              Costs and commitments of {money(fin.forecast_cost)} are past the {money(fin.budget)} budget
              by {money(Math.abs(fin.budget_variance))}.
            </span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200">
          {(['progress', 'money', 'billing'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                tab === t ? 'border-[#0D3B6E] text-[#0D3B6E]' : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >{t === 'progress' ? 'Progress' : t === 'money' ? 'Money' : 'Billing'}</button>
          ))}
        </div>

        {tab === 'progress' ? (
          <>
            {/* Milestones */}
            <div className="card">
              <div className="mb-4">
                <h2 className="font-bold text-gray-900">Milestones</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Overall progress is the weighted average of these — a heavier stage moves the number more.
                </p>
              </div>

              {milestones.length === 0 ? (
                <p className="text-sm text-gray-400 mb-4">No milestones yet. Add the stages of work to start tracking progress.</p>
              ) : (
                <div className="space-y-2 mb-4">
                  {milestones.map(m => {
                    const own = tasks.filter(t => t.milestone_id === m.id);
                    return (
                      <div key={m.id} className="bg-gray-50 rounded-xl px-4 py-3 ring-1 ring-gray-100">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-gray-800 text-sm">{m.name}</p>
                              <span className={`badge ${STATUS_TONE[m.status]}`}>{label(m.status)}</span>
                              <span className="text-xs text-gray-400">weight {m.weight}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {Math.round(m.progress_pct)}% · {own.length} task{own.length === 1 ? '' : 's'}
                              {m.billable_amount > 0 && <> · bills {money(m.billable_amount)}</>}
                              {m.planned_end && <> · due {new Date(m.planned_end).toLocaleDateString()}</>}
                            </p>
                          </div>
                          {canManage && (
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <select
                                className="form-input !w-auto !py-1 text-xs"
                                value={m.status}
                                onChange={e => setMilestoneStatus(m, e.target.value)}
                              >
                                {MILESTONE_STATUS.map(s => <option key={s} value={s}>{label(s)}</option>)}
                              </select>
                              <button onClick={() => removeIt('milestone', `/projects/${id}/milestones/${m.id}`, m.name)} className="text-gray-400 hover:text-red-500">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="h-1.5 bg-white rounded-full overflow-hidden mt-2">
                          <div className="h-full bg-[#0D3B6E] rounded-full" style={{ width: `${Math.min(100, m.progress_pct)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {canManage && (
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 border-t border-gray-100 pt-4">
                  <div className="sm:col-span-2">
                    <label className="form-label text-xs">Milestone</label>
                    <input className="form-input" placeholder="e.g. Foundation" value={msForm.name} onChange={e => setMsForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="form-label text-xs">Weight</label>
                    <input type="number" min={0} className="form-input" value={msForm.weight} onChange={e => setMsForm(f => ({ ...f, weight: e.target.value }))} />
                  </div>
                  <div>
                    <label className="form-label text-xs">Due</label>
                    <input type="date" className="form-input" value={msForm.planned_end} onChange={e => setMsForm(f => ({ ...f, planned_end: e.target.value }))} />
                  </div>
                  <div className="flex items-end">
                    <button type="button" className="btn-secondary w-full justify-center" onClick={addMilestone}>
                      <Plus className="w-4 h-4" /> Add
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Tasks */}
            <div className="card">
              <div className="mb-4">
                <h2 className="font-bold text-gray-900">Tasks</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Tasks roll up into their milestone. In-progress counts as half done.
                </p>
              </div>

              {tasks.length === 0 ? (
                <p className="text-sm text-gray-400 mb-4">No tasks yet.</p>
              ) : (
                <div className="space-y-1.5 mb-4">
                  {tasks.map(t => (
                    <div key={t.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5 ring-1 ring-gray-100">
                      <button
                        onClick={() => cycleTask(t)}
                        title="Change status"
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          t.status === 'done' ? 'bg-green-500 border-green-500 text-white'
                            : t.status === 'in_progress' ? 'border-amber-400 bg-amber-100'
                            : t.status === 'blocked' ? 'border-red-400 bg-red-50'
                            : 'border-gray-300 bg-white'
                        }`}
                      >
                        {t.status === 'done' && <Check className="w-3 h-3" />}
                        {t.status === 'in_progress' && <Clock className="w-3 h-3 text-amber-600" />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm ${t.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{t.name}</p>
                        <p className="text-xs text-gray-400">
                          {milestones.find(m => m.id === t.milestone_id)?.name || 'Unassigned stage'}
                          {t.assignee_id && <> · {t.assignee_id.first_name} {t.assignee_id.last_name}</>}
                          {t.weight !== 1 && <> · weight {t.weight}</>}
                        </p>
                      </div>
                      {canManage && (
                        <button onClick={() => removeIt('task', `/projects/${id}/tasks/${t.id}`, t.name)} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 border-t border-gray-100 pt-4">
                <div className="sm:col-span-2">
                  <label className="form-label text-xs">Task</label>
                  <input className="form-input" placeholder="e.g. Excavate footings" value={taskForm.name} onChange={e => setTaskForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label text-xs">Milestone</label>
                  <select className="form-input" value={taskForm.milestone_id} onChange={e => setTaskForm(f => ({ ...f, milestone_id: e.target.value }))}>
                    <option value="">None</option>
                    {milestones.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label text-xs">Weight</label>
                  <input type="number" min={0} className="form-input" value={taskForm.weight} onChange={e => setTaskForm(f => ({ ...f, weight: e.target.value }))} />
                </div>
                <div className="flex items-end">
                  <button type="button" className="btn-secondary w-full justify-center" onClick={addTask}>
                    <Plus className="w-4 h-4" /> Add
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Cost position */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="card">
                <h2 className="font-bold text-gray-900 mb-4">Cost position</h2>
                <dl className="space-y-3 text-sm">
                  {[
                    ['Budget', fin?.budget, 'text-gray-900'],
                    ['Expenses posted', fin?.expenses, 'text-gray-600'],
                    ['Labour booked', fin?.labour_cost, 'text-gray-600'],
                    ['Committed (POs raised)', fin?.committed_cost, 'text-gray-600'],
                  ].map(([l, v, tone]) => (
                    <div key={l as string} className="flex justify-between">
                      <dt className="text-gray-500">{l as string}</dt>
                      <dd className={`font-semibold ${tone as string}`}>{money(v as number)}</dd>
                    </div>
                  ))}
                  <div className="flex justify-between pt-3 border-t border-gray-100">
                    <dt className="text-gray-900 font-semibold">Forecast cost</dt>
                    <dd className={`font-bold ${fin?.is_over_budget ? 'text-red-600' : 'text-gray-900'}`}>{money(fin?.forecast_cost || 0)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Against budget</dt>
                    <dd className={`font-semibold ${(fin?.budget_variance || 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {(fin?.budget_variance || 0) < 0 ? '−' : '+'}{money(Math.abs(fin?.budget_variance || 0))}
                    </dd>
                  </div>
                </dl>
                <p className="text-xs text-gray-400 mt-4">
                  Cost comes from expenses and purchase orders tagged to this project, plus booked labour — so it stays in step with your accounts.
                </p>
              </div>

              <div className="card">
                <h2 className="font-bold text-gray-900 mb-4">Contract &amp; billing</h2>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Original contract</dt>
                    <dd className="font-semibold text-gray-900">{money(fin?.contract_value || 0)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Approved variations</dt>
                    <dd className="font-semibold text-gray-600">{money(fin?.approved_variations || 0)}</dd>
                  </div>
                  <div className="flex justify-between pt-3 border-t border-gray-100">
                    <dt className="text-gray-900 font-semibold">Effective contract</dt>
                    <dd className="font-bold text-gray-900">{money(fin?.effective_contract || 0)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Work done ({Math.round(fin?.progress_pct || 0)}%)</dt>
                    <dd className="font-semibold text-gray-900">{money(fin?.earned_value || 0)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Invoiced</dt>
                    <dd className="font-semibold text-gray-600">{money(fin?.invoiced || 0)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Not yet billed</dt>
                    <dd className="font-semibold text-amber-600">{money(fin?.unbilled || 0)}</dd>
                  </div>
                  {!!fin?.retention_pct && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Retention held ({fin.retention_pct}%)</dt>
                      <dd className="font-semibold text-gray-600">{money(fin.retention_held)}</dd>
                    </div>
                  )}
                </dl>
                {!!fin?.pending_variations && (
                  <p className="text-xs text-amber-600 mt-4">
                    {money(fin.pending_variations)} of variations are still pending and are not counted above.
                  </p>
                )}
              </div>
            </div>

            {/* Variations */}
            <div className="card">
              <div className="mb-4">
                <h2 className="font-bold text-gray-900">Variations</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Changes to the agreed scope. Only approved ones move the contract sum. A negative amount is an omission.
                </p>
              </div>

              {variations.length === 0 ? (
                <p className="text-sm text-gray-400 mb-4">None raised.</p>
              ) : (
                <div className="space-y-2 mb-4">
                  {variations.map(v => (
                    <div key={v.id} className="flex items-start justify-between gap-3 bg-gray-50 rounded-xl px-4 py-3 ring-1 ring-gray-100">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs text-gray-500">{v.reference}</span>
                          <span className={`badge ${STATUS_TONE[v.status]}`}>{label(v.status)}</span>
                        </div>
                        <p className="text-sm text-gray-800 mt-0.5">{v.description}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{new Date(v.raised_on).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`font-bold text-sm ${v.amount < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                          {v.amount < 0 ? '−' : '+'}{money(Math.abs(v.amount))}
                        </span>
                        {isOwner && v.status === 'pending' && (
                          <>
                            <button onClick={() => decide(v, 'approved')} title="Approve" className="p-1.5 rounded-lg text-green-600 hover:bg-green-50"><Check className="w-4 h-4" /></button>
                            <button onClick={() => decide(v, 'rejected')} title="Reject" className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"><X className="w-4 h-4" /></button>
                          </>
                        )}
                        {canManage && (
                          <button onClick={() => removeIt('variation', `/projects/${id}/variations/${v.id}`, v.reference)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {canManage && (
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 border-t border-gray-100 pt-4">
                  <div className="sm:col-span-2">
                    <label className="form-label text-xs">Description</label>
                    <input className="form-input" placeholder="e.g. Additional drainage" value={voForm.description} onChange={e => setVoForm(f => ({ ...f, description: e.target.value }))} />
                  </div>
                  <div>
                    <label className="form-label text-xs">Reference</label>
                    <input className="form-input" placeholder="auto" value={voForm.reference} onChange={e => setVoForm(f => ({ ...f, reference: e.target.value }))} />
                  </div>
                  <div>
                    <label className="form-label text-xs">Amount</label>
                    <input type="number" className="form-input" placeholder="0.00" value={voForm.amount} onChange={e => setVoForm(f => ({ ...f, amount: e.target.value }))} />
                  </div>
                  <div className="flex items-end">
                    <button type="button" className="btn-secondary w-full justify-center" onClick={addVariation}>
                      <Plus className="w-4 h-4" /> Raise
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {tab === 'billing' && (() => {
          const pos = billing?.position;
          const pickedTotal = (billing?.billable_milestones || [])
            .filter(m => picked.includes(m.id))
            .reduce((s, m) => s + m.billable_amount, 0);
          const gross = picked.length ? pickedTotal : (parseFloat(billForm.amount) || 0);
          const retention = gross * ((pos?.retention_pct || 0) / 100);

          return (
            <>
              {/* Position */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  ['Certified to date', pos?.certified_to_date, 'text-gray-900'],
                  ['Left to certify', pos?.remaining_to_certify, 'text-gray-900'],
                  ['Retention held by client', pos?.retention_outstanding, 'text-amber-600'],
                  ['Received', pos?.received, 'text-green-600'],
                ].map(([l, v, tone]) => (
                  <div key={l as string} className="card">
                    <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">{l as string}</p>
                    <p className={`text-xl font-extrabold mt-1 ${tone as string}`}>{money(v as number)}</p>
                  </div>
                ))}
              </div>

              {(pos?.uncertified_earned || 0) > 0 && (
                <div className="flex items-start gap-2.5 bg-blue-50 text-blue-800 rounded-xl px-4 py-3 text-sm">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{money(pos!.uncertified_earned)} of work has been done but not yet put on an application.</span>
                </div>
              )}

              {/* Raise an application */}
              {canManage && (
                <div className="card">
                  <div className="mb-4">
                    <h2 className="font-bold text-gray-900">Raise an application</h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Certify completed stages, or enter an amount. Retention comes off the top and stays with the client until released.
                    </p>
                  </div>

                  {(billing?.billable_milestones.length || 0) > 0 && (
                    <div className="space-y-1.5 mb-4">
                      <p className="form-label">Completed stages not yet billed</p>
                      {billing!.billable_milestones.map(m => (
                        <label key={m.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-2.5 ring-1 ring-gray-100 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={picked.includes(m.id)}
                            onChange={e => setPicked(p => e.target.checked ? [...p, m.id] : p.filter(x => x !== m.id))}
                            className="w-4 h-4 accent-[#0D3B6E]"
                          />
                          <span className="flex-1 text-sm text-gray-800">{m.name}</span>
                          <span className="text-sm font-semibold text-gray-900">{money(m.billable_amount)}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="form-label">{picked.length ? 'Amount (from stages)' : 'Amount'}</label>
                      <input
                        type="number"
                        className="form-input"
                        placeholder="0.00"
                        value={picked.length ? pickedTotal.toFixed(2) : billForm.amount}
                        disabled={picked.length > 0}
                        onChange={e => setBillForm(f => ({ ...f, amount: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="form-label">Due date *</label>
                      <input type="date" className="form-input" value={billForm.due_date} onChange={e => setBillForm(f => ({ ...f, due_date: e.target.value }))} />
                    </div>
                    <div>
                      <label className="form-label">Note</label>
                      <input className="form-input" placeholder="optional" value={billForm.notes} onChange={e => setBillForm(f => ({ ...f, notes: e.target.value }))} />
                    </div>
                  </div>

                  {gross > 0 && (
                    <dl className="mt-4 bg-gray-50 rounded-xl p-4 ring-1 ring-gray-100 space-y-2 text-sm max-w-sm">
                      <div className="flex justify-between"><dt className="text-gray-500">Work certified</dt><dd className="font-semibold text-gray-900">{money(gross)}</dd></div>
                      <div className="flex justify-between"><dt className="text-gray-500">Less retention ({pos?.retention_pct || 0}%)</dt><dd className="font-semibold text-amber-600">− {money(retention)}</dd></div>
                      <div className="flex justify-between pt-2 border-t border-gray-200"><dt className="text-gray-900 font-semibold">Now due</dt><dd className="font-bold text-gray-900">{money(gross - retention)}</dd></div>
                    </dl>
                  )}

                  <button type="button" className="btn-primary mt-4" onClick={raiseApplication} disabled={billing_busy}>
                    <Plus className="w-4 h-4" /> {billing_busy ? 'Raising…' : 'Raise application'}
                  </button>
                  <p className="text-xs text-gray-400 mt-2">
                    Creates a draft invoice. Send it from Accounting to post it to the ledger.
                  </p>
                </div>
              )}

              {/* Release retention */}
              {canManage && (pos?.retention_outstanding || 0) > 0 && (
                <div className="card">
                  <div className="mb-4">
                    <h2 className="font-bold text-gray-900">Release retention</h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {money(pos!.retention_outstanding)} still held. Most contracts release in stages — part at completion, the rest after the defects period.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="form-label">Amount</label>
                      <input type="number" className="form-input" placeholder="0.00" value={releaseForm.amount} onChange={e => setReleaseForm(f => ({ ...f, amount: e.target.value }))} />
                    </div>
                    <div>
                      <label className="form-label">Due date *</label>
                      <input type="date" className="form-input" value={releaseForm.due_date} onChange={e => setReleaseForm(f => ({ ...f, due_date: e.target.value }))} />
                    </div>
                    <div className="flex items-end">
                      <button type="button" className="btn-secondary w-full justify-center" onClick={releaseRetention} disabled={billing_busy}>
                        Release
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Applications raised */}
              <div className="card">
                <h2 className="font-bold text-gray-900 mb-4">Applications</h2>
                {!billing?.invoices.length ? (
                  <p className="text-sm text-gray-400">Nothing raised yet.</p>
                ) : (
                  <div className="table-wrap">
                    <table className="w-full text-sm min-w-[640px]">
                      <thead>
                        <tr className="table-header text-left">
                          <th className="px-4 py-2.5">Invoice</th>
                          <th className="px-4 py-2.5">Issued</th>
                          <th className="px-4 py-2.5 text-right">Work certified</th>
                          <th className="px-4 py-2.5 text-right">Retention</th>
                          <th className="px-4 py-2.5 text-right">Due</th>
                          <th className="px-4 py-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {billing.invoices.map(inv => (
                          <tr key={inv.id} className="border-t border-gray-100">
                            <td className="px-4 py-3 font-mono text-xs text-gray-600">
                              {inv.invoice_number}
                              {inv.is_retention_release && <span className="ml-2 badge bg-blue-50 text-blue-700">Retention</span>}
                            </td>
                            <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{new Date(inv.issue_date).toLocaleDateString()}</td>
                            <td className="px-4 py-3 text-right text-gray-600">{inv.work_value ? money(inv.work_value) : '—'}</td>
                            <td className="px-4 py-3 text-right text-amber-600">{inv.retention_amount ? `− ${money(inv.retention_amount)}` : '—'}</td>
                            <td className="px-4 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">{money(inv.total)}</td>
                            <td className="px-4 py-3"><span className="badge bg-gray-100 text-gray-600">{label(inv.status)}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          );
        })()}

        <ConfirmDialog
          open={!!confirm}
          onClose={() => setConfirm(null)}
          onConfirm={() => { confirm?.run(); setConfirm(null); }}
          title={confirm?.title || ''}
          message={confirm?.message || ''}
          danger={confirm?.danger}
        />
      </div>
    </AppLayout>
  );
}
