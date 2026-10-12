export type Health = 'on_track' | 'at_risk' | 'off_track';
export type Frequency = 'weekly' | 'biweekly' | 'monthly' | 'none';

export interface ReportStatus {
  frequency: Frequency;
  last_report_at: string | null;
  last_health: Health | null;
  report_count: number | null;
  next_due: string | null;
  overdue: boolean;
}

export const HEALTH: Record<Health, { label: string; dot: string; chip: string; ring: string; text: string }> = {
  // Neutral chips everywhere; only the small dot carries the green/amber/red.
  on_track:  { label: 'On track',  dot: 'bg-emerald-500', chip: 'bg-gray-100 text-gray-700', ring: 'ring-[#0D3B6E]', text: 'text-gray-700' },
  at_risk:   { label: 'At risk',   dot: 'bg-amber-500',   chip: 'bg-gray-100 text-gray-700', ring: 'ring-[#0D3B6E]', text: 'text-gray-700' },
  off_track: { label: 'Off track', dot: 'bg-red-500',     chip: 'bg-gray-100 text-gray-700', ring: 'ring-[#0D3B6E]', text: 'text-gray-700' },
};

export const FREQUENCY: Record<Frequency, string> = {
  weekly: 'Every week',
  biweekly: 'Every 2 weeks',
  monthly: 'Every month',
  none: 'No schedule',
};

const DAY = 86400000;

/** "Due in 3 days", "Due today", "4 days overdue" — relative to now. */
export function dueText(status: ReportStatus | null | undefined): string | null {
  if (!status?.next_due) return null;
  const days = Math.ceil((new Date(status.next_due).getTime() - Date.now()) / DAY);
  if (status.overdue) {
    const late = Math.max(1, -days);
    return `${late} day${late === 1 ? '' : 's'} overdue`;
  }
  if (days <= 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `Due in ${days} days`;
}

export const ago = (iso: string | null | undefined) => {
  if (!iso) return 'never';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / DAY);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

export const initials = (name = '') =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?';
