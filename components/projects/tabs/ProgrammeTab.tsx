'use client';
import { useState } from 'react';
import api from '@/lib/api';
import { toast } from '@/components/ui';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertTriangle, Flag, Lock, Info } from 'lucide-react';
import type { TabProps } from '@/components/projects/shared';
import { STATUS_TONE, label } from '@/components/projects/shared';
import type { Schedule, BaselineRow } from '@/components/projects/types';

/**
 * Progress measured against the programme frozen at the start.
 *
 * Live dates get edited as a job moves, which is what they are for — the
 * frozen copy is the only thing that makes lateness measurable at all.
 */
interface Props extends TabProps {
  schedule: Schedule | null;
  baselines: BaselineRow[];
}

export default function ProgrammeTab({
  projectId, canManage, money, reload, schedule, baselines
}: Props) {
  const [baseForm, setBaseForm] = useState({ name: '', reason: '' });
  const [planBusy, setPlanBusy] = useState(false);

  const freezeBaseline = async () => {
    setPlanBusy(true);
    try {
      const r = await api.post(`/projects/${projectId}/baseline`, {
        name: baseForm.name || undefined,
        reason: baseForm.reason || undefined,
      });
      toast.success(`${r.data.data.name} frozen as v${r.data.data.version}`);
      setBaseForm({ name: '', reason: '' });
      await reload();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not freeze the programme');
    } finally { setPlanBusy(false); }
  };

  const s = schedule;
  const slipTone = (n: number | null | undefined) =>
    n === null || n === undefined ? 'text-gray-400' : n > 0 ? 'text-red-600' : n < 0 ? 'text-green-600' : 'text-gray-700';
  const slipText = (n: number | null | undefined) =>
    n === null || n === undefined ? '—' : n > 0 ? `${n}d late` : n < 0 ? `${-n}d early` : 'on time';
  const date = (d?: string | null) => (d ? new Date(d).toLocaleDateString() : '—');

  const freezeForm = (
    <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
      <div className="sm:col-span-2">
        <label className="form-label text-xs">Name</label>
        <input className="form-input" placeholder={s?.has_baseline ? 'e.g. Revision after EOT 1' : 'Award programme'}
          value={baseForm.name} onChange={e => setBaseForm(f => ({ ...f, name: e.target.value }))} />
      </div>
      <div className="sm:col-span-2">
        <label className="form-label text-xs">Reason</label>
        <input className="form-input" placeholder="Why the programme is being re-frozen"
          value={baseForm.reason} onChange={e => setBaseForm(f => ({ ...f, reason: e.target.value }))} />
      </div>
      <div className="flex items-end">
        <button type="button" className={`w-full justify-center ${s?.has_baseline ? 'btn-secondary' : 'btn-primary'}`}
          onClick={freezeBaseline} disabled={planBusy}>
          <Lock className="w-4 h-4" /> {planBusy ? 'Freezing…' : s?.has_baseline ? 'Re-baseline' : 'Freeze'}
        </button>
      </div>
    </div>
  );

  if (!s?.has_baseline) {
    return (
      <div className="card">
        <div className="text-center py-8 max-w-lg mx-auto">
          <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Flag className="w-7 h-7 text-gray-300" />
          </div>
          <p className="font-semibold text-gray-700 text-base">No programme frozen yet</p>
          <p className="text-sm text-gray-500 mt-2">
            Milestone dates get edited as the job moves — which is what they are for, but it means
            the dates originally agreed disappear. Freezing a copy is what makes slip measurable,
            and it is the only way to say how much of the job <em>should</em> be done by today.
          </p>
          <p className="text-sm text-gray-400 mt-2">
            Freeze it once the stages and the completion date are agreed. You can re-baseline later
            — earlier versions are kept.
          </p>
        </div>
        {canManage && <div className="border-t border-gray-100 pt-4">{freezeForm}</div>}
      </div>
    );
  }

  const statusTone =
    s.status === 'ahead' ? 'text-green-600' :
    s.status === 'on_track' ? 'text-gray-900' : 'text-red-600';

  return (
    <>
      {/* Baseline banner */}
      <div className="card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Lock className="w-3.5 h-3.5 text-gray-400" />
              <span className="font-bold text-gray-900 text-sm">{s.baseline!.name}</span>
              <span className="badge bg-blue-50 text-[#0D3B6E]">v{s.baseline!.version}</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Frozen {date(s.baseline!.set_on)} · {s.baseline!.milestone_count} stages ·
              {' '}{money(s.baseline!.contract_value)} contract at the time
            </p>
            {s.baseline!.reason && <p className="text-xs text-gray-500 mt-1">{s.baseline!.reason}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Agreed finish</p>
            <p className="font-bold text-gray-900">{date(s.baseline_end_date)}</p>
            {s.completion_slip_days !== null && s.completion_slip_days !== 0 && (
              <p className={`text-xs font-semibold ${slipTone(s.completion_slip_days)}`}>
                now {date(s.current_end_date)} · {slipText(s.completion_slip_days)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Schedule KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Planned by now</p>
          <p className="text-2xl font-extrabold text-gray-900 mt-1">{Math.round(s.planned_pct || 0)}%</p>
          <p className="text-xs text-gray-400 mt-1">{money(s.planned_value || 0)} of work</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Actually done</p>
          <p className={`text-2xl font-extrabold mt-1 ${statusTone}`}>{Math.round(s.actual_pct)}%</p>
          <p className="text-xs text-gray-400 mt-1">{money(s.earned_value || 0)} earned</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Schedule index</p>
          <p className={`text-2xl font-extrabold mt-1 ${statusTone}`}>{s.spi === null || s.spi === undefined ? '—' : s.spi.toFixed(2)}</p>
          <p className="text-xs text-gray-400 mt-1">
            {s.status === 'ahead' ? 'Ahead of programme'
              : s.status === 'on_track' ? 'Broadly on programme'
              : s.status === 'behind' ? 'Behind programme' : 'Not enough to judge'}
          </p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Finish at this rate</p>
          <p className="text-2xl font-extrabold text-gray-900 mt-1">
            {s.forecast_end_date ? new Date(s.forecast_end_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}
          </p>
          <p className={`text-xs mt-1 font-semibold ${slipTone(s.forecast_slip_days)}`}>
            {s.forecast_end_date ? slipText(s.forecast_slip_days) : 'Too early to project'}
          </p>
        </div>
      </div>

      {(s.schedule_variance || 0) < 0 && (
        <div className="flex items-start gap-2.5 bg-amber-50 text-amber-800 rounded-xl px-4 py-3 text-sm">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            {money(Math.abs(s.schedule_variance || 0))} less work has been done than the programme called for
            by today — {Math.round(s.actual_pct)}% against {Math.round(s.planned_pct || 0)}%.
          </span>
        </div>
      )}

      {/* S-curve */}
      <div className="card">
        <div className="mb-4">
          <h2 className="font-bold text-gray-900">Planned against actual</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            The gap between the two lines is the delay, read in work rather than in days.
          </p>
        </div>
        <ResponsiveContainer width="100%" height={260} minWidth={0}>
          <LineChart data={s.curve} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} />
            <Tooltip formatter={(v: any) => (v === null ? '—' : `${Math.round(v)}%`)} />
            <Line type="monotone" dataKey="planned_pct" name="Planned" stroke="#94a3b8"
              strokeWidth={2} strokeDasharray="5 4" dot={false} />
            <Line type="monotone" dataKey="actual_pct" name="Actual" stroke="#0D3B6E"
              strokeWidth={2.5} dot={{ r: 2 }} connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-2 justify-center">
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="w-4 border-t-2 border-dashed border-gray-400 inline-block" /> Planned
          </span>
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="w-4 border-t-2 border-[#0D3B6E] inline-block" /> Actual
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-3 flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 mt-px flex-shrink-0" />
          Past months are rebuilt from the dates stages were signed off, so the line steps rather
          than curves. The current month uses the live weighted figure, which counts part-finished work.
        </p>
      </div>

      {/* Milestone slip */}
      <div className="card">
        <div className="mb-4">
          <h2 className="font-bold text-gray-900">Stage by stage</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Re-planned is how far a date has been moved. Delivered is how late it actually finished.
          </p>
        </div>
        <div className="table-wrap">
          <table className="w-full text-sm min-w-[680px]">
            <thead>
              <tr className="table-header text-left">
                <th className="px-4 py-2.5">Stage</th>
                <th className="px-4 py-2.5">Agreed</th>
                <th className="px-4 py-2.5">Now</th>
                <th className="px-4 py-2.5">Re-planned</th>
                <th className="px-4 py-2.5">Delivered</th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {s.milestones.map(m => (
                <tr key={m.milestone_id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className={m.removed ? 'text-gray-400 line-through' : 'text-gray-800'}>{m.name}</span>
                    {m.added_since_baseline && <span className="ml-2 badge bg-blue-50 text-blue-700">Added since</span>}
                    {m.removed && <span className="ml-2 badge bg-gray-100 text-gray-500">Removed</span>}
                    {m.renamed_from && <p className="text-xs text-gray-400">was “{m.renamed_from}”</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{date(m.baseline_end)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{date(m.current_end)}</td>
                  <td className={`px-4 py-3 text-xs font-semibold whitespace-nowrap ${slipTone(m.plan_slip_days)}`}>
                    {slipText(m.plan_slip_days)}
                  </td>
                  <td className={`px-4 py-3 text-xs font-semibold whitespace-nowrap ${slipTone(m.actual_slip_days)}`}>
                    {m.actual_end ? slipText(m.actual_slip_days) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {m.days_late > 0 ? (
                      <span className="badge bg-red-50 text-red-600">{m.days_late}d overdue</span>
                    ) : (
                      <span className={`badge ${STATUS_TONE[m.status] || 'bg-gray-100 text-gray-600'}`}>{label(m.status)}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Re-baseline */}
      {canManage && (
        <div className="card">
          <div className="mb-4">
            <h2 className="font-bold text-gray-900">Re-baseline</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Freeze the programme again — normally after an extension of time is granted. The current
              version is kept, not overwritten: a programme revised three times is itself the record.
            </p>
          </div>
          {freezeForm}

          {baselines.length > 1 && (
            <div className="mt-5 pt-4 border-t border-gray-100 space-y-1.5">
              <p className="form-label">Earlier versions</p>
              {baselines.filter(b => !b.is_current).map(b => (
                <div key={b.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-2.5 ring-1 ring-gray-100">
                  <span className="badge bg-gray-100 text-gray-600 flex-shrink-0">v{b.version}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-800 truncate">{b.name}</p>
                    {b.reason && <p className="text-xs text-gray-400 truncate">{b.reason}</p>}
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0 whitespace-nowrap">
                    finish {date(b.planned_end_date)}
                  </span>
                  <span className="text-xs text-gray-400 flex-shrink-0 hidden sm:inline">
                    {date(b.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
