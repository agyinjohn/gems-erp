'use client';
import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { toast, ConfirmDialog } from '@/components/ui';
import { loadProjectTypes, profileFor, FALLBACK, type ProjectTypeProfile } from '@/lib/projectTypes';
import {
  RefreshCw, ArrowLeft, AlertTriangle, TrendingUp, TrendingDown,
  MapPin, Calendar, User, FileText,
} from 'lucide-react';

import {
  label, PROJECT_STATUS_STYLE, PROJECT_STATUS_ICON, type TabProps,
} from '@/components/projects/shared';
import type {
  Milestone, Task, Variation, Financials, BillingPosition, ProjectInvoice,
  BillableMilestone, Schedule, BaselineRow, CashFlow, EotClaim, EotPosition,
  DiaryEntry, DiarySummary, ProjectDoc,
} from '@/components/projects/types';

import ProgressTab from '@/components/projects/tabs/ProgressTab';
import ProgrammeTab from '@/components/projects/tabs/ProgrammeTab';
import ClaimsTab from '@/components/projects/tabs/ClaimsTab';
import MoneyTab from '@/components/projects/tabs/MoneyTab';
import CashflowTab from '@/components/projects/tabs/CashflowTab';
import BillingTab from '@/components/projects/tabs/BillingTab';
import SiteTab from '@/components/projects/tabs/SiteTab';

type TabKey = 'progress' | 'programme' | 'claims' | 'money' | 'cashflow' | 'billing' | 'site';

/**
 * The project detail page.
 *
 * Owns the data, the header, and which tab is open; each tab owns its own forms
 * and the calls that write them. The one thing shared downward besides data is
 * the confirmation dialog, so a single one serves all seven.
 */
export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const canManage = ['business_owner', 'platform_admin', 'branch_manager', 'accountant'].includes(user?.role || '');
  const isOwner = ['business_owner', 'platform_admin'].includes(user?.role || '');

  const [project, setProject] = useState<any>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [fin, setFin] = useState<Financials | null>(null);
  const [billing, setBilling] = useState<{ position: BillingPosition | null; invoices: ProjectInvoice[]; billable_milestones: BillableMilestone[] } | null>(null);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [baselines, setBaselines] = useState<BaselineRow[]>([]);
  const [cash, setCash] = useState<CashFlow | null>(null);
  const [eot, setEot] = useState<{ claims: EotClaim[]; position: EotPosition | null } | null>(null);
  const [diary, setDiary] = useState<{ entries: DiaryEntry[]; summary: DiarySummary | null }>({ entries: [], summary: null });
  const [docs, setDocs] = useState<ProjectDoc[]>([]);

  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<TabKey>('progress');
  const [typeProfiles, setTypeProfiles] = useState<ProjectTypeProfile[]>([FALLBACK]);
  const [confirm, setConfirm] = useState<{ title: string; message: string; danger?: boolean; run: () => void } | null>(null);

  const money = (n: number) => `${fin?.currency || 'GHS'} ${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const load = useCallback(async () => {
    if (!id || id === 'undefined') { setLoading(false); return; }
    setLoading(true);
    try {
      const r = await api.get(`/projects/${id}`);
      const d = r.data.data;
      setProject(d.project);
      setMilestones(d.milestones || []);
      setTasks(d.tasks || []);
      setVariations(d.variations || []);
      setFin(d.financials);
      // The diary and time claims don't exist on every kind of job, and the API
      // refuses them rather than returning empty. Softened so one refusal can't
      // take the whole page down with it.
      const optional = (fallback: any) => (e: any) => {
        // Only a refusal is expected. A 500 or a dropped connection is a real
        // failure, and showing it as "nothing here yet" would invite someone to
        // re-enter a day that already exists.
        if (e?.response?.status === 400) return { data: { data: fallback } };
        throw e;
      };
      const [b, dy, dc, sc, bl, cf, et] = await Promise.all([
        api.get(`/projects/${id}/billing`),
        api.get(`/projects/${id}/diary`).catch(optional({ entries: [], summary: null })),
        api.get(`/projects/${id}/documents`),
        api.get(`/projects/${id}/schedule`).catch(optional({ has_baseline: false, actual_pct: 0, milestones: [], curve: [] })),
        api.get(`/projects/${id}/baseline`).catch(optional([])),
        api.get(`/projects/${id}/cashflow`),
        api.get(`/projects/${id}/eot`).catch(optional({ claims: [], position: null })),
      ]);
      setEot(et.data.data);
      setBilling(b.data.data);
      setDiary(dy.data.data);
      setDocs(dc.data.data || []);
      setSchedule(sc.data.data);
      setBaselines(bl.data.data || []);
      setCash(cf.data.data);
      setLoaded(true);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not load the project');
    } finally {
      setLoading(false);
    }
  }, [id]);


  useEffect(() => { if (id && id !== 'undefined') load(); }, [load, id]);
  useEffect(() => { loadProjectTypes().then(setTypeProfiles); }, []);

  // Capabilities arrive after the first paint, so the open tab can turn out not
  // to exist on this kind of job. Resolved while rendering rather than corrected
  // afterwards — an effect that calls setTab would paint the missing tab once
  // before replacing it, and cascade a second render every time.
  const caps = profileFor(typeProfiles, project?.project_type).capabilities;
  const openTab: TabKey =
    (tab === 'claims' && !caps.time_claims) || (tab === 'programme' && !caps.programme)
      ? 'progress'
      : tab;

  const removeIt = (what: string, url: string, name: string) => setConfirm({
    title: `Remove this ${what}?`,
    message: `“${name}” will be deleted.${
      what === 'milestone' || what === 'task' ? ' Progress is recalculated afterwards.' : ''
    }`,
    danger: true,
    run: async () => {
      try { await api.delete(url); await load(); }
      catch (e: any) { toast.error(e.response?.data?.message || 'Could not remove'); }
    },
  });

  if (loading || !loaded) {
    return (
      <AppLayout title="Project" subtitle="Loading…">
        <div className="space-y-4">
          <div className="card animate-pulse h-28" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => <div key={i} className="card animate-pulse h-20" />)}
          </div>
        </div>
      </AppLayout>
    );
  }
  if (!project) {
    return (
      <AppLayout title="Project" subtitle="Not found">
        <div className="card text-center py-20">
          <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="font-semibold text-gray-600">Project not found</p>
          <button className="btn-secondary mt-4" onClick={() => router.push('/projects')}>
            <ArrowLeft className="w-4 h-4" /> Back to projects
          </button>
        </div>
      </AppLayout>
    );
  }

  // What kind of job this is decides which tabs exist and what things are
  // called. Everything below reads from here rather than assuming construction.
  const profile = profileFor(typeProfiles, project.project_type);
  const cap = profile.capabilities;
  const term = profile.terms;

  const overdue = project.planned_end_date && !['completed', 'cancelled'].includes(project.status)
    && new Date(project.planned_end_date) < new Date();
  const pct = Math.min(100, Math.max(0, fin?.progress_pct || 0));
  const marginPositive = (fin?.margin_to_date || 0) >= 0;

  // Everything every tab needs. Spread rather than listed at each call site, so
  // adding a tab can't quietly miss one.
  const tabProps: TabProps = {
    projectId: id, project, profile, canManage, isOwner, money,
    reload: load, confirmAction: setConfirm, removeIt,
  };


  return (
    <AppLayout
      title={project.name}
      subtitle={`${project.code}${project.customer_name ? ` · ${project.customer_name}` : ''}`}
      allowedRoles={['platform_admin', 'business_owner', 'branch_manager', 'accountant']}
    >
      <div className="space-y-5">

        {/* Top bar */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <button type="button" onClick={() => router.push('/projects')} className="btn-ghost text-sm">
            <ArrowLeft className="w-4 h-4" /> All projects
          </button>
          <button type="button" onClick={load} className="btn-secondary" disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* Project info banner */}
        <div className="card">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-xs font-mono text-gray-400 tracking-wide">{project.code}</span>
                <span className={`badge gap-1 ${PROJECT_STATUS_STYLE[project.status] || PROJECT_STATUS_STYLE.draft}`}>
                  {PROJECT_STATUS_ICON[project.status]} {label(project.status)}
                </span>
                <span className="badge bg-gray-100 text-gray-600">{profile.label}</span>
                {overdue && (
                  <span className="badge bg-red-50 text-red-600 gap-1">
                    <AlertTriangle className="w-3 h-3" /> Overdue
                  </span>
                )}
              </div>
              <h1 className="text-lg font-bold text-gray-900 truncate">{project.name}</h1>
              {project.description && (
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{project.description}</p>
              )}
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                {project.customer_name && (
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <User className="w-3 h-3" /> {project.customer_name}
                  </span>
                )}
                {project.site_address && (
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {project.site_address}
                  </span>
                )}
                {project.start_date && (
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(project.start_date).toLocaleDateString()}
                    {project.planned_end_date && ` → ${new Date(project.planned_end_date).toLocaleDateString()}`}
                  </span>
                )}
              </div>
            </div>
            {/* Overall progress ring-style bar */}
            <div className="sm:w-40 flex-shrink-0">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-gray-400 font-medium">Overall progress</span>
                <span className="font-bold text-gray-800">{Math.round(pct)}%</span>
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    project.status === 'completed' ? 'bg-blue-500' :
                    project.status === 'on_hold'   ? 'bg-amber-400' : 'bg-[#0D3B6E]'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {milestones.length} milestone{milestones.length !== 1 ? 's' : ''} · {tasks.length} task{tasks.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {overdue && (
          <div className="flex items-start gap-2.5 bg-red-50 text-red-800 rounded-xl px-4 py-3 text-sm">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              Past its planned completion of {new Date(project.planned_end_date).toLocaleDateString()} and still {label(project.status).toLowerCase()}.
            </span>
          </div>
        )}
        {fin?.is_over_budget && (
          <div className="flex items-start gap-2.5 bg-amber-50 text-amber-800 rounded-xl px-4 py-3 text-sm">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              Forecast cost of {money(fin.forecast_cost)} exceeds the {money(fin.budget)} budget by {money(Math.abs(fin.budget_variance))}.
            </span>
          </div>
        )}

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="card">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Progress</p>
            <p className="text-2xl font-extrabold text-gray-900 mt-1">{Math.round(pct)}%</p>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-2">
              <div className="h-full bg-[#0D3B6E] rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-xs text-gray-400 mt-1.5">{milestones.filter(m => m.status === 'completed').length} of {milestones.length} stages done</p>
          </div>
          <div className="card">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Contract</p>
            <p className="text-2xl font-extrabold text-gray-900 mt-1">{money(fin?.effective_contract || 0)}</p>
            <p className="text-xs text-gray-400 mt-1">
              {fin?.approved_variations ? `+${money(fin.approved_variations)} variations` : 'No variations'}
            </p>
          </div>
          <div className="card">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Cost so far</p>
            <p className="text-2xl font-extrabold text-gray-900 mt-1">{money(fin?.actual_cost || 0)}</p>
            <p className="text-xs text-gray-400 mt-1">
              {fin?.committed_cost ? `+${money(fin.committed_cost)} committed` : 'No commitments'}
            </p>
          </div>
          <div className="card">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Margin to date</p>
            <p className={`text-2xl font-extrabold mt-1 inline-flex items-center gap-1 ${marginPositive ? 'text-green-600' : 'text-red-600'}`}>
              {marginPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              {money(Math.abs(fin?.margin_to_date || 0))}
            </p>
            <p className="text-xs text-gray-400 mt-1">Earned value less cost</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-gray-200 overflow-x-auto">
          {([
            { key: 'progress',  label: 'Progress',   show: true },
            { key: 'programme', label: 'Programme',  show: cap.programme },
            { key: 'claims',    label: 'Time claims', show: cap.time_claims },
            { key: 'money',     label: 'Money',      show: true },
            { key: 'cashflow',  label: 'Cash flow',  show: true },
            { key: 'billing',   label: 'Billing',    show: true },
            { key: 'site',      label: term.site_tab, show: true },
          ] as const).filter(t => t.show).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
                openTab === t.key
                  ? 'border-[#0D3B6E] text-[#0D3B6E]'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >{t.label}</button>
          ))}
        </div>


        {openTab === 'progress'  && <ProgressTab  {...tabProps} milestones={milestones} tasks={tasks} />}
        {openTab === 'programme' && <ProgrammeTab {...tabProps} schedule={schedule} baselines={baselines} />}
        {openTab === 'claims'    && <ClaimsTab    {...tabProps} eot={eot} />}
        {openTab === 'money'     && <MoneyTab     {...tabProps} fin={fin} variations={variations} />}
        {openTab === 'cashflow'  && <CashflowTab  {...tabProps} cash={cash} />}
        {openTab === 'billing'   && <BillingTab   {...tabProps} billing={billing} />}
        {openTab === 'site'      && <SiteTab      {...tabProps} diary={diary} docs={docs} />}

        <ConfirmDialog
          open={!!confirm}
          onClose={() => setConfirm(null)}
          onConfirm={() => { confirm?.run(); setConfirm(null); }}
          title={confirm?.title || ''}
          message={confirm?.message || ''}
          danger={confirm?.danger}
        />
      </div>
    </AppLayout>
  );
}
