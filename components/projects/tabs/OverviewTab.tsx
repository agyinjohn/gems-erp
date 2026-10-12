'use client';
import { AlertTriangle, CalendarClock, CheckCircle2, ClipboardList, FileText, Flag, Users } from 'lucide-react';
import type { Milestone, Task } from '../types';
import { HEALTH, FREQUENCY, dueText, ago, initials, type ReportStatus } from '../reporting';

interface Props {
  project: any;
  milestones: Milestone[];
  tasks: Task[];
  reportStatus: ReportStatus | null;
  isLead: boolean;
  stageWord: string;
  stagesWord: string;
  onGo: (tab: 'reports' | 'progress') => void;
}

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

/** The page a lead or manager opens a project to: who, how it's going, what's next. */
export default function OverviewTab({ project, milestones, tasks, reportStatus, isLead, stageWord, stagesWord, onGo }: Props) {
  const lead = project.manager_id && typeof project.manager_id === 'object' ? project.manager_id : null;
  const team: { _id?: string; id?: string; name: string; job_title?: string }[] = Array.isArray(project.team) ? project.team.filter((t: any) => t && typeof t === 'object') : [];
  const now = Date.now();

  const openTasks = tasks.filter(t => t.status !== 'done');
  const lateTasks = openTasks.filter(t => t.due_date && new Date(t.due_date).getTime() < now);
  const blocked = tasks.filter(t => t.status === 'blocked');
  const upcoming = milestones
    .filter(m => m.status !== 'completed')
    .sort((a, b) => new Date(a.planned_end || 8.64e15).getTime() - new Date(b.planned_end || 8.64e15).getTime())
    .slice(0, 4);

  const health = reportStatus?.last_health ? HEALTH[reportStatus.last_health] : null;
  const due = dueText(reportStatus);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Reporting status */}
      <div className={`lg:col-span-2 rounded-xl border p-5 ${reportStatus?.overdue ? 'border-red-200 bg-red-50/40' : 'border-gray-100 bg-white shadow-sm'}`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Status reporting</p>
            <div className="flex items-center gap-2 mt-1.5">
              {health ? (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-semibold ${health.chip}`}>
                  <span className={`w-2 h-2 rounded-full ${health.dot}`} />{health.label}
                </span>
              ) : <span className="text-sm text-gray-500">No report filed yet</span>}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Last report {ago(reportStatus?.last_report_at)} · {FREQUENCY[reportStatus?.frequency || 'weekly']}
              {due && <> · <span className={reportStatus?.overdue ? 'text-red-600 font-semibold' : 'text-gray-700 font-medium'}>{due}</span></>}
            </p>
          </div>
          <button type="button" className={reportStatus?.overdue && isLead ? 'btn-primary !bg-red-600 hover:!bg-red-700' : 'btn-secondary'} onClick={() => onGo('reports')}>
            <FileText className="w-4 h-4" /> {isLead ? (reportStatus?.overdue ? 'Write overdue report' : 'Write a report') : 'View reports'}
          </button>
        </div>
      </div>

      {/* Lead */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Project lead</p>
        {lead ? (
          <div className="flex items-center gap-3 mt-3">
            <span className="w-11 h-11 rounded-full bg-[#0D3B6E] text-white font-bold flex items-center justify-center">{initials(lead.name)}</span>
            <div className="min-w-0">
              <div className="font-semibold text-gray-900 truncate">{lead.name}{isLead && <span className="text-xs text-[#0D3B6E] font-medium"> (you)</span>}</div>
              {lead.job_title && <div className="text-xs text-gray-500 truncate">{lead.job_title}</div>}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500 mt-3 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 text-amber-500" /> No lead assigned</p>
        )}
      </div>

      {/* Work at a glance */}
      <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Coming up</p>
          <button type="button" className="text-xs font-semibold text-[#0D3B6E] hover:underline" onClick={() => onGo('progress')}>All {stagesWord.toLowerCase()} & tasks →</button>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Open tasks', value: openTasks.length, icon: ClipboardList, tone: 'text-[#0D3B6E] bg-[#0D3B6E]/5' },
            { label: 'Past due', value: lateTasks.length, icon: CalendarClock, tone: lateTasks.length ? 'text-red-600 bg-red-50' : 'text-gray-400 bg-gray-50' },
            { label: 'Blocked', value: blocked.length, icon: AlertTriangle, tone: blocked.length ? 'text-amber-600 bg-amber-50' : 'text-gray-400 bg-gray-50' },
          ].map(k => (
            <div key={k.label} className="rounded-lg border border-gray-100 p-3 flex items-center gap-2.5">
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${k.tone}`}><k.icon className="w-4 h-4" /></span>
              <div><div className="text-lg font-extrabold text-gray-900 leading-none">{k.value}</div><div className="text-[11px] text-gray-500 mt-0.5">{k.label}</div></div>
            </div>
          ))}
        </div>
        {upcoming.length === 0 ? (
          <p className="text-sm text-gray-400 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> {milestones.length ? `Every ${stageWord.toLowerCase()} is complete.` : `No ${stagesWord.toLowerCase()} planned yet.`}</p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map(m => {
              const end = m.planned_end;
              const late = end && new Date(end).getTime() < now;
              return (
                <li key={m.id} className="flex items-center gap-3">
                  <Flag className={`w-4 h-4 flex-shrink-0 ${late ? 'text-red-500' : 'text-gray-300'}`} />
                  <span className="flex-1 min-w-0 text-sm font-medium text-gray-800 truncate">{m.name}</span>
                  <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden hidden sm:block">
                    <div className="h-full bg-[#0D3B6E] rounded-full" style={{ width: `${Math.round(m.progress_pct || 0)}%` }} />
                  </div>
                  <span className={`text-xs w-24 text-right ${late ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>{end ? fmt(end) : 'No date'}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Team + dates */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Team</p>
          {team.length === 0 ? (
            <p className="text-sm text-gray-400 mt-2">No team members yet.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {team.slice(0, 8).map(t => (
                <li key={t._id || t.id} className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 text-[10px] font-bold flex items-center justify-center">{initials(t.name)}</span>
                  <span className="text-sm text-gray-800 truncate">{t.name}</span>
                </li>
              ))}
              {team.length > 8 && <li className="text-xs text-gray-400">+{team.length - 8} more</li>}
            </ul>
          )}
        </div>
        <div className="border-t border-gray-100 pt-4 grid grid-cols-2 gap-3 text-sm">
          <div><div className="text-xs text-gray-400">Start</div><div className="font-medium text-gray-800">{fmt(project.start_date)}</div></div>
          <div><div className="text-xs text-gray-400">Planned finish</div><div className="font-medium text-gray-800">{fmt(project.planned_end_date)}</div></div>
        </div>
      </div>
    </div>
  );
}
