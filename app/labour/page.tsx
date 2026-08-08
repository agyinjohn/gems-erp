'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import api from '@/lib/api';
import { toast } from '@/components/ui';
import {
  RefreshCw, Plus, Trash2, HardHat, AlertTriangle, Check,
  ChevronRight, Info, Filter, Clock,
} from 'lucide-react';

interface Allocation {
  id: string; project_id: string | null; project_code: string | null; project_name: string | null;
  hours: number; cost: number; source: string; notes: string;
}
interface BoardRow {
  attendance_id: string; employee_id: string; employee_name: string; employee_code: string;
  job_title: string; date: string; status: string;
  attended_hours: number; overtime_hours: number;
  hourly_rate: number; rate_basis: string; day_cost: number;
  allocated_hours: number; manual_hours: number; unallocated_hours: number;
  allocatable_hours: number; allocated_cost: number; unattributed_cost: number;
  allocations: Allocation[];
}
interface Summary {
  days: number; employees: number;
  attended_hours: number; allocated_hours: number; unallocated_hours: number;
  wage_cost: number; allocated_cost: number; unattributed_cost: number;
  allocated_pct: number; days_with_gap: number; missing_rate_employees: number;
}
interface ProjectOption { id: string; _id?: string; code: string; name: string; status: string }
interface ByProject {
  project_id: string; code: string; name: string; status: string;
  hours: number; cost: number; people: number; days: number;
}

const money = (n: number) =>
  `GHS ${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const RATE_NOTE: Record<string, string> = {
  override: 'Rate set on the employee',
  derived: 'From the monthly salary',
  unknown: 'No salary or rate recorded',
};

/** Monday of the week containing d, and the Sunday after it. */
function weekOf(d: Date) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  const from = new Date(x); from.setDate(x.getDate() - day);
  const to = new Date(from); to.setDate(from.getDate() + 6);
  const iso = (v: Date) => v.toISOString().slice(0, 10);
  return { from: iso(from), to: iso(to) };
}

export default function LabourPage() {
  const thisWeek = useMemo(() => weekOf(new Date()), []);
  const [range, setRange] = useState(thisWeek);
  const [gapsOnly, setGapsOnly] = useState(true);
  const [rows, setRows] = useState<BoardRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [byProject, setByProject] = useState<ByProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ project_id: string; hours: string; notes: string }[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [b, p] = await Promise.all([
        api.get('/labour/board', { params: { from: range.from, to: range.to, unallocated_only: gapsOnly } }),
        api.get('/labour/by-project', { params: { from: range.from, to: range.to } }),
      ]);
      setRows(b.data.data.rows || []);
      setSummary(b.data.data.summary);
      setByProject(p.data.data || []);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not load the labour board');
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to, gapsOnly]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    api.get('/projects').then(r => setProjects(r.data.data || [])).catch(() => {});
  }, []);

  const openRow = (r: BoardRow) => {
    if (open === r.attendance_id) { setOpen(null); return; }
    setOpen(r.attendance_id);
    // Start from what the day already carries, so an edit is an edit rather
    // than a retype. Manual bookings aren't shown — they aren't ours to move.
    const existing = r.allocations.filter(a => a.source === 'attendance');
    setDraft(existing.length
      ? existing.map(a => ({ project_id: a.project_id || '', hours: String(a.hours), notes: a.notes }))
      : [{ project_id: '', hours: String(r.allocatable_hours), notes: '' }]);
  };

  const draftTotal = draft.reduce((s, d) => s + (parseFloat(d.hours) || 0), 0);

  const save = async (r: BoardRow) => {
    const allocations = draft
      .filter(d => d.project_id && (parseFloat(d.hours) || 0) > 0)
      .map(d => ({ project_id: d.project_id, hours: parseFloat(d.hours), notes: d.notes || undefined }));
    setSaving(true);
    try {
      await api.post('/labour/allocate', {
        employee_id: r.employee_id,
        work_date: r.date,
        allocations,
      });
      toast.success(allocations.length
        ? `${r.employee_name}'s day allocated`
        : `${r.employee_name}'s day cleared`);
      setOpen(null);
      await load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not save the allocation');
    } finally { setSaving(false); }
  };

  const shiftWeek = (weeks: number) => {
    const base = new Date(`${range.from}T00:00:00`);
    base.setDate(base.getDate() + weeks * 7);
    setRange(weekOf(base));
  };

  return (
    <AppLayout
      title="Labour"
      subtitle="Split attended days across the jobs they were spent on"
      allowedRoles={['platform_admin', 'business_owner', 'branch_manager', 'accountant']}
    >
      <div className="space-y-5">

        {/* Why this page exists */}
        <div className="flex items-start gap-2.5 bg-blue-50 text-blue-900 rounded-xl px-4 py-3 text-sm">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            Attendance records that someone was here, not what they worked on. Until a day is split
            across jobs, its wages sit outside every project&apos;s cost — so margins read high and
            cost forecasts read low.
          </span>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className={`card ${(summary?.unattributed_cost || 0) > 0 ? 'ring-1 ring-amber-200 bg-amber-50/40' : ''}`}>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Wages not on a job</p>
            <p className={`text-2xl font-extrabold mt-1 ${(summary?.unattributed_cost || 0) > 0 ? 'text-amber-700' : 'text-green-600'}`}>
              {money(summary?.unattributed_cost || 0)}
            </p>
            <p className="text-xs text-gray-400 mt-1">{summary?.unallocated_hours || 0}h unattributed</p>
          </div>
          <div className="card">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Time attributed</p>
            <p className="text-2xl font-extrabold text-gray-900 mt-1">{Math.round(summary?.allocated_pct || 0)}%</p>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-2">
              <div className="h-full bg-[#0D3B6E] rounded-full transition-all" style={{ width: `${summary?.allocated_pct || 0}%` }} />
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              {summary?.allocated_hours || 0} of {summary?.attended_hours || 0} hours
            </p>
          </div>
          <div className="card">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Wage bill</p>
            <p className="text-2xl font-extrabold text-gray-900 mt-1">{money(summary?.wage_cost || 0)}</p>
            <p className="text-xs text-gray-400 mt-1">{money(summary?.allocated_cost || 0)} on jobs</p>
          </div>
          <div className="card">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Days to finish</p>
            <p className={`text-2xl font-extrabold mt-1 ${(summary?.days_with_gap || 0) > 0 ? 'text-amber-700' : 'text-green-600'}`}>
              {summary?.days_with_gap || 0}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              of {summary?.days || 0} attended · {summary?.employees || 0} people
            </p>
          </div>
        </div>

        {!!summary?.missing_rate_employees && (
          <div className="flex items-start gap-2.5 bg-amber-50 text-amber-800 rounded-xl px-4 py-3 text-sm">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              {summary.missing_rate_employees} {summary.missing_rate_employees === 1 ? 'person has' : 'people have'} no
              salary or hourly rate on record, so their time can be allocated but not costed. Set a rate
              in <Link href="/hr" className="underline font-semibold">HR</Link> to have it count.
            </span>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn-secondary" onClick={() => shiftWeek(-1)}>←</button>
          <div className="flex items-center gap-2">
            <input type="date" className="form-input !w-auto" value={range.from}
              onChange={e => setRange(r => ({ ...r, from: e.target.value }))} />
            <span className="text-gray-400 text-sm">to</span>
            <input type="date" className="form-input !w-auto" value={range.to}
              onChange={e => setRange(r => ({ ...r, to: e.target.value }))} />
          </div>
          <button type="button" className="btn-secondary" onClick={() => shiftWeek(1)}>→</button>
          <button type="button" className="btn-ghost text-sm" onClick={() => setRange(thisWeek)}>This week</button>

          <button
            type="button"
            className={gapsOnly ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setGapsOnly(v => !v)}
          >
            <Filter className="w-4 h-4" /> {gapsOnly ? 'Unfinished days' : 'All days'}
          </button>
          <button type="button" onClick={load} className="btn-secondary ml-auto" disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* Board */}
        {loading && !rows.length ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <div key={i} className="card animate-pulse h-20" />)}
          </div>
        ) : rows.length === 0 ? (
          <div className="card text-center py-16">
            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              {gapsOnly ? <Check className="w-7 h-7 text-green-400" /> : <HardHat className="w-7 h-7 text-gray-300" />}
            </div>
            <p className="font-semibold text-gray-700 text-base">
              {gapsOnly ? 'Every attended day is accounted for' : 'No attendance in this period'}
            </p>
            <p className="text-sm text-gray-400 mt-1 max-w-sm mx-auto">
              {gapsOnly
                ? 'Nothing in this period is waiting to be split across jobs.'
                : 'Nobody was recorded as present between these dates, so there are no hours to allocate.'}
            </p>
            {gapsOnly && (
              <button type="button" className="btn-secondary mt-5 mx-auto" onClick={() => setGapsOnly(false)}>
                Show all days
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map(r => {
              const isOpen = open === r.attendance_id;
              const pct = r.attended_hours > 0
                ? Math.min(100, (r.allocated_hours / r.attended_hours) * 100) : 0;

              return (
                <div key={r.attendance_id} className="card !p-0 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => openRow(r)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900 text-sm">{r.employee_name}</span>
                          {r.employee_code && <span className="text-xs font-mono text-gray-400">{r.employee_code}</span>}
                          <span className="text-xs text-gray-500">
                            {new Date(r.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
                          </span>
                          {r.overtime_hours > 0 && (
                            <span className="badge bg-amber-50 text-amber-700">{r.overtime_hours}h overtime</span>
                          )}
                          {r.hourly_rate <= 0 && (
                            <span className="badge bg-red-50 text-red-600">No rate</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden flex-1 max-w-[220px]">
                            <div
                              className={`h-full rounded-full transition-all ${
                                r.unallocated_hours === 0 ? 'bg-green-500' : 'bg-[#0D3B6E]'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">
                            {r.allocated_hours} / {r.attended_hours}h
                          </span>
                          {r.unallocated_hours > 0 && (
                            <span className="text-xs font-semibold text-amber-700">
                              {r.unallocated_hours}h left · {money(r.unattributed_cost)}
                            </span>
                          )}
                        </div>
                        {r.allocations.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {r.allocations.map(a => (
                              <span key={a.id}
                                className={`text-xs px-2 py-0.5 rounded-full ${
                                  a.source === 'manual' ? 'bg-gray-100 text-gray-500' : 'bg-blue-50 text-[#0D3B6E]'
                                }`}>
                                {a.project_code || 'Project'} {a.hours}h
                                {a.source === 'manual' && ' · booked directly'}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-gray-900">{money(r.day_cost)}</p>
                        <p className="text-xs text-gray-400">{money(r.hourly_rate)}/h</p>
                      </div>
                      <ChevronRight className={`w-4 h-4 text-gray-300 flex-shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-gray-100 px-4 py-4 bg-gray-50/60">
                      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                        <p className="form-label !mb-0">Split this day</p>
                        <p className="text-xs text-gray-500">
                          {r.allocatable_hours}h available
                          {r.manual_hours > 0 && ` · ${r.manual_hours}h already booked directly`}
                          {' · '}{RATE_NOTE[r.rate_basis]}
                        </p>
                      </div>

                      <div className="space-y-2">
                        {draft.map((d, i) => (
                          <div key={i} className="grid grid-cols-1 sm:grid-cols-[2fr_100px_2fr_auto] gap-2 items-center">
                            <select className="form-input" value={d.project_id}
                              onChange={e => setDraft(v => v.map((x, xi) => xi === i ? { ...x, project_id: e.target.value } : x))}>
                              <option value="">Choose a project…</option>
                              {projects.map(p => (
                                <option key={p.id || p._id} value={p.id || p._id}>{p.code} — {p.name}</option>
                              ))}
                            </select>
                            <input type="number" min={0} step="0.5" className="form-input" placeholder="hrs"
                              value={d.hours}
                              onChange={e => setDraft(v => v.map((x, xi) => xi === i ? { ...x, hours: e.target.value } : x))} />
                            <input className="form-input" placeholder="What was done (optional)"
                              value={d.notes}
                              onChange={e => setDraft(v => v.map((x, xi) => xi === i ? { ...x, notes: e.target.value } : x))} />
                            <button type="button" className="text-gray-400 hover:text-red-500"
                              onClick={() => setDraft(v => v.filter((_, xi) => xi !== i))}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        <button type="button" className="btn-ghost text-xs"
                          onClick={() => setDraft(v => [...v, { project_id: '', hours: '', notes: '' }])}>
                          <Plus className="w-3.5 h-3.5" /> Add a project
                        </button>
                        <span className={`text-xs font-semibold ${
                          draftTotal > r.allocatable_hours ? 'text-red-600'
                          : draftTotal === r.allocatable_hours ? 'text-green-600' : 'text-gray-500'
                        }`}>
                          <Clock className="w-3.5 h-3.5 inline mr-1" />
                          {draftTotal} of {r.allocatable_hours}h
                          {draftTotal > r.allocatable_hours && ' — more than was worked'}
                        </span>
                      </div>

                      <div className="flex gap-2 mt-4">
                        <button type="button" className="btn-primary !py-1.5 text-xs"
                          disabled={saving || draftTotal > r.allocatable_hours}
                          onClick={() => save(r)}>
                          {saving ? 'Saving…' : 'Save the day'}
                        </button>
                        <button type="button" className="btn-secondary !py-1.5 text-xs" onClick={() => setOpen(null)}>
                          Cancel
                        </button>
                        {r.allocations.some(a => a.source === 'attendance') && (
                          <button type="button" className="btn-ghost !py-1.5 text-xs ml-auto"
                            onClick={() => setDraft([])}>
                            Clear all
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Where the accounted-for time went */}
        {byProject.length > 0 && (
          <div className="card">
            <div className="mb-4">
              <h2 className="font-bold text-gray-900">Labour by project</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Time booked to each job over this period, whether split from attendance or entered directly.
              </p>
            </div>
            <div className="table-wrap">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr className="table-header text-left">
                    <th className="px-4 py-2.5">Project</th>
                    <th className="px-4 py-2.5 text-right">Hours</th>
                    <th className="px-4 py-2.5 text-right">Cost</th>
                    <th className="px-4 py-2.5 text-right">People</th>
                    <th className="px-4 py-2.5 text-right">Days</th>
                  </tr>
                </thead>
                <tbody>
                  {byProject.map(p => (
                    <tr key={p.project_id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/projects/${p.project_id}`} className="hover:text-[#0D3B6E]">
                          <span className="font-mono text-xs text-gray-400">{p.code}</span>
                          <span className="text-gray-800 ml-2">{p.name}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-gray-600">{p.hours}</td>
                      <td className="px-4 py-3 text-right text-xs font-semibold text-gray-900">{money(p.cost)}</td>
                      <td className="px-4 py-3 text-right text-xs text-gray-500">{p.people}</td>
                      <td className="px-4 py-3 text-right text-xs text-gray-500">{p.days}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
