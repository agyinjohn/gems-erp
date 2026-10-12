'use client';
import { useState } from 'react';
import { Check, PlayCircle, PauseCircle, Clock, ChevronDown, MessageSquareText, AlertCircle } from 'lucide-react';
import { type Task, type Status, PRIORITY, dueLabel, initials, avatarColor } from './shared';

interface Props {
  task: Task;
  busy?: boolean;
  onStatus: (task: Task, status: Status, note?: string) => void;
}

/** One task on "My tasks": tick to finish, start/pause, open for details and a note. */
export default function TaskCard({ task, busy, onStatus }: Props) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(task.completion_note || '');
  const done = task.status === 'done';
  const p = PRIORITY[task.priority];

  return (
    <div
      className={`group relative bg-white rounded-xl border transition-all ${
        done ? 'border-gray-100 bg-gray-50/60' : task.overdue ? 'border-red-100 shadow-sm' : 'border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200'
      }`}
    >
      <span className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full ${done ? 'bg-gray-200' : task.overdue ? 'bg-red-500' : p.bar}`} aria-hidden />

      <div className="flex items-start gap-3 pl-5 pr-3 sm:pr-4 py-3.5">
        <button
          type="button"
          disabled={busy}
          onClick={() => onStatus(task, done ? 'todo' : 'done')}
          aria-label={done ? 'Mark as not done' : 'Mark as done'}
          className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all disabled:opacity-50 ${
            done ? 'bg-emerald-500 border-emerald-500 text-white scale-100' : 'border-gray-300 text-transparent hover:border-emerald-500 hover:text-emerald-500 hover:bg-emerald-50'
          }`}
        >
          <Check className="w-3.5 h-3.5" strokeWidth={3} />
        </button>

        <div className="min-w-0 flex-1">
          <button type="button" onClick={() => setOpen(o => !o)} className="w-full text-left">
            <div className="flex items-start justify-between gap-2">
              <span className={`font-semibold text-[15px] leading-snug ${done ? 'text-gray-400 line-through decoration-gray-300' : 'text-gray-900'}`}>
                {task.title}
              </span>
              <ChevronDown className={`w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5 transition-transform ${open ? 'rotate-180' : ''}`} />
            </div>
            {task.description && !open && (
              <p className={`text-sm mt-0.5 line-clamp-1 ${done ? 'text-gray-300' : 'text-gray-500'}`}>{task.description}</p>
            )}
          </button>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2 text-xs">
            {!done && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold ${p.chip}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />{p.label}
              </span>
            )}
            {task.overdue && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold bg-red-50 text-red-700 ring-1 ring-red-100">
                <AlertCircle className="w-3 h-3" /> Overdue · {dueLabel(task.due_date)}
              </span>
            )}
            {task.status === 'in_progress' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold bg-amber-50 text-amber-700 ring-1 ring-amber-100">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> In progress
              </span>
            )}
            {done && task.completed_at && (
              <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                <Check className="w-3 h-3" /> Done at {new Date(task.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            {task.assigned_by_name && (
              <span className="inline-flex items-center gap-1.5 text-gray-400">
                <span className={`w-4 h-4 rounded-full text-[8px] font-bold text-white flex items-center justify-center ${avatarColor(task.assigned_by_name)}`}>
                  {initials(task.assigned_by_name)}
                </span>
                from {task.assigned_by_name}
              </span>
            )}
            {task.completion_note && !open && (
              <span className="inline-flex items-center gap-1 text-gray-400"><MessageSquareText className="w-3 h-3" /> Note</span>
            )}
          </div>

          {open && (
            <div className="mt-3 space-y-3">
              {task.description && <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{task.description}</p>}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Completion note</label>
                <textarea
                  rows={2}
                  className="form-input mt-1 resize-none text-sm"
                  placeholder="What was done, anything the assigner should know…"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {!done && (
                  <button type="button" disabled={busy} className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-3.5 py-2 rounded-lg disabled:opacity-60"
                    onClick={() => onStatus(task, 'done', note)}>
                    <Check className="w-4 h-4" /> Complete{note.trim() ? ' with note' : ''}
                  </button>
                )}
                {done && note !== (task.completion_note || '') && (
                  <button type="button" disabled={busy} className="btn-secondary" onClick={() => onStatus(task, 'done', note)}>Save note</button>
                )}
              </div>
            </div>
          )}
        </div>

        {!done && (
          <div className="flex-shrink-0 hidden sm:block">
            {task.status === 'todo' ? (
              <button type="button" disabled={busy} onClick={() => onStatus(task, 'in_progress')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0D3B6E] bg-[#0D3B6E]/5 hover:bg-[#0D3B6E]/10 px-3 py-1.5 rounded-lg disabled:opacity-60">
                <PlayCircle className="w-4 h-4" /> Start
              </button>
            ) : (
              <button type="button" disabled={busy} onClick={() => onStatus(task, 'todo')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-100 px-3 py-1.5 rounded-lg disabled:opacity-60">
                <PauseCircle className="w-4 h-4" /> Pause
              </button>
            )}
          </div>
        )}
      </div>

      {/* Phones get the start/pause action as a full-width strip instead of a side button. */}
      {!done && (
        <div className="sm:hidden border-t border-gray-50 px-5 py-2">
          <button type="button" disabled={busy} onClick={() => onStatus(task, task.status === 'todo' ? 'in_progress' : 'todo')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0D3B6E]">
            {task.status === 'todo' ? <><PlayCircle className="w-4 h-4" /> Start working</> : <><Clock className="w-4 h-4" /> Pause</>}
          </button>
        </div>
      )}
    </div>
  );
}
