export type Status = 'todo' | 'in_progress' | 'done';
export type Priority = 'low' | 'normal' | 'high';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: Status;
  priority: Priority;
  due_date: string;
  overdue?: boolean;
  assigned_by_name?: string;
  assignee_id?: string;
  assignee_name?: string;
  completed_at?: string;
  completion_note?: string;
}
export interface Person { id: string; name: string; job_title?: string }
export interface Tally { assignee_id: string; assignee_name: string; total: number; done: number; overdue: number }

/** 'YYYY-MM-DD' in the viewer's own timezone. */
export const localDay = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Parse 'YYYY-MM-DD' as a local calendar date (not UTC midnight). */
export const fromDay = (s: string) => {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (s: string, n: number) => { const d = fromDay(s); d.setDate(d.getDate() + n); return localDay(d); };

/** Due dates are stored as midnight UTC of the calendar day; read them as that day. */
export const dueLabel = (iso: string) => {
  const day = iso.slice(0, 10);
  const today = localDay();
  if (day === today) return 'Today';
  if (day === addDays(today, -1)) return 'Yesterday';
  if (day === addDays(today, 1)) return 'Tomorrow';
  return fromDay(day).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};

export const initials = (name = '') =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?';

// A stable, readable colour per person so the same name always looks the same.
const AVATAR = ['bg-[#0D3B6E]', 'bg-teal-600', 'bg-indigo-600', 'bg-amber-600', 'bg-rose-600', 'bg-emerald-600', 'bg-sky-700', 'bg-violet-600'];
export const avatarColor = (name = '') => AVATAR[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % AVATAR.length];

export const PRIORITY: Record<Priority, { label: string; chip: string; bar: string; dot: string }> = {
  high:   { label: 'High',   chip: 'bg-red-50 text-red-700 ring-1 ring-red-100',       bar: 'bg-red-500',   dot: 'bg-red-500' },
  normal: { label: 'Normal', chip: 'bg-gray-50 text-gray-600 ring-1 ring-gray-200',    bar: 'bg-[#0D3B6E]', dot: 'bg-[#0D3B6E]' },
  low:    { label: 'Low',    chip: 'bg-sky-50 text-sky-700 ring-1 ring-sky-100',       bar: 'bg-sky-400',   dot: 'bg-sky-400' },
};

export const STATUS: Record<Status, { label: string; chip: string }> = {
  todo:        { label: 'To do',       chip: 'bg-gray-100 text-gray-600' },
  in_progress: { label: 'In progress', chip: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100' },
  done:        { label: 'Done',        chip: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100' },
};

export const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};
