'use client';
import { useState } from 'react';
import api from '@/lib/api';
import { toast } from '@/components/ui';
import { Plus, Trash2, Check, Clock } from 'lucide-react';
import type { TabProps } from '@/components/projects/shared';
import { MILESTONE_STATUS, STATUS_TONE, label } from '@/components/projects/shared';
import type { Milestone, Task } from '@/components/projects/types';

/**
 * The work breakdown — the stages of the job and the tasks under them.
 *
 * Overall progress is the weighted average of the stages, so a heavier one
 * moves the number further. Nothing here is typed in directly.
 */
interface Props extends TabProps {
  milestones: Milestone[];
  tasks: Task[];
}

export default function ProgressTab({
  projectId, profile, canManage, money, reload, removeIt, milestones, tasks
}: Props) {
  const term = profile.terms;
  const [msForm, setMsForm] = useState({ name: '', weight: '1', planned_end: '', billable_amount: '' });
  const [taskForm, setTaskForm] = useState({ name: '', milestone_id: '', weight: '1' });

  const addMilestone = async () => {
    if (!msForm.name.trim()) return toast.error('Give the milestone a name');
    try {
      await api.post(`/projects/${projectId}/milestones`, {
        name: msForm.name,
        weight: parseFloat(msForm.weight) || 1,
        planned_end: msForm.planned_end || undefined,
        billable_amount: parseFloat(msForm.billable_amount) || 0,
      });
      setMsForm({ name: '', weight: '1', planned_end: '', billable_amount: '' });
      await reload();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Could not add'); }
  };

  const setMilestoneStatus = async (m: Milestone, status: string) => {
    try {
      await api.put(`/projects/${projectId}/milestones/${m.id}`, { status });
      await reload();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Could not update'); }
  };

  const addTask = async () => {
    if (!taskForm.name.trim()) return toast.error('Give the task a name');
    try {
      await api.post(`/projects/${projectId}/tasks`, {
        name: taskForm.name,
        milestone_id: taskForm.milestone_id || undefined,
        weight: parseFloat(taskForm.weight) || 1,
      });
      setTaskForm({ name: '', milestone_id: '', weight: '1' });
      await reload();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Could not add'); }
  };

  const cycleTask = async (t: Task) => {
    const next = t.status === 'done' ? 'todo' : t.status === 'todo' ? 'in_progress' : 'done';
    try {
      await api.put(`/projects/${projectId}/tasks/${t.id}`, { status: next });
      await reload();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Could not update'); }
  };

  return (
    <>
      {/* Milestones */}
      <div className="card">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="font-bold text-gray-900">{term.stages}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Overall progress is the weighted average — a heavier stage moves the number more.
            </p>
          </div>
          <span className="text-xs text-gray-400 font-medium whitespace-nowrap">
            {milestones.filter(m => m.status === 'completed').length}/{milestones.length} done
          </span>
        </div>

        {milestones.length === 0 ? (
          <p className="text-sm text-gray-400 mb-4">No milestones yet. Add the stages of work to start tracking progress.</p>
        ) : (
          <div className="space-y-2 mb-4">
            {milestones.map(m => {
              const own = tasks.filter(t => t.milestone_id === m.id);
              const doneTasks = own.filter(t => t.status === 'done').length;
              return (
                <div key={m.id} className="bg-gray-50 rounded-xl px-4 py-3 ring-1 ring-gray-100">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-800 text-sm">{m.name}</p>
                        <span className={`badge ${STATUS_TONE[m.status]}`}>{label(m.status)}</span>
                        <span className="text-xs text-gray-400">wt {m.weight}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                        <span className="text-xs text-gray-500">{Math.round(m.progress_pct)}% complete</span>
                        {own.length > 0 && (
                          <span className="text-xs text-gray-400">{doneTasks}/{own.length} tasks</span>
                        )}
                        {m.billable_amount > 0 && (
                          <span className="text-xs text-gray-400">bills {money(m.billable_amount)}</span>
                        )}
                        {m.planned_end && (
                          <span className="text-xs text-gray-400">due {new Date(m.planned_end).toLocaleDateString()}</span>
                        )}
                      </div>
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
                        <button onClick={() => removeIt('milestone', `/projects/${projectId}/milestones/${m.id}`, m.name)} className="text-gray-400 hover:text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="h-1.5 bg-white rounded-full overflow-hidden mt-2.5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        m.status === 'completed' ? 'bg-green-500' :
                        m.status === 'blocked'   ? 'bg-red-400' :
                        m.status === 'in_progress' ? 'bg-[#0D3B6E]' : 'bg-gray-300'
                      }`}
                      style={{ width: `${Math.min(100, m.progress_pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {canManage && (
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 border-t border-gray-100 pt-4">
            <div className="sm:col-span-2">
              <label className="form-label text-xs">{term.stage} name</label>
              <input className="form-input" placeholder="e.g. Foundation" value={msForm.name} onChange={e => setMsForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="form-label text-xs">Weight</label>
              <input type="number" min={0} className="form-input" value={msForm.weight} onChange={e => setMsForm(f => ({ ...f, weight: e.target.value }))} />
            </div>
            <div>
              <label className="form-label text-xs">Due date</label>
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
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="font-bold text-gray-900">Tasks</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Tasks roll up into their milestone. In-progress counts as half done.
            </p>
          </div>
          <span className="text-xs text-gray-400 font-medium whitespace-nowrap">
            {tasks.filter(t => t.status === 'done').length}/{tasks.length} done
          </span>
        </div>

        {tasks.length === 0 ? (
          <p className="text-sm text-gray-400 mb-4">No tasks yet. Add tasks to track granular work within each milestone.</p>
        ) : (
          <div className="space-y-1.5 mb-4">
            {tasks.map(t => (
              <div key={t.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5 ring-1 ring-gray-100">
                <button
                  onClick={() => cycleTask(t)}
                  title="Click to cycle status"
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    t.status === 'done'        ? 'bg-green-500 border-green-500 text-white'
                    : t.status === 'in_progress' ? 'border-amber-400 bg-amber-50'
                    : t.status === 'blocked'     ? 'border-red-400 bg-red-50'
                    : 'border-gray-300 bg-white'
                  }`}
                >
                  {t.status === 'done'        && <Check className="w-3 h-3" />}
                  {t.status === 'in_progress' && <Clock className="w-3 h-3 text-amber-500" />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium ${
                    t.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-800'
                  }`}>{t.name}</p>
                  <p className="text-xs text-gray-400">
                    {milestones.find(m => m.id === t.milestone_id)?.name || 'No milestone'}
                    {t.assignee_id?.name && <> · {t.assignee_id.name}</>}
                    {t.weight !== 1 && <> · wt {t.weight}</>}
                  </p>
                </div>
                <span className={`badge text-xs flex-shrink-0 ${
                  t.status === 'done'        ? 'bg-green-50 text-green-700'
                  : t.status === 'in_progress' ? 'bg-amber-50 text-amber-700'
                  : t.status === 'blocked'     ? 'bg-red-50 text-red-600'
                  : 'bg-gray-100 text-gray-500'
                }`}>{label(t.status)}</span>
                {canManage && (
                  <button onClick={() => removeIt('task', `/projects/${projectId}/tasks/${t.id}`, t.name)} className="text-gray-300 hover:text-red-500 flex-shrink-0 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 border-t border-gray-100 pt-4">
          <div className="sm:col-span-2">
            <label className="form-label text-xs">Task name</label>
            <input className="form-input" placeholder="e.g. Excavate footings" value={taskForm.name} onChange={e => setTaskForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="form-label text-xs">{term.stage}</label>
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
  );
}
