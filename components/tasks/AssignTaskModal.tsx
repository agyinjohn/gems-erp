'use client';
import { useMemo, useState } from 'react';
import { Modal } from '@/components/ui';
import { Search, Check, X } from 'lucide-react';
import { type Person, type Priority, PRIORITY, localDay, addDays, fromDay, initials, avatarColor } from './shared';

export interface TaskForm {
  title: string;
  description: string;
  due_date: string;
  priority: Priority;
  assignee_ids: string[];
}

interface Props {
  open: boolean;
  mode: 'new' | 'edit';
  form: TaskForm;
  setForm: (f: TaskForm) => void;
  people: Person[];
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
}

const nextMonday = () => { const t = localDay(); const d = fromDay(t).getDay(); return addDays(t, ((8 - d) % 7) || 7); };

export default function AssignTaskModal({ open, mode, form, setForm, people, saving, onClose, onSave }: Props) {
  const [query, setQuery] = useState('');
  const shown = useMemo(
    () => people.filter(p => !query || `${p.name} ${p.job_title || ''}`.toLowerCase().includes(query.toLowerCase())),
    [people, query],
  );
  const set = <K extends keyof TaskForm>(k: K, v: TaskForm[K]) => setForm({ ...form, [k]: v });
  const toggle = (id: string) => set('assignee_ids', form.assignee_ids.includes(id) ? form.assignee_ids.filter(i => i !== id) : [...form.assignee_ids, id]);
  const allShown = shown.length > 0 && shown.every(p => form.assignee_ids.includes(p.id));
  const toggleAll = () => set('assignee_ids', allShown
    ? form.assignee_ids.filter(id => !shown.some(p => p.id === id))
    : [...new Set([...form.assignee_ids, ...shown.map(p => p.id)])]);

  const quick = [
    { label: 'Today', day: localDay() },
    { label: 'Tomorrow', day: addDays(localDay(), 1) },
    { label: 'Next Monday', day: nextMonday() },
  ];

  return (
    <Modal open={open} onClose={onClose} title={mode === 'edit' ? 'Edit task' : 'Assign a task'} size="lg">
      <div className="space-y-5">
        <div>
          <input
            autoFocus
            className="w-full text-lg font-semibold text-gray-900 placeholder:text-gray-300 border-0 border-b-2 border-gray-100 focus:border-[#0D3B6E] focus:ring-0 px-0 py-2 outline-none transition-colors"
            placeholder="What needs to be done?"
            value={form.title}
            onChange={e => set('title', e.target.value)}
          />
          <textarea
            rows={3}
            className="form-input mt-3 resize-none"
            placeholder="Add details, steps or links (optional)"
            value={form.description}
            onChange={e => set('description', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="form-label">Due</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {quick.map(q => (
                <button key={q.label} type="button" onClick={() => set('due_date', q.day)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                    form.due_date === q.day ? 'bg-[#0D3B6E] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>{q.label}</button>
              ))}
            </div>
            <input type="date" className="form-input" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
          </div>
          <div>
            <label className="form-label">Priority</label>
            <div className="grid grid-cols-3 gap-1.5 bg-gray-100 p-1 rounded-xl">
              {(['low', 'normal', 'high'] as Priority[]).map(pr => (
                <button key={pr} type="button" onClick={() => set('priority', pr)}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                    form.priority === pr ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  }`}>
                  <span className={`w-2 h-2 rounded-full ${PRIORITY[pr].dot}`} />{PRIORITY[pr].label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {mode === 'new' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="form-label !mb-0">Assign to</label>
              <span className="text-xs text-gray-400">{form.assignee_ids.length} selected</span>
            </div>

            {form.assignee_ids.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {form.assignee_ids.map(id => {
                  const p = people.find(x => x.id === id);
                  if (!p) return null;
                  return (
                    <span key={id} className="inline-flex items-center gap-1.5 pl-1 pr-1.5 py-0.5 rounded-full bg-[#0D3B6E]/8 text-[#0D3B6E] text-xs font-medium">
                      <span className={`w-5 h-5 rounded-full text-[9px] font-bold text-white flex items-center justify-center ${avatarColor(p.name)}`}>{initials(p.name)}</span>
                      {p.name}
                      <button type="button" onClick={() => toggle(id)} aria-label={`Remove ${p.name}`} className="hover:text-red-600"><X className="w-3 h-3" /></button>
                    </span>
                  );
                })}
              </div>
            )}

            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50/60">
                <Search className="w-4 h-4 text-gray-400" />
                <input className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400" placeholder="Search people…" value={query} onChange={e => setQuery(e.target.value)} />
                {shown.length > 1 && (
                  <button type="button" onClick={toggleAll} className="text-xs font-semibold text-[#0D3B6E] hover:underline whitespace-nowrap">
                    {allShown ? 'Clear' : 'Select all'}
                  </button>
                )}
              </div>
              <div className="max-h-56 overflow-y-auto">
                {shown.length === 0 && <p className="text-sm text-gray-400 text-center py-6">No one matches “{query}”</p>}
                {shown.map(p => {
                  const on = form.assignee_ids.includes(p.id);
                  return (
                    <button key={p.id} type="button" onClick={() => toggle(p.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${on ? 'bg-[#0D3B6E]/5' : 'hover:bg-gray-50'}`}>
                      <span className={`w-8 h-8 rounded-full text-xs font-bold text-white flex items-center justify-center flex-shrink-0 ${avatarColor(p.name)}`}>{initials(p.name)}</span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium text-gray-900 truncate">{p.name}</span>
                        {p.job_title && <span className="block text-xs text-gray-400 truncate">{p.job_title}</span>}
                      </span>
                      <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${on ? 'bg-[#0D3B6E] border-[#0D3B6E] text-white' : 'border-gray-300'}`}>
                        {on && <Check className="w-3 h-3" strokeWidth={3} />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            {form.assignee_ids.length > 1 && <p className="form-hint">Each person gets their own copy to tick off.</p>}
          </div>
        )}
      </div>

      <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-100">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary !bg-[#0D3B6E] hover:!bg-[#0a2f58]" onClick={onSave} disabled={saving}>
          {saving ? 'Saving…' : mode === 'edit' ? 'Save changes' : form.assignee_ids.length > 1 ? `Assign to ${form.assignee_ids.length} people` : 'Assign task'}
        </button>
      </div>
    </Modal>
  );
}
