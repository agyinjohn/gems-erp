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

// One brand colour for every avatar; the initials do the identifying.
export const avatarColor = (_name = '') => 'bg-[#0D3B6E]';

export const PRIORITY: Record<Priority, { label: string; chip: string; bar: string; dot: string }> = {
  high:   { label: 'High',   chip: 'bg-gray-100 text-gray-700', bar: 'bg-[#0D3B6E]',   dot: 'bg-red-500' },
  normal: { label: 'Normal', chip: 'bg-gray-100 text-gray-600', bar: 'bg-transparent', dot: 'bg-gray-400' },
  low:    { label: 'Low',    chip: 'bg-gray-100 text-gray-500', bar: 'bg-transparent', dot: 'bg-gray-300' },
};

export const STATUS: Record<Status, { label: string; chip: string }> = {
  todo:        { label: 'To do',       chip: 'bg-gray-100 text-gray-600' },
  in_progress: { label: 'In progress', chip: 'bg-[#0D3B6E]/8 text-[#0D3B6E]' },
  done:        { label: 'Done',        chip: 'bg-gray-100 text-gray-500' },
};

export const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};
