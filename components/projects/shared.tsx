import { X, FileText, Activity, CheckCircle2, PauseCircle } from 'lucide-react';
import type { ProjectTypeProfile } from '@/lib/projectTypes';

/**
 * Vocabulary and tone shared across the project tabs.
 *
 * Kept out of the individual tabs so two of them can't disagree about what
 * colour a status is or how a name reads.
 */

export const WEATHER = ['fine', 'overcast', 'light_rain', 'heavy_rain', 'storm'];
export const WEATHER_LABEL: Record<string, string> = {
  fine: 'Fine', overcast: 'Overcast', light_rain: 'Light rain', heavy_rain: 'Heavy rain', storm: 'Storm',
};

export const ENTITLEMENT_TONE: Record<string, string> = {
  time_and_cost:  'bg-green-50 text-green-700',
  time_only:      'bg-blue-50 text-blue-700',
  no_entitlement: 'bg-gray-100 text-gray-500',
  unclassified:   'bg-amber-50 text-amber-700',
};
export const ENTITLEMENT_LABEL: Record<string, string> = {
  time_and_cost:  'Time and cost',
  time_only:      'Time only',
  no_entitlement: 'No entitlement',
  unclassified:   'Needs a decision',
};
export const CLAIM_TONE: Record<string, string> = {
  draft:             'bg-gray-100 text-gray-600',
  submitted:         'bg-amber-50 text-amber-700',
  granted:           'bg-green-50 text-green-700',
  partially_granted: 'bg-blue-50 text-blue-700',
  rejected:          'bg-red-50 text-red-600',
  withdrawn:         'bg-gray-100 text-gray-400',
};

export const MILESTONE_STATUS = ['not_started', 'in_progress', 'completed', 'blocked'];
export const label = (s: string) => (s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
/** "an application", but "a invoice" is wrong — pick from the actual word. */
export const article = (word: string) => ('aeiou'.includes((word[0] || '').toLowerCase()) ? 'an' : 'a');

export const STATUS_TONE: Record<string, string> = {
  not_started: 'bg-gray-100 text-gray-600', in_progress: 'bg-amber-50 text-amber-700',
  completed: 'bg-green-50 text-green-700', blocked: 'bg-red-50 text-red-600',
  todo: 'bg-gray-100 text-gray-600', done: 'bg-green-50 text-green-700',
  pending: 'bg-amber-50 text-amber-700', approved: 'bg-green-50 text-green-700', rejected: 'bg-red-50 text-red-600',
};

export const PROJECT_STATUS_STYLE: Record<string, string> = {
  draft:     'bg-gray-100 text-gray-600',
  active:    'bg-green-50 text-green-700',
  on_hold:   'bg-amber-50 text-amber-700',
  completed: 'bg-blue-50 text-blue-700',
  cancelled: 'bg-red-50 text-red-600',
};

export const PROJECT_STATUS_ICON: Record<string, React.ReactNode> = {
  draft:     <FileText className="w-3 h-3" />,
  active:    <Activity className="w-3 h-3" />,
  on_hold:   <PauseCircle className="w-3 h-3" />,
  completed: <CheckCircle2 className="w-3 h-3" />,
  cancelled: <X className="w-3 h-3" />,
};

/**
 * What every tab is given.
 *
 * Deliberately the same shape for all of them: the project and its type
 * profile, who is allowed to act, a way to format money in the project's own
 * currency, a reload, and a confirmation the page owns so a single dialog
 * serves the lot.
 */
export interface TabProps {
  projectId: string;
  project: any;
  profile: ProjectTypeProfile;
  canManage: boolean;
  isOwner: boolean;
  money: (n: number) => string;
  reload: () => Promise<void>;
  confirmAction: (c: { title: string; message: string; danger?: boolean; run: () => void }) => void;
  /** Confirm-then-delete, wired to the page's single dialog. */
  removeIt: (what: string, url: string, name: string) => void;
}
