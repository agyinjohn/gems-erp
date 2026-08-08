'use client';
import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { toast, ConfirmDialog } from '@/components/ui';
import PaymentCertificate, { type Certificate } from '@/components/projects/PaymentCertificate';
import { loadProjectTypes, profileFor, FALLBACK, type ProjectTypeProfile } from '@/lib/projectTypes';
import {
  LineChart, Line, ComposedChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import {
  Plus, RefreshCw, Trash2, Check, X, ArrowLeft, AlertTriangle,
  TrendingUp, TrendingDown, Clock, MapPin, Calendar, User,
  CheckCircle2, PauseCircle, FileText, Activity, Flag, Lock, Info,
} from 'lucide-react';

interface Milestone {
  id: string; name: string; description?: string; weight: number; sequence: number;
  planned_start?: string; planned_end?: string; actual_end?: string;
  status: string; progress_pct: number; billable_amount: number;
}
interface Task {
  id: string; name: string; milestone_id?: string; weight: number; status: string;
  due_date?: string; assignee_id?: { name: string } | null;
}
interface Variation {
  id: string; reference: string; description: string; amount: number;
  status: string; raised_on: string;
}
interface Financials {
  currency: string;
  contract_value: number; approved_variations: number; pending_variations: number; effective_contract: number;
  budget: number; expenses: number; labour_cost: number; labour_hours: number;
  actual_cost: number; committed_cost: number; forecast_cost: number;
  budget_variance: number; is_over_budget: boolean;
  progress_pct: number; earned_value: number; margin_to_date: number;
  invoiced: number; received: number; retention_pct: number; retention_held: number; unbilled: number;
}

interface BillingPosition {
  currency: string; effective_contract: number; earned_value: number;
  certified_to_date: number; remaining_to_certify: number; uncertified_earned: number;
  retention_pct: number; retention_withheld: number; retention_released: number; retention_outstanding: number;
  invoiced_net: number; received: number; applications: number;
}
interface ProjectInvoice {
  id: string; invoice_number: string; issue_date: string; due_date: string;
  work_value: number; retention_amount: number; total: number; amount_paid: number;
  status: string; is_retention_release: boolean;
}
interface BillableMilestone { id: string; name: string; billable_amount: number; actual_end?: string }

interface ScheduleMilestone {
  milestone_id: string; name: string; renamed_from?: string | null;
  removed?: boolean; added_since_baseline?: boolean; weight: number;
  baseline_start?: string | null; baseline_end?: string | null;
  current_end?: string | null; actual_end?: string | null;
  status: string; progress_pct: number;
  plan_slip_days: number | null; actual_slip_days: number | null; days_late: number;
}
interface CurvePoint { month: string; label: string; planned_pct: number; actual_pct: number | null }
interface Baseline {
  id: string; version: number; name: string; reason?: string | null; set_on?: string;
  start_date?: string | null; planned_end_date?: string | null;
  contract_value: number; milestone_count: number;
}
interface Schedule {
  has_baseline: boolean; currency: string; actual_pct: number;
  baseline?: Baseline;
  planned_pct?: number; planned_value?: number; earned_value?: number; schedule_variance?: number;
  spi?: number | null; status?: string;
  baseline_end_date?: string | null; current_end_date?: string | null;
  completion_slip_days?: number | null;
  forecast_end_date?: string | null; forecast_slip_days?: number | null;
  milestones: ScheduleMilestone[]; curve: CurvePoint[];
}
interface BaselineRow {
  id: string; version: number; name: string; reason?: string;
  planned_end_date?: string | null; contract_value: number;
  is_current: boolean; createdAt: string; set_by?: { name: string } | null;
}

interface CashBucket {
  month: string; label: string; inflow: number; outflow: number;
  net: number; cumulative: number; by_category: Record<string, number>;
}
interface CashFlow {
  currency: string; as_of: string;
  assumptions: {
    payment_terms_days: number; defects_liability_days: number; retention_pct: number;
    cost_basis: string; forecast_cost: number; cost_to_complete: number;
  };
  buckets: CashBucket[];
  totals: {
    inflow: number; outflow: number; net: number; receivables_outstanding: number;
    overdue_receivables: number; po_outstanding: number; retention_due: number;
  };
  low_point: { month: string | null; label: string | null; cumulative: number };
  peak_funding_required: number;
  warnings: string[];
}

interface EotCause {
  cause: string; hours_lost: number; occurrences?: number;
  days_equivalent: number; entitlement: string; entitlement_label?: string;
}
interface EotEvidence {
  id: string; entry_date: string; weather: string; worked: boolean;
  hours_lost: number; causes: string[]; already_claimed_on: string | null;
}
interface EotAnalysis {
  period_from: string | null; period_to: string | null;
  working_hours_per_day: number;
  entries_examined: number; entries_with_delays: number;
  causes: EotCause[];
  hours_lost_total: number;
  claimable_hours: number; claimable_days: number;
  compensable_hours: number; compensable_days: number;
  unclassified_hours: number; unclassified_days: number;
  own_risk_hours: number;
  already_claimed_hours: number;
  evidence: EotEvidence[];
  claimable_entry_ids: string[];
}
interface EotClaim {
  id: string; reference: string; title: string; description?: string;
  period_from: string; period_to: string;
  causes: EotCause[]; hours_lost_total: number; claimable_hours: number;
  working_hours_per_day: number; diary_entry_ids: string[];
  days_claimed: number; cost_claimed: number;
  status: string; submitted_on?: string;
  decided_on?: string; days_granted: number; cost_granted: number; decision_notes?: string;
  previous_end_date?: string | null; new_end_date?: string | null;
  decided_by?: { name: string } | null; created_by?: { name: string } | null;
  createdAt: string;
}
interface EotPosition {
  claims: number; submitted: number;
  days_claimed: number; days_granted: number; days_awaiting: number; days_rejected: number;
  cost_claimed: number; cost_granted: number;
}

interface Delay { cause: string; hours_lost: number; description?: string }
interface DiaryEntry {
  id: string; entry_date: string; weather: string; worked: boolean;
  labour_count: number; labour_notes?: string; plant_notes?: string;
  work_done?: string; materials_received?: string; delays: Delay[];
  visitors?: string; instructions?: string;
  recorded_by?: { name: string } | null;
}
interface DiarySummary {
  entries: number; non_working_days: number; labour_days: number;
  severe_weather_days: number; hours_lost: number; weather_hours_lost: number;
  hours_lost_by_cause: { cause: string; hours: number; occurrences: number }[];
}
interface ProjectDoc {
  id: string; name: string; category: string; url: string;
  mime_type?: string; size?: number; createdAt: string;
  uploaded_by?: { name: string } | null;
}

const WEATHER = ['fine', 'overcast', 'light_rain', 'heavy_rain', 'storm'];
const DELAY_CAUSES = ['weather', 'materials', 'labour', 'plant', 'client_instruction', 'access', 'other'];
const DOC_CATEGORIES = ['contract', 'drawing', 'permit', 'certificate', 'photo', 'correspondence', 'other'];
const WEATHER_LABEL: Record<string, string> = {
  fine: 'Fine', overcast: 'Overcast', light_rain: 'Light rain', heavy_rain: 'Heavy rain', storm: 'Storm',
};

const ENTITLEMENT_TONE: Record<string, string> = {
  time_and_cost:  'bg-green-50 text-green-700',
  time_only:      'bg-blue-50 text-blue-700',
  no_entitlement: 'bg-gray-100 text-gray-500',
  unclassified:   'bg-amber-50 text-amber-700',
};
const ENTITLEMENT_LABEL: Record<string, string> = {
  time_and_cost:  'Time and cost',
  time_only:      'Time only',
  no_entitlement: 'No entitlement',
  unclassified:   'Needs a decision',
};
const CLAIM_TONE: Record<string, string> = {
  draft:             'bg-gray-100 text-gray-600',
  submitted:         'bg-amber-50 text-amber-700',
  granted:           'bg-green-50 text-green-700',
  partially_granted: 'bg-blue-50 text-blue-700',
  rejected:          'bg-red-50 text-red-600',
  withdrawn:         'bg-gray-100 text-gray-400',
};

const MILESTONE_STATUS = ['not_started', 'in_progress', 'completed', 'blocked'];
const label = (s: string) => (s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const STATUS_TONE: Record<string, string> = {
  not_started: 'bg-gray-100 text-gray-600', in_progress: 'bg-amber-50 text-amber-700',
  completed: 'bg-green-50 text-green-700', blocked: 'bg-red-50 text-red-600',
  todo: 'bg-gray-100 text-gray-600', done: 'bg-green-50 text-green-700',
  pending: 'bg-amber-50 text-amber-700', approved: 'bg-green-50 text-green-700', rejected: 'bg-red-50 text-red-600',
};

const PROJECT_STATUS_STYLE: Record<string, string> = {
  draft:     'bg-gray-100 text-gray-600',
  active:    'bg-green-50 text-green-700',
  on_hold:   'bg-amber-50 text-amber-700',
  completed: 'bg-blue-50 text-blue-700',
  cancelled: 'bg-red-50 text-red-600',
};

const PROJECT_STATUS_ICON: Record<string, React.ReactNode> = {
  draft:     <FileText className="w-3 h-3" />,
  active:    <Activity className="w-3 h-3" />,
  on_hold:   <PauseCircle className="w-3 h-3" />,
  completed: <CheckCircle2 className="w-3 h-3" />,
  cancelled: <X className="w-3 h-3" />,
};

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
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<'progress' | 'programme' | 'claims' | 'money' | 'cashflow' | 'billing' | 'site'>('progress');
  const [eot, setEot] = useState<{ claims: EotClaim[]; position: EotPosition } | null>(null);
  const [analysis, setAnalysis] = useState<EotAnalysis | null>(null);
  const [analysing, setAnalysing] = useState(false);
  const [eotForm, setEotForm] = useState({
    title: '', description: '', period_from: '', period_to: '', days_claimed: '', cost_claimed: '',
  });
  const [clientSms, setClientSms] = useState({ enabled: false, phone: '' });
  const [cert, setCert] = useState<Certificate | null>(null);
  const [typeProfiles, setTypeProfiles] = useState<ProjectTypeProfile[]>([FALLBACK]);
  const [certBusy, setCertBusy] = useState<string | null>(null);
  const [decideFor, setDecideFor] = useState<string | null>(null);
  const [decideForm, setDecideForm] = useState({ days_granted: '', cost_granted: '', decision_notes: '', rebaseline: true });
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [baselines, setBaselines] = useState<BaselineRow[]>([]);
  const [cash, setCash] = useState<CashFlow | null>(null);
  const [baseForm, setBaseForm] = useState({ name: '', reason: '' });
  const [terms, setTerms] = useState({ payment_terms_days: '30', defects_liability_days: '0' });
  const [planBusy, setPlanBusy] = useState(false);
  const [diary, setDiary] = useState<{ entries: DiaryEntry[]; summary: DiarySummary | null }>({ entries: [], summary: null });
  const [docs, setDocs] = useState<ProjectDoc[]>([]);
  const [diaryForm, setDiaryForm] = useState({
    entry_date: new Date().toISOString().slice(0, 10),
    weather: 'fine', worked: true, labour_count: '', work_done: '',
    materials_received: '', visitors: '', instructions: '',
  });
  const [delayRows, setDelayRows] = useState<Delay[]>([]);
  const [siteBusy, setSiteBusy] = useState(false);
  const [docForm, setDocForm] = useState({ category: 'contract', name: '' });
  const [billing, setBilling] = useState<{ position: BillingPosition | null; invoices: ProjectInvoice[]; billable_milestones: BillableMilestone[] } | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [billForm, setBillForm] = useState({ amount: '', due_date: '', notes: '' });
  const [releaseForm, setReleaseForm] = useState({ amount: '', due_date: '' });
  const [billing_busy, setBillingBusy] = useState(false);
  const [confirm, setConfirm] = useState<{ title: string; message: string; danger?: boolean; run: () => void } | null>(null);

  const [msForm, setMsForm] = useState({ name: '', weight: '1', planned_end: '', billable_amount: '' });
  const [taskForm, setTaskForm] = useState({ name: '', milestone_id: '', weight: '1' });
  const [voForm, setVoForm] = useState({ description: '', amount: '', reference: '' });

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
      const optional = (fallback: any) => (e: any) => ({ data: { data: fallback } });
      const [b, dy, dc, sc, bl, cf, et] = await Promise.all([
        api.get(`/projects/${id}/billing`),
        api.get(`/projects/${id}/diary`).catch(optional({ entries: [], summary: null })),
        api.get(`/projects/${id}/documents`),
        api.get(`/projects/${id}/schedule`),
        api.get(`/projects/${id}/baseline`),
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
      setTerms({
        payment_terms_days: String(d.project.payment_terms_days ?? 30),
        defects_liability_days: String(d.project.defects_liability_days ?? 0),
      });
      setClientSms({
        enabled: !!d.project.client_sms_enabled,
        phone: d.project.client_phone || '',
      });
      setPicked([]);
      setLoaded(true);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not load the project');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { if (id && id !== 'undefined') load(); }, [load, id]);
  useEffect(() => { loadProjectTypes().then(setTypeProfiles); }, []);

  // Capabilities arrive after the first paint, so a tab can be open and then
  // turn out not to exist on this kind of job. Fall back rather than render it.
  const caps = profileFor(typeProfiles, project?.project_type).capabilities;
  useEffect(() => {
    if (tab === 'claims' && !caps.time_claims) setTab('progress');
    if (tab === 'programme' && !caps.programme) setTab('progress');
  }, [tab, caps.time_claims, caps.programme]);

  const addMilestone = async () => {
    if (!msForm.name.trim()) return toast.error('Give the milestone a name');
    try {
      await api.post(`/projects/${id}/milestones`, {
        name: msForm.name,
        weight: parseFloat(msForm.weight) || 1,
        planned_end: msForm.planned_end || undefined,
        billable_amount: parseFloat(msForm.billable_amount) || 0,
      });
      setMsForm({ name: '', weight: '1', planned_end: '', billable_amount: '' });
      await load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Could not add'); }
  };

  const setMilestoneStatus = async (m: Milestone, status: string) => {
    try {
      await api.put(`/projects/${id}/milestones/${m.id}`, { status });
      await load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Could not update'); }
  };

  const addTask = async () => {
    if (!taskForm.name.trim()) return toast.error('Give the task a name');
    try {
      await api.post(`/projects/${id}/tasks`, {
        name: taskForm.name,
        milestone_id: taskForm.milestone_id || undefined,
        weight: parseFloat(taskForm.weight) || 1,
      });
      setTaskForm({ name: '', milestone_id: '', weight: '1' });
      await load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Could not add'); }
  };

  const cycleTask = async (t: Task) => {
    const next = t.status === 'done' ? 'todo' : t.status === 'todo' ? 'in_progress' : 'done';
    try {
      await api.put(`/projects/${id}/tasks/${t.id}`, { status: next });
      await load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Could not update'); }
  };

  const addVariation = async () => {
    const amt = parseFloat(voForm.amount);
    if (!voForm.description.trim() || !Number.isFinite(amt) || amt === 0) {
      return toast.error('Describe the change and give a non-zero amount');
    }
    try {
      await api.post(`/projects/${id}/variations`, { ...voForm, amount: amt });
      setVoForm({ description: '', amount: '', reference: '' });
      await load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Could not add'); }
  };

  const decide = async (v: Variation, decision: 'approved' | 'rejected') => {
    try {
      await api.patch(`/projects/${id}/variations/${v.id}`, { decision });
      toast.success(`${v.reference} ${decision}`);
      await load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Could not update'); }
  };

  const raiseApplication = async () => {
    if (!billForm.due_date) return toast.error('Set a due date');
    const usingMilestones = picked.length > 0;
    const amt = parseFloat(billForm.amount);
    if (!usingMilestones && (!Number.isFinite(amt) || amt <= 0)) {
      return toast.error('Pick milestones to certify, or enter an amount');
    }
    setBillingBusy(true);
    try {
      const r = await api.post(`/projects/${id}/invoices`, {
        ...(usingMilestones ? { milestone_ids: picked } : { amount: amt }),
        due_date: billForm.due_date,
        notes: billForm.notes || undefined,
      });
      toast.success(`${r.data.data.invoice_number} raised as a draft invoice`);
      setBillForm({ amount: '', due_date: '', notes: '' });
      await load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not raise the application');
    } finally { setBillingBusy(false); }
  };

  const releaseRetention = async () => {
    if (!releaseForm.due_date) return toast.error('Set a due date');
    const amt = parseFloat(releaseForm.amount);
    if (!Number.isFinite(amt) || amt <= 0) return toast.error('Enter the amount to release');
    setBillingBusy(true);
    try {
      const r = await api.post(`/projects/${id}/retention-release`, { amount: amt, due_date: releaseForm.due_date });
      toast.success(`${r.data.data.invoice_number} raised for retention`);
      setReleaseForm({ amount: '', due_date: '' });
      await load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not release retention');
    } finally { setBillingBusy(false); }
  };

  // Reading the diary back for the chosen window. Debounced, since the dates
  // are typed and every keystroke would otherwise be a round trip.
  useEffect(() => {
    const { period_from, period_to } = eotForm;
    if (!period_from || !period_to || period_from > period_to) { setAnalysis(null); return; }
    let cancelled = false;
    setAnalysing(true);
    const t = setTimeout(async () => {
      try {
        const r = await api.get(`/projects/${id}/eot/analysis`, { params: { from: period_from, to: period_to } });
        if (!cancelled) setAnalysis(r.data.data);
      } catch {
        if (!cancelled) setAnalysis(null);
      } finally {
        if (!cancelled) setAnalysing(false);
      }
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [id, eotForm.period_from, eotForm.period_to]);

  const raiseClaim = async (submit: boolean) => {
    if (!eotForm.title.trim()) return toast.error('Give the claim a title');
    if (!eotForm.period_from || !eotForm.period_to) return toast.error('Set the period the claim covers');
    const days = parseFloat(eotForm.days_claimed);
    if (!Number.isFinite(days) || days <= 0) return toast.error('Enter the days being claimed');
    setPlanBusy(true);
    try {
      const r = await api.post(`/projects/${id}/eot`, {
        title: eotForm.title,
        description: eotForm.description || undefined,
        period_from: eotForm.period_from,
        period_to: eotForm.period_to,
        days_claimed: days,
        cost_claimed: parseFloat(eotForm.cost_claimed) || 0,
        submit,
      });
      toast.success(`${r.data.data.reference} ${submit ? 'submitted' : 'saved as a draft'}`);
      setEotForm({ title: '', description: '', period_from: '', period_to: '', days_claimed: '', cost_claimed: '' });
      setAnalysis(null);
      await load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not raise the claim');
    } finally { setPlanBusy(false); }
  };

  const claimAction = async (c: EotClaim, action: 'submit' | 'withdraw') => {
    try {
      await api.patch(`/projects/${id}/eot/${c.id}`, { action });
      toast.success(`${c.reference} ${action === 'submit' ? 'submitted' : 'withdrawn'}`);
      await load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Could not update'); }
  };

  const recordDecision = async (c: EotClaim) => {
    const granted = parseFloat(decideForm.days_granted);
    if (!Number.isFinite(granted) || granted < 0) return toast.error('Enter the days granted — zero if refused');
    setPlanBusy(true);
    try {
      const r = await api.patch(`/projects/${id}/eot/${c.id}/decision`, {
        decision: 'decide',
        days_granted: granted,
        cost_granted: parseFloat(decideForm.cost_granted) || 0,
        decision_notes: decideForm.decision_notes || undefined,
        rebaseline: decideForm.rebaseline,
      });
      toast.success(granted > 0
        ? `${granted} days granted — completion moved to ${new Date(r.data.data.new_end_date).toLocaleDateString()}`
        : `${c.reference} refused`);
      setDecideFor(null);
      setDecideForm({ days_granted: '', cost_granted: '', decision_notes: '', rebaseline: true });
      await load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not record the decision');
    } finally { setPlanBusy(false); }
  };

  const reopenClaim = (c: EotClaim) => setConfirm({
    title: `Reopen ${c.reference}?`,
    message: c.days_granted > 0
      ? `The ${c.days_granted} days granted will be taken back off the completion date, returning it to ${c.previous_end_date ? new Date(c.previous_end_date).toLocaleDateString() : 'its previous value'}.`
      : 'The claim goes back to awaiting a decision.',
    run: async () => {
      try {
        await api.patch(`/projects/${id}/eot/${c.id}/decision`, { decision: 'reopen' });
        await load();
      } catch (e: any) { toast.error(e.response?.data?.message || 'Could not reopen'); }
    },
  });

  const freezeBaseline = async () => {
    setPlanBusy(true);
    try {
      const r = await api.post(`/projects/${id}/baseline`, {
        name: baseForm.name || undefined,
        reason: baseForm.reason || undefined,
      });
      toast.success(`${r.data.data.name} frozen as v${r.data.data.version}`);
      setBaseForm({ name: '', reason: '' });
      await load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not freeze the programme');
    } finally { setPlanBusy(false); }
  };

  const openCertificate = async (invoiceId: string) => {
    setCertBusy(invoiceId);
    try {
      const r = await api.get(`/projects/${id}/invoices/${invoiceId}/certificate`);
      setCert(r.data.data);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not build the certificate');
    } finally { setCertBusy(null); }
  };

  const saveClientSms = async (next: { enabled: boolean; phone: string }) => {
    setPlanBusy(true);
    try {
      await api.put(`/projects/${id}`, {
        client_sms_enabled: next.enabled,
        client_phone: next.phone.trim(),
      });
      setClientSms(next);
      toast.success(next.enabled ? 'Client updates are on' : 'Client updates are off');
      await load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not save');
    } finally { setPlanBusy(false); }
  };

  const saveTerms = async () => {
    setPlanBusy(true);
    try {
      await api.put(`/projects/${id}`, {
        payment_terms_days: parseInt(terms.payment_terms_days) || 0,
        defects_liability_days: parseInt(terms.defects_liability_days) || 0,
      });
      toast.success('Assumptions updated');
      await load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not save');
    } finally { setPlanBusy(false); }
  };

  const saveDiary = async () => {
    setSiteBusy(true);
    try {
      await api.post(`/projects/${id}/diary`, {
        ...diaryForm,
        labour_count: parseInt(diaryForm.labour_count) || 0,
        delays: delayRows.filter(d => d.cause),
      });
      toast.success('Day recorded');
      setDelayRows([]);
      setDiaryForm(f => ({ ...f, work_done: '', materials_received: '', visitors: '', instructions: '', labour_count: '' }));
      await load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not save the entry');
    } finally { setSiteBusy(false); }
  };

  const uploadDoc = async (file: File) => {
    setSiteBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('category', docForm.category);
      if (docForm.name.trim()) fd.append('name', docForm.name.trim());
      await api.post(`/projects/${id}/documents`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Uploaded');
      setDocForm({ category: docForm.category, name: '' });
      await load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not upload');
    } finally { setSiteBusy(false); }
  };

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
                tab === t.key
                  ? 'border-[#0D3B6E] text-[#0D3B6E]'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >{t.label}</button>
          ))}
        </div>

        {tab === 'progress' && (
          <>
            {/* Milestones */}
            <div className="card">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="font-bold text-gray-900">{term.stages}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Overall progress is the weighted average — a heavier stage moves the number more.
                  </p>
                </div>
                <span className="text-xs text-gray-400 font-medium whitespace-nowrap">
                  {milestones.filter(m => m.status === 'completed').length}/{milestones.length} done
                </span>
              </div>

              {milestones.length === 0 ? (
                <p className="text-sm text-gray-400 mb-4">No milestones yet. Add the stages of work to start tracking progress.</p>
              ) : (
                <div className="space-y-2 mb-4">
                  {milestones.map(m => {
                    const own = tasks.filter(t => t.milestone_id === m.id);
                    const doneTasks = own.filter(t => t.status === 'done').length;
                    return (
                      <div key={m.id} className="bg-gray-50 rounded-xl px-4 py-3 ring-1 ring-gray-100">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-gray-800 text-sm">{m.name}</p>
                              <span className={`badge ${STATUS_TONE[m.status]}`}>{label(m.status)}</span>
                              <span className="text-xs text-gray-400">wt {m.weight}</span>
                            </div>
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                              <span className="text-xs text-gray-500">{Math.round(m.progress_pct)}% complete</span>
                              {own.length > 0 && (
                                <span className="text-xs text-gray-400">{doneTasks}/{own.length} tasks</span>
                              )}
                              {m.billable_amount > 0 && (
                                <span className="text-xs text-gray-400">bills {money(m.billable_amount)}</span>
                              )}
                              {m.planned_end && (
                                <span className="text-xs text-gray-400">due {new Date(m.planned_end).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                          {canManage && (
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <select
                                className="form-input !w-auto !py-1 text-xs"
                                value={m.status}
                                onChange={e => setMilestoneStatus(m, e.target.value)}
                              >
                                {MILESTONE_STATUS.map(s => <option key={s} value={s}>{label(s)}</option>)}
                              </select>
                              <button onClick={() => removeIt('milestone', `/projects/${id}/milestones/${m.id}`, m.name)} className="text-gray-400 hover:text-red-500">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="h-1.5 bg-white rounded-full overflow-hidden mt-2.5">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              m.status === 'completed' ? 'bg-green-500' :
                              m.status === 'blocked'   ? 'bg-red-400' :
                              m.status === 'in_progress' ? 'bg-[#0D3B6E]' : 'bg-gray-300'
                            }`}
                            style={{ width: `${Math.min(100, m.progress_pct)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {canManage && (
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 border-t border-gray-100 pt-4">
                  <div className="sm:col-span-2">
                    <label className="form-label text-xs">{term.stage} name</label>
                    <input className="form-input" placeholder="e.g. Foundation" value={msForm.name} onChange={e => setMsForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="form-label text-xs">Weight</label>
                    <input type="number" min={0} className="form-input" value={msForm.weight} onChange={e => setMsForm(f => ({ ...f, weight: e.target.value }))} />
                  </div>
                  <div>
                    <label className="form-label text-xs">Due date</label>
                    <input type="date" className="form-input" value={msForm.planned_end} onChange={e => setMsForm(f => ({ ...f, planned_end: e.target.value }))} />
                  </div>
                  <div className="flex items-end">
                    <button type="button" className="btn-secondary w-full justify-center" onClick={addMilestone}>
                      <Plus className="w-4 h-4" /> Add
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Tasks */}
            <div className="card">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="font-bold text-gray-900">Tasks</h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Tasks roll up into their milestone. In-progress counts as half done.
                  </p>
                </div>
                <span className="text-xs text-gray-400 font-medium whitespace-nowrap">
                  {tasks.filter(t => t.status === 'done').length}/{tasks.length} done
                </span>
              </div>

              {tasks.length === 0 ? (
                <p className="text-sm text-gray-400 mb-4">No tasks yet. Add tasks to track granular work within each milestone.</p>
              ) : (
                <div className="space-y-1.5 mb-4">
                  {tasks.map(t => (
                    <div key={t.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5 ring-1 ring-gray-100">
                      <button
                        onClick={() => cycleTask(t)}
                        title="Click to cycle status"
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          t.status === 'done'        ? 'bg-green-500 border-green-500 text-white'
                          : t.status === 'in_progress' ? 'border-amber-400 bg-amber-50'
                          : t.status === 'blocked'     ? 'border-red-400 bg-red-50'
                          : 'border-gray-300 bg-white'
                        }`}
                      >
                        {t.status === 'done'        && <Check className="w-3 h-3" />}
                        {t.status === 'in_progress' && <Clock className="w-3 h-3 text-amber-500" />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium ${
                          t.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-800'
                        }`}>{t.name}</p>
                        <p className="text-xs text-gray-400">
                          {milestones.find(m => m.id === t.milestone_id)?.name || 'No milestone'}
                          {t.assignee_id?.name && <> · {t.assignee_id.name}</>}
                          {t.weight !== 1 && <> · wt {t.weight}</>}
                        </p>
                      </div>
                      <span className={`badge text-xs flex-shrink-0 ${
                        t.status === 'done'        ? 'bg-green-50 text-green-700'
                        : t.status === 'in_progress' ? 'bg-amber-50 text-amber-700'
                        : t.status === 'blocked'     ? 'bg-red-50 text-red-600'
                        : 'bg-gray-100 text-gray-500'
                      }`}>{label(t.status)}</span>
                      {canManage && (
                        <button onClick={() => removeIt('task', `/projects/${id}/tasks/${t.id}`, t.name)} className="text-gray-300 hover:text-red-500 flex-shrink-0 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 border-t border-gray-100 pt-4">
                <div className="sm:col-span-2">
                  <label className="form-label text-xs">Task name</label>
                  <input className="form-input" placeholder="e.g. Excavate footings" value={taskForm.name} onChange={e => setTaskForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label text-xs">{term.stage}</label>
                  <select className="form-input" value={taskForm.milestone_id} onChange={e => setTaskForm(f => ({ ...f, milestone_id: e.target.value }))}>
                    <option value="">None</option>
                    {milestones.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label text-xs">Weight</label>
                  <input type="number" min={0} className="form-input" value={taskForm.weight} onChange={e => setTaskForm(f => ({ ...f, weight: e.target.value }))} />
                </div>
                <div className="flex items-end">
                  <button type="button" className="btn-secondary w-full justify-center" onClick={addTask}>
                    <Plus className="w-4 h-4" /> Add
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {tab === 'programme' && (() => {
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
        })()}

        {tab === 'claims' && (() => {
          const pos = eot?.position;
          const claims = eot?.claims || [];
          const date = (d?: string | null) => (d ? new Date(d).toLocaleDateString() : '—');
          const hrs = analysis?.working_hours_per_day || 8;

          return (
            <>
              {/* Position */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="card">
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Days granted</p>
                  <p className="text-2xl font-extrabold text-green-600 mt-1">{pos?.days_granted ?? 0}</p>
                  <p className="text-xs text-gray-400 mt-1">already on the completion date</p>
                </div>
                <div className={`card ${(pos?.days_awaiting || 0) > 0 ? 'ring-1 ring-amber-200 bg-amber-50/40' : ''}`}>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Awaiting a decision</p>
                  <p className={`text-2xl font-extrabold mt-1 ${(pos?.days_awaiting || 0) > 0 ? 'text-amber-700' : 'text-gray-900'}`}>
                    {pos?.days_awaiting ?? 0}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {pos?.submitted ? `${pos.submitted} claim${pos.submitted === 1 ? '' : 's'} with the client` : 'nothing outstanding'}
                  </p>
                </div>
                <div className="card">
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Days refused</p>
                  <p className="text-2xl font-extrabold text-gray-900 mt-1">{pos?.days_rejected ?? 0}</p>
                  <p className="text-xs text-gray-400 mt-1">time the job carries itself</p>
                </div>
                <div className="card">
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Cost recovered</p>
                  <p className="text-2xl font-extrabold text-gray-900 mt-1">{money(pos?.cost_granted || 0)}</p>
                  <p className="text-xs text-gray-400 mt-1">of {money(pos?.cost_claimed || 0)} claimed</p>
                </div>
              </div>

              {(pos?.days_awaiting || 0) > 0 && (
                <div className="flex items-start gap-2.5 bg-amber-50 text-amber-800 rounded-xl px-4 py-3 text-sm">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>
                    {pos!.days_awaiting} days are claimed but undecided. Until the client answers, the job is
                    exposed to damages for delay it may not actually owe.
                  </span>
                </div>
              )}

              {/* Build a claim */}
              {canManage && (
                <div className="card">
                  <div className="mb-4">
                    <h2 className="font-bold text-gray-900">Build a claim from the diary</h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Pick the period and the recorded delays are read back with what each one is worth.
                      Rain and a late client instruction both stop work — only one of them normally earns money too.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-2">
                      <label className="form-label">Title *</label>
                      <input className="form-input" placeholder="e.g. March rainfall and late setting-out information"
                        value={eotForm.title} onChange={e => setEotForm(f => ({ ...f, title: e.target.value }))} />
                    </div>
                    <div>
                      <label className="form-label">Period from *</label>
                      <input type="date" className="form-input" value={eotForm.period_from}
                        onChange={e => setEotForm(f => ({ ...f, period_from: e.target.value }))} />
                    </div>
                    <div>
                      <label className="form-label">Period to *</label>
                      <input type="date" className="form-input" value={eotForm.period_to}
                        onChange={e => setEotForm(f => ({ ...f, period_to: e.target.value }))} />
                    </div>
                  </div>

                  {/* What the diary supports */}
                  {analysing && <p className="text-sm text-gray-400 mt-4">Reading the diary…</p>}

                  {!analysing && analysis && (
                    <div className="mt-4 bg-gray-50 rounded-xl p-4 ring-1 ring-gray-100">
                      {analysis.entries_with_delays === 0 ? (
                        <p className="text-sm text-gray-500">
                          No delays are recorded in the diary for that period, so there is nothing to argue from.
                        </p>
                      ) : (
                        <>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                            <div>
                              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Lost</p>
                              <p className="text-lg font-extrabold text-gray-900">{analysis.hours_lost_total}h</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Earns time</p>
                              <p className="text-lg font-extrabold text-blue-700">{analysis.claimable_days}d</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Earns cost too</p>
                              <p className="text-lg font-extrabold text-green-700">{analysis.compensable_days}d</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Your own risk</p>
                              <p className="text-lg font-extrabold text-gray-500">{analysis.own_risk_hours}h</p>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            {analysis.causes.map(c => (
                              <div key={c.cause} className="flex items-center gap-3 bg-white rounded-lg px-3 py-2 ring-1 ring-gray-100">
                                <span className="text-sm text-gray-800 flex-1 min-w-0 truncate">{label(c.cause)}</span>
                                <span className="text-xs text-gray-500 whitespace-nowrap">{c.hours_lost}h · {c.days_equivalent}d</span>
                                <span className={`badge flex-shrink-0 ${ENTITLEMENT_TONE[c.entitlement]}`}>
                                  {ENTITLEMENT_LABEL[c.entitlement]}
                                </span>
                              </div>
                            ))}
                          </div>

                          {analysis.already_claimed_hours > 0 && (
                            <p className="text-xs text-amber-700 mt-3 bg-amber-50 rounded-lg px-3 py-2">
                              {analysis.already_claimed_hours}h in this period is already cited on another claim and
                              has been left out. The same lost afternoon argued twice is the fastest way to have the
                              whole claim disbelieved.
                            </p>
                          )}
                          {analysis.unclassified_hours > 0 && (
                            <p className="text-xs text-gray-500 mt-2">
                              {analysis.unclassified_hours}h is recorded as “other”, so nobody has yet said whose risk
                              it was. Re-cause those diary entries to have it counted either way.
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-2">
                            {analysis.entries_with_delays} day{analysis.entries_with_delays === 1 ? '' : 's'} of
                            evidence at {hrs}h per working day. Entitlement here is the usual position — your contract
                            decides, so the days claimed are yours to set.
                          </p>
                        </>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-4">
                    <div>
                      <label className="form-label">Days claimed *</label>
                      <div className="flex gap-2">
                        <input type="number" min={0} step="0.5" className="form-input" placeholder="0"
                          value={eotForm.days_claimed} onChange={e => setEotForm(f => ({ ...f, days_claimed: e.target.value }))} />
                        {!!analysis?.claimable_days && (
                          <button type="button" className="btn-secondary whitespace-nowrap"
                            onClick={() => setEotForm(f => ({ ...f, days_claimed: String(analysis.claimable_days) }))}>
                            Use {analysis.claimable_days}
                          </button>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="form-label">Prolongation cost</label>
                      <input type="number" min={0} className="form-input" placeholder="0.00"
                        value={eotForm.cost_claimed} onChange={e => setEotForm(f => ({ ...f, cost_claimed: e.target.value }))} />
                      <p className="form-hint">Only where the delay was the client&apos;s risk.</p>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="form-label">Notes</label>
                      <input className="form-input" placeholder="What is being argued"
                        value={eotForm.description} onChange={e => setEotForm(f => ({ ...f, description: e.target.value }))} />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-4">
                    <button type="button" className="btn-primary" disabled={planBusy} onClick={() => raiseClaim(true)}>
                      <Plus className="w-4 h-4" /> {planBusy ? 'Raising…' : 'Raise and submit'}
                    </button>
                    <button type="button" className="btn-secondary" disabled={planBusy} onClick={() => raiseClaim(false)}>
                      Save as draft
                    </button>
                    <p className="text-xs text-gray-400">
                      The evidence is frozen onto the claim, so later edits to the diary don&apos;t rewrite it.
                    </p>
                  </div>
                </div>
              )}

              {/* Claims */}
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-gray-900">Claims</h2>
                  {claims.length > 0 && <span className="text-xs text-gray-400">{claims.length} raised</span>}
                </div>

                {claims.length === 0 ? (
                  <p className="text-sm text-gray-400">
                    None raised yet. Lost time only earns an extension if it is claimed for.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {claims.map(c => (
                      <div key={c.id} className="bg-gray-50 rounded-xl px-4 py-3 ring-1 ring-gray-100">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs text-gray-500">{c.reference}</span>
                              <span className={`badge ${CLAIM_TONE[c.status]}`}>{label(c.status)}</span>
                              <span className="text-xs text-gray-400">
                                {date(c.period_from)} → {date(c.period_to)}
                              </span>
                            </div>
                            <p className="text-sm font-semibold text-gray-800 mt-0.5">{c.title}</p>
                            {c.description && <p className="text-xs text-gray-500 mt-0.5">{c.description}</p>}
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {c.causes.map(cc => (
                                <span key={cc.cause} className={`text-xs px-2 py-0.5 rounded-full ${ENTITLEMENT_TONE[cc.entitlement]}`}>
                                  {label(cc.cause)} {cc.hours_lost}h
                                </span>
                              ))}
                            </div>
                            {c.status !== 'draft' && c.status !== 'submitted' && c.status !== 'withdrawn' && (
                              <p className="text-xs text-gray-500 mt-2">
                                {c.days_granted > 0
                                  ? <>Granted {c.days_granted} of {c.days_claimed} days — completion moved from {date(c.previous_end_date)} to {date(c.new_end_date)}.</>
                                  : <>Refused.</>}
                                {c.cost_granted > 0 && <> {money(c.cost_granted)} of cost allowed.</>}
                                {c.decided_by && <> Recorded by {c.decided_by.name}.</>}
                              </p>
                            )}
                            {c.decision_notes && <p className="text-xs text-gray-500 mt-1 italic">“{c.decision_notes}”</p>}
                          </div>

                          <div className="text-right flex-shrink-0">
                            <p className="text-lg font-extrabold text-gray-900">
                              {c.days_granted > 0 ? c.days_granted : c.days_claimed}
                              <span className="text-xs font-medium text-gray-400 ml-1">days</span>
                            </p>
                            {c.days_granted > 0 && c.days_granted < c.days_claimed && (
                              <p className="text-xs text-gray-400">of {c.days_claimed} claimed</p>
                            )}
                            {c.cost_claimed > 0 && <p className="text-xs text-gray-400">{money(c.cost_claimed)}</p>}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-200/70">
                          {canManage && c.status === 'draft' && (
                            <button className="btn-secondary !py-1 text-xs" onClick={() => claimAction(c, 'submit')}>
                              Submit to client
                            </button>
                          )}
                          {canManage && ['draft', 'submitted'].includes(c.status) && (
                            <button className="btn-ghost !py-1 text-xs" onClick={() => claimAction(c, 'withdraw')}>
                              Withdraw
                            </button>
                          )}
                          {isOwner && ['draft', 'submitted'].includes(c.status) && (
                            <button className="btn-primary !py-1 text-xs"
                              onClick={() => { setDecideFor(decideFor === c.id ? null : c.id); setDecideForm({ days_granted: String(c.days_claimed), cost_granted: String(c.cost_claimed || ''), decision_notes: '', rebaseline: true }); }}>
                              Record decision
                            </button>
                          )}
                          {isOwner && ['granted', 'partially_granted', 'rejected'].includes(c.status) && (
                            <button className="btn-ghost !py-1 text-xs" onClick={() => reopenClaim(c)}>
                              Reopen
                            </button>
                          )}
                          {canManage && !['granted', 'partially_granted'].includes(c.status) && (
                            <button className="text-gray-400 hover:text-red-500 ml-auto"
                              onClick={() => removeIt('claim', `/projects/${id}/eot/${c.id}`, c.reference)}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {/* Decision form */}
                        {decideFor === c.id && (
                          <div className="mt-3 pt-3 border-t border-gray-200/70">
                            <p className="form-label">The client&apos;s answer</p>
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                              <div>
                                <label className="form-label text-xs">Days granted</label>
                                <input type="number" min={0} max={c.days_claimed} step="0.5" className="form-input"
                                  value={decideForm.days_granted}
                                  onChange={e => setDecideForm(f => ({ ...f, days_granted: e.target.value }))} />
                                <p className="form-hint">Zero if refused.</p>
                              </div>
                              <div>
                                <label className="form-label text-xs">Cost allowed</label>
                                <input type="number" min={0} className="form-input"
                                  value={decideForm.cost_granted}
                                  onChange={e => setDecideForm(f => ({ ...f, cost_granted: e.target.value }))} />
                              </div>
                              <div className="sm:col-span-2">
                                <label className="form-label text-xs">Notes</label>
                                <input className="form-input" placeholder="What the client said"
                                  value={decideForm.decision_notes}
                                  onChange={e => setDecideForm(f => ({ ...f, decision_notes: e.target.value }))} />
                              </div>
                            </div>
                            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer mt-3">
                              <input type="checkbox" className="w-4 h-4 accent-[#0D3B6E]" checked={decideForm.rebaseline}
                                onChange={e => setDecideForm(f => ({ ...f, rebaseline: e.target.checked }))} />
                              Re-freeze the programme against the new date
                            </label>
                            <p className="text-xs text-gray-400 mt-1 ml-6">
                              Usual after an extension — but it also resets stage-level slip, so leave it off to keep
                              measuring against the original dates.
                            </p>
                            <div className="flex gap-2 mt-3">
                              <button className="btn-primary !py-1.5 text-xs" disabled={planBusy} onClick={() => recordDecision(c)}>
                                {planBusy ? 'Saving…' : 'Record'}
                              </button>
                              <button className="btn-secondary !py-1.5 text-xs" onClick={() => setDecideFor(null)}>
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          );
        })()}

        {tab === 'money' && (
          <>
            {/* Cost vs contract summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="card">
                <h2 className="font-bold text-gray-900 mb-4">Cost position</h2>
                <dl className="space-y-2.5 text-sm">
                  {[
                    { l: 'Budget',                  v: fin?.budget,         tone: 'text-gray-900', bold: false },
                    { l: 'Expenses posted',          v: fin?.expenses,       tone: 'text-gray-700', bold: false },
                    { l: 'Labour booked',            v: fin?.labour_cost,    tone: 'text-gray-700', bold: false },
                    { l: 'Committed (POs raised)',   v: fin?.committed_cost, tone: 'text-gray-700', bold: false },
                  ].map(({ l, v, tone, bold }) => (
                    <div key={l} className="flex justify-between items-center">
                      <dt className="text-gray-500">{l}</dt>
                      <dd className={`${bold ? 'font-bold' : 'font-semibold'} ${tone}`}>{money(v as number)}</dd>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-2.5 border-t border-gray-100">
                    <dt className="font-semibold text-gray-900">Forecast cost</dt>
                    <dd className={`font-bold ${fin?.is_over_budget ? 'text-red-600' : 'text-gray-900'}`}>
                      {money(fin?.forecast_cost || 0)}
                    </dd>
                  </div>
                  <div className="flex justify-between items-center">
                    <dt className="text-gray-500">Budget variance</dt>
                    <dd className={`font-semibold ${
                      (fin?.budget_variance || 0) < 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {(fin?.budget_variance || 0) < 0 ? '−' : '+'}{money(Math.abs(fin?.budget_variance || 0))}
                    </dd>
                  </div>
                </dl>
                {fin?.budget && fin.budget > 0 && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Spent vs budget</span>
                      <span>{Math.round(((fin.actual_cost + fin.committed_cost) / fin.budget) * 100)}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          fin.is_over_budget ? 'bg-red-500' : 'bg-[#0D3B6E]'
                        }`}
                        style={{ width: `${Math.min(100, ((fin.actual_cost + fin.committed_cost) / fin.budget) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-3">
                  Cost is pulled from expenses and POs tagged to this project, plus booked labour.
                </p>
              </div>

              <div className="card">
                <h2 className="font-bold text-gray-900 mb-4">Contract &amp; earned value</h2>
                <dl className="space-y-2.5 text-sm">
                  <div className="flex justify-between items-center">
                    <dt className="text-gray-500">Original contract</dt>
                    <dd className="font-semibold text-gray-900">{money(fin?.contract_value || 0)}</dd>
                  </div>
                  <div className="flex justify-between items-center">
                    <dt className="text-gray-500">Approved variations</dt>
                    <dd className="font-semibold text-gray-700">{money(fin?.approved_variations || 0)}</dd>
                  </div>
                  <div className="flex justify-between items-center pt-2.5 border-t border-gray-100">
                    <dt className="font-semibold text-gray-900">Effective contract</dt>
                    <dd className="font-bold text-gray-900">{money(fin?.effective_contract || 0)}</dd>
                  </div>
                  <div className="flex justify-between items-center">
                    <dt className="text-gray-500">Work done ({Math.round(fin?.progress_pct || 0)}%)</dt>
                    <dd className="font-semibold text-gray-900">{money(fin?.earned_value || 0)}</dd>
                  </div>
                  <div className="flex justify-between items-center">
                    <dt className="text-gray-500">Invoiced to date</dt>
                    <dd className="font-semibold text-gray-700">{money(fin?.invoiced || 0)}</dd>
                  </div>
                  <div className="flex justify-between items-center">
                    <dt className="text-gray-500">Not yet billed</dt>
                    <dd className="font-semibold text-amber-600">{money(fin?.unbilled || 0)}</dd>
                  </div>
                  {!!fin?.retention_pct && (
                    <div className="flex justify-between items-center">
                      <dt className="text-gray-500">Retention held ({fin.retention_pct}%)</dt>
                      <dd className="font-semibold text-gray-600">{money(fin.retention_held)}</dd>
                    </div>
                  )}
                </dl>
                {!!fin?.pending_variations && (
                  <p className="text-xs text-amber-600 mt-3 bg-amber-50 rounded-lg px-3 py-2">
                    {money(fin.pending_variations)} in pending variations not counted above.
                  </p>
                )}
              </div>
            </div>

            {/* Variations */}
            <div className="card">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="font-bold text-gray-900">Variations</h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Changes to the agreed scope. Only approved ones move the contract sum.
                  </p>
                </div>
                {variations.length > 0 && (
                  <span className="text-xs text-gray-400 font-medium whitespace-nowrap">
                    {variations.filter(v => v.status === 'approved').length} approved
                  </span>
                )}
              </div>

              {variations.length === 0 ? (
                <p className="text-sm text-gray-400 mb-4">None raised yet.</p>
              ) : (
                <div className="space-y-2 mb-4">
                  {variations.map(v => (
                    <div key={v.id} className="flex items-start justify-between gap-3 bg-gray-50 rounded-xl px-4 py-3 ring-1 ring-gray-100">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs text-gray-500">{v.reference}</span>
                          <span className={`badge ${STATUS_TONE[v.status]}`}>{label(v.status)}</span>
                        </div>
                        <p className="text-sm text-gray-800 mt-0.5">{v.description}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{new Date(v.raised_on).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`font-bold text-sm ${
                          v.amount < 0 ? 'text-red-600' : 'text-green-700'
                        }`}>
                          {v.amount < 0 ? '−' : '+'}{money(Math.abs(v.amount))}
                        </span>
                        {isOwner && v.status === 'pending' && (
                          <>
                            <button onClick={() => decide(v, 'approved')} title="Approve"
                              className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={() => decide(v, 'rejected')} title="Reject"
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors">
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {canManage && (
                          <button onClick={() => removeIt('variation', `/projects/${id}/variations/${v.id}`, v.reference)}
                            className="text-gray-300 hover:text-red-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {canManage && (
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 border-t border-gray-100 pt-4">
                  <div className="sm:col-span-2">
                    <label className="form-label text-xs">Description</label>
                    <input className="form-input" placeholder="e.g. Additional drainage" value={voForm.description} onChange={e => setVoForm(f => ({ ...f, description: e.target.value }))} />
                  </div>
                  <div>
                    <label className="form-label text-xs">Reference</label>
                    <input className="form-input" placeholder="auto" value={voForm.reference} onChange={e => setVoForm(f => ({ ...f, reference: e.target.value }))} />
                  </div>
                  <div>
                    <label className="form-label text-xs">Amount (+/−)</label>
                    <input type="number" className="form-input" placeholder="0.00" value={voForm.amount} onChange={e => setVoForm(f => ({ ...f, amount: e.target.value }))} />
                  </div>
                  <div className="flex items-end">
                    <button type="button" className="btn-secondary w-full justify-center" onClick={addVariation}>
                      <Plus className="w-4 h-4" /> Raise
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {tab === 'cashflow' && (() => {
          const c = cash;
          if (!c) return <div className="card text-sm text-gray-400">No cash flow available.</div>;

          const compact = (n: number) => {
            const abs = Math.abs(n);
            if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`;
            if (abs >= 1000) return `${Math.round(n / 1000)}k`;
            return String(Math.round(n));
          };
          const CATEGORY_LABEL: Record<string, string> = {
            receivable: 'Applications outstanding',
            certification: 'Work still to certify',
            retention_release: 'Retention release',
            purchase_order: 'Orders to pay',
            cost_to_complete: 'Cost to complete',
          };
          const BASIS_NOTE: Record<string, string> = {
            budget: 'Remaining cost is taken from the budget.',
            run_rate: 'No budget set — remaining cost is extrapolated from spend per point of progress.',
            committed: 'Too early to forecast — only spend already committed is shown.',
          };

          return (
            <>
              {/* Headline */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className={`card ${c.peak_funding_required > 0 ? 'ring-1 ring-amber-200 bg-amber-50/40' : ''}`}>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Working capital needed</p>
                  <p className={`text-2xl font-extrabold mt-1 ${c.peak_funding_required > 0 ? 'text-amber-700' : 'text-green-600'}`}>
                    {money(c.peak_funding_required)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {c.peak_funding_required > 0 ? `deepest around ${c.low_point.label}` : 'the job funds itself'}
                  </p>
                </div>
                <div className="card">
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Still to come in</p>
                  <p className="text-2xl font-extrabold text-green-600 mt-1">{money(c.totals.inflow)}</p>
                  <p className="text-xs text-gray-400 mt-1">{money(c.totals.receivables_outstanding)} already invoiced</p>
                </div>
                <div className="card">
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Still to go out</p>
                  <p className="text-2xl font-extrabold text-red-600 mt-1">{money(c.totals.outflow)}</p>
                  <p className="text-xs text-gray-400 mt-1">{money(c.totals.po_outstanding)} on open orders</p>
                </div>
                <div className="card">
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Net from here</p>
                  <p className={`text-2xl font-extrabold mt-1 ${c.totals.net >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                    {money(c.totals.net)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{money(c.totals.retention_due)} of it is retention</p>
                </div>
              </div>

              {c.warnings.length > 0 && (
                <div className="flex items-start gap-2.5 bg-blue-50 text-blue-900 rounded-xl px-4 py-3 text-sm">
                  <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <ul className="space-y-1 min-w-0">
                    {c.warnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              )}

              {/* Chart */}
              <div className="card">
                <div className="mb-4">
                  <h2 className="font-bold text-gray-900">Money in and out by month</h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    The line is the running total. Where it dips below zero, the job is being funded out of
                    your own pocket — that trough is the cash the contract demands before it gives any back.
                  </p>
                </div>
                <ResponsiveContainer width="100%" height={280} minWidth={0}>
                  <ComposedChart data={c.buckets} margin={{ top: 5, right: 8, left: -8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={compact} />
                    <Tooltip formatter={(v: any, n: any) => [money(Number(v)), n]} />
                    <ReferenceLine y={0} stroke="#cbd5e1" />
                    <Bar dataKey="inflow" name="In" fill="#22c55e" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="outflow" name="Out" fill="#ef4444" radius={[3, 3, 0, 0]} />
                    <Line type="monotone" dataKey="cumulative" name="Running total" stroke="#0D3B6E" strokeWidth={2.5} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-4 mt-2 justify-center flex-wrap">
                  <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-3 h-3 rounded-sm bg-green-500 inline-block" /> In</span>
                  <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-3 h-3 rounded-sm bg-red-500 inline-block" /> Out</span>
                  <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-4 border-t-2 border-[#0D3B6E] inline-block" /> Running total</span>
                </div>
              </div>

              {/* Assumptions */}
              <div className="card">
                <div className="mb-4">
                  <h2 className="font-bold text-gray-900">Assumptions</h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Payment terms move every inflow. On 60-day terms, work certified in March is May&apos;s money —
                    and the wages in between still fall due.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="form-label">Client payment terms</label>
                    <input type="number" min={0} className="form-input" value={terms.payment_terms_days}
                      disabled={!canManage}
                      onChange={e => setTerms(t => ({ ...t, payment_terms_days: e.target.value }))} />
                    <p className="form-hint">Days from certification to payment.</p>
                  </div>
                  <div>
                    <label className="form-label">Defects period</label>
                    <input type="number" min={0} className="form-input" value={terms.defects_liability_days}
                      disabled={!canManage}
                      onChange={e => setTerms(t => ({ ...t, defects_liability_days: e.target.value }))} />
                    <p className="form-hint">Days after completion before retention is released.</p>
                  </div>
                  <div>
                    <label className="form-label">Retention</label>
                    <input className="form-input" value={`${c.assumptions.retention_pct}%`} disabled />
                    <p className="form-hint">Set on the project.</p>
                  </div>
                  {canManage && (
                    <div className="flex items-start pt-6">
                      <button type="button" className="btn-secondary w-full justify-center" onClick={saveTerms} disabled={planBusy}>
                        {planBusy ? 'Saving…' : 'Apply'}
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-3 flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 mt-px flex-shrink-0" />
                  {BASIS_NOTE[c.assumptions.cost_basis]} Forecast total cost {money(c.assumptions.forecast_cost)},
                  of which {money(c.assumptions.cost_to_complete)} is still to spend.
                </p>
              </div>

              {/* Month table */}
              <div className="card">
                <h2 className="font-bold text-gray-900 mb-4">Month by month</h2>
                <div className="table-wrap">
                  <table className="w-full text-sm min-w-[620px]">
                    <thead>
                      <tr className="table-header text-left">
                        <th className="px-4 py-2.5">Month</th>
                        <th className="px-4 py-2.5 text-right">In</th>
                        <th className="px-4 py-2.5 text-right">Out</th>
                        <th className="px-4 py-2.5 text-right">Net</th>
                        <th className="px-4 py-2.5 text-right">Running total</th>
                        <th className="px-4 py-2.5">Made up of</th>
                      </tr>
                    </thead>
                    <tbody>
                      {c.buckets.map(b => (
                        <tr key={b.month}
                          className={`border-t border-gray-100 transition-colors ${
                            b.month === c.low_point.month && c.peak_funding_required > 0 ? 'bg-amber-50/60' : 'hover:bg-gray-50'
                          }`}>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-700 text-xs">{b.label}</td>
                          <td className="px-4 py-3 text-right text-xs text-green-700">{b.inflow ? money(b.inflow) : '—'}</td>
                          <td className="px-4 py-3 text-right text-xs text-red-600">{b.outflow ? money(b.outflow) : '—'}</td>
                          <td className={`px-4 py-3 text-right text-xs font-semibold ${b.net >= 0 ? 'text-gray-700' : 'text-red-600'}`}>
                            {b.net ? money(b.net) : '—'}
                          </td>
                          <td className={`px-4 py-3 text-right text-xs font-bold whitespace-nowrap ${b.cumulative >= 0 ? 'text-gray-900' : 'text-amber-700'}`}>
                            {money(b.cumulative)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(b.by_category).map(([k, v]) => (
                                <span key={k} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full whitespace-nowrap">
                                  {CATEGORY_LABEL[k] || label(k)} {money(v)}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          );
        })()}

        {tab === 'billing' && (() => {
          const pos = billing?.position;
          const pickedTotal = (billing?.billable_milestones || [])
            .filter(m => picked.includes(m.id))
            .reduce((s, m) => s + m.billable_amount, 0);
          const gross = picked.length ? pickedTotal : (parseFloat(billForm.amount) || 0);
          const retention = gross * ((pos?.retention_pct || 0) / 100);

          return (
            <>
              {/* Billing position cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { l: 'Certified to date',       v: pos?.certified_to_date,    tone: 'text-gray-900' },
                  { l: 'Left to certify',          v: pos?.remaining_to_certify, tone: 'text-gray-900' },
                  { l: 'Retention held by client', v: pos?.retention_outstanding, tone: 'text-amber-600' },
                  { l: 'Received',                 v: pos?.received,             tone: 'text-green-600' },
                ].map(({ l, v, tone }) => (
                  <div key={l} className="card">
                    <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">{l}</p>
                    <p className={`text-xl font-extrabold mt-1 ${tone}`}>{money(v as number)}</p>
                  </div>
                ))}
              </div>

              {(pos?.uncertified_earned || 0) > 0 && (
                <div className="flex items-start gap-2.5 bg-blue-50 text-blue-800 rounded-xl px-4 py-3 text-sm">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{money(pos!.uncertified_earned)} of work is done but not yet on an application.</span>
                </div>
              )}

              {/* Raise application */}
              {canManage && (
                <div className="card">
                  <div className="mb-4">
                    <h2 className="font-bold text-gray-900">Raise {term.application === 'Application' ? 'an application' : `a ${term.application.toLowerCase()}`}</h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Certify completed stages or enter an amount. Retention is withheld and released separately.
                    </p>
                  </div>

                  {(billing?.billable_milestones.length || 0) > 0 && (
                    <div className="space-y-1.5 mb-4">
                      <p className="form-label">Completed {term.stages.toLowerCase()} not yet billed</p>
                      {billing!.billable_milestones.map(m => (
                        <label key={m.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-2.5 ring-1 ring-gray-100 cursor-pointer hover:bg-gray-100 transition-colors">
                          <input
                            type="checkbox"
                            checked={picked.includes(m.id)}
                            onChange={e => setPicked(p => e.target.checked ? [...p, m.id] : p.filter(x => x !== m.id))}
                            className="w-4 h-4 accent-[#0D3B6E]"
                          />
                          <span className="flex-1 text-sm text-gray-800">{m.name}</span>
                          <span className="text-sm font-semibold text-gray-900">{money(m.billable_amount)}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="form-label">{picked.length ? 'Amount (from stages)' : 'Amount'}</label>
                      <input
                        type="number" className="form-input" placeholder="0.00"
                        value={picked.length ? pickedTotal.toFixed(2) : billForm.amount}
                        disabled={picked.length > 0}
                        onChange={e => setBillForm(f => ({ ...f, amount: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="form-label">Due date *</label>
                      <input type="date" className="form-input" value={billForm.due_date} onChange={e => setBillForm(f => ({ ...f, due_date: e.target.value }))} />
                    </div>
                    <div>
                      <label className="form-label">Note</label>
                      <input className="form-input" placeholder="optional" value={billForm.notes} onChange={e => setBillForm(f => ({ ...f, notes: e.target.value }))} />
                    </div>
                  </div>

                  {gross > 0 && (
                    <dl className="mt-4 bg-gray-50 rounded-xl p-4 ring-1 ring-gray-100 space-y-2 text-sm max-w-sm">
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Work certified</dt>
                        <dd className="font-semibold text-gray-900">{money(gross)}</dd>
                      </div>
                      {cap.retention && (
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Less retention ({pos?.retention_pct || 0}%)</dt>
                        <dd className="font-semibold text-amber-600">− {money(retention)}</dd>
                      </div>
                      )}
                      <div className="flex justify-between pt-2 border-t border-gray-200">
                        <dt className="font-semibold text-gray-900">Now due</dt>
                        <dd className="font-bold text-gray-900">{money(gross - retention)}</dd>
                      </div>
                    </dl>
                  )}

                  <div className="flex items-center gap-3 mt-4">
                    <button type="button" className="btn-primary" onClick={raiseApplication} disabled={billing_busy}>
                      <Plus className="w-4 h-4" /> {billing_busy ? 'Raising…' : 'Raise application'}
                    </button>
                    <p className="text-xs text-gray-400">Creates a draft invoice in Accounting.</p>
                  </div>
                </div>
              )}

              {/* Release retention */}
              {canManage && cap.retention && (pos?.retention_outstanding || 0) > 0 && (
                <div className="card">
                  <div className="mb-4">
                    <h2 className="font-bold text-gray-900">Release retention</h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {money(pos!.retention_outstanding)} still held. Release in stages — part at completion, rest after defects period.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="form-label">Amount</label>
                      <input type="number" className="form-input" placeholder="0.00" value={releaseForm.amount} onChange={e => setReleaseForm(f => ({ ...f, amount: e.target.value }))} />
                    </div>
                    <div>
                      <label className="form-label">Due date *</label>
                      <input type="date" className="form-input" value={releaseForm.due_date} onChange={e => setReleaseForm(f => ({ ...f, due_date: e.target.value }))} />
                    </div>
                    <div className="flex items-end">
                      <button type="button" className="btn-secondary w-full justify-center" onClick={releaseRetention} disabled={billing_busy}>
                        Release
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Keeping the client posted */}
              {canManage && (
                <div className="card">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <h2 className="font-bold text-gray-900">Text the client</h2>
                      <p className="text-sm text-gray-500 mt-0.5">
                        A short message when an application goes out, a payment lands, a stage finishes,
                        or retention is released. Off unless you turn it on, and each message spends one
                        SMS credit.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={clientSms.enabled}
                      disabled={planBusy}
                      onClick={() => saveClientSms({ ...clientSms, enabled: !clientSms.enabled })}
                      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                        clientSms.enabled ? 'bg-[#0D3B6E]' : 'bg-gray-200'
                      }`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        clientSms.enabled ? 'translate-x-5' : ''
                      }`} />
                    </button>
                  </div>

                  {clientSms.enabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="form-label">Number to text</label>
                        <input
                          className="form-input"
                          placeholder={project.customer_name ? `Blank uses ${project.customer_name}'s number on file` : 'Blank uses the client record'}
                          value={clientSms.phone}
                          onChange={e => setClientSms(c => ({ ...c, phone: e.target.value }))}
                        />
                        <p className="form-hint">
                          Set this when the person to keep posted isn&apos;t whoever the account was opened with.
                        </p>
                      </div>
                      <div className="flex items-start pt-6">
                        <button type="button" className="btn-secondary w-full justify-center"
                          disabled={planBusy} onClick={() => saveClientSms(clientSms)}>
                          {planBusy ? 'Saving…' : 'Save number'}
                        </button>
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-gray-400 mt-3 flex items-start gap-1.5">
                    <Info className="w-3.5 h-3.5 mt-px flex-shrink-0" />
                    Wording is set once for the whole business on the{' '}
                    <Link href="/sms" className="underline">SMS page</Link>, where any of the four can also
                    be switched off outright.
                  </p>
                </div>
              )}

              {/* Applications table */}
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-gray-900">{term.applications} raised</h2>
                  {billing?.invoices.length ? (
                    <span className="text-xs text-gray-400">{billing.invoices.length} invoice{billing.invoices.length !== 1 ? 's' : ''}</span>
                  ) : null}
                </div>
                {!billing?.invoices.length ? (
                  <p className="text-sm text-gray-400">Nothing raised yet.</p>
                ) : (
                  <div className="table-wrap">
                    <table className="w-full text-sm min-w-[640px]">
                      <thead>
                        <tr className="table-header text-left">
                          <th className="px-4 py-2.5">Invoice</th>
                          <th className="px-4 py-2.5">Issued</th>
                          <th className="px-4 py-2.5 text-right">Work certified</th>
                          <th className="px-4 py-2.5 text-right">Retention</th>
                          <th className="px-4 py-2.5 text-right">Due</th>
                          <th className="px-4 py-2.5">Status</th>
                          <th className="px-4 py-2.5" />
                        </tr>
                      </thead>
                      <tbody>
                        {billing.invoices.map(inv => (
                          <tr key={inv.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <span className="font-mono text-xs text-gray-700">{inv.invoice_number}</span>
                              {inv.is_retention_release && (
                                <span className="ml-2 badge bg-blue-50 text-blue-700">Retention</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                              {new Date(inv.issue_date).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-600 text-xs">
                              {inv.work_value ? money(inv.work_value) : '—'}
                            </td>
                            <td className="px-4 py-3 text-right text-amber-600 text-xs">
                              {inv.retention_amount ? `− ${money(inv.retention_amount)}` : '—'}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-gray-900 whitespace-nowrap text-xs">
                              {money(inv.total)}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`badge ${
                                inv.status === 'paid'           ? 'bg-green-50 text-green-700' :
                                inv.status === 'partially_paid' ? 'bg-amber-50 text-amber-700' :
                                inv.status === 'overdue'        ? 'bg-red-50 text-red-600' :
                                'bg-gray-100 text-gray-600'
                              }`}>{label(inv.status)}</span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              {cap.certificate && (
                              <button
                                type="button"
                                className="btn-ghost !py-1 text-xs whitespace-nowrap"
                                disabled={certBusy === inv.id}
                                onClick={() => openCertificate(inv.id)}
                              >
                                <FileText className="w-3.5 h-3.5" />
                                {certBusy === inv.id ? 'Building…' : 'Certificate'}
                              </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          );
        })()}

        {tab === 'site' && (
          <>
            {cap.site_diary && (
            <>
            {/* Lost time */}
            {!!diary.summary?.entries && (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    ['Days recorded', String(diary.summary.entries), 'text-gray-900'],
                    ['Non-working days', String(diary.summary.non_working_days), diary.summary.non_working_days ? 'text-amber-600' : 'text-gray-900'],
                    ['Hours lost', String(diary.summary.hours_lost), diary.summary.hours_lost ? 'text-red-600' : 'text-gray-900'],
                    ['Labour days', String(diary.summary.labour_days), 'text-gray-900'],
                  ].map(([l, v, tone]) => (
                    <div key={l} className="card">
                      <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">{l}</p>
                      <p className={`text-2xl font-extrabold mt-1 ${tone}`}>{v}</p>
                    </div>
                  ))}
                </div>

                {diary.summary.hours_lost_by_cause.length > 0 && (
                  <div className="card">
                    <div className="mb-4">
                      <h2 className="font-bold text-gray-900">Lost time by cause</h2>
                      <p className="text-sm text-gray-500 mt-0.5">
                        What an extension-of-time claim is argued from. Weather usually earns time alone; a client
                        instruction or denied access usually carries cost as well.
                      </p>
                    </div>
                    <div className="space-y-2">
                      {diary.summary.hours_lost_by_cause.map(c => {
                        const share = diary.summary!.hours_lost > 0 ? (c.hours / diary.summary!.hours_lost) * 100 : 0;
                        return (
                          <div key={c.cause}>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-gray-700">{label(c.cause)}</span>
                              <span className="text-gray-500">
                                <strong className="text-gray-900">{c.hours}h</strong> over {c.occurrences} day{c.occurrences === 1 ? '' : 's'}
                              </span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${c.cause === 'weather' ? 'bg-blue-400' : 'bg-amber-400'}`} style={{ width: `${share}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Record a day */}
            <div className="card">
              <div className="mb-4">
                <h2 className="font-bold text-gray-900">Record a day</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  One entry per date — saving again for the same day updates it rather than adding a second record.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="form-label">Date *</label>
                  <input type="date" className="form-input" value={diaryForm.entry_date} onChange={e => setDiaryForm(f => ({ ...f, entry_date: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Weather</label>
                  <select className="form-input" value={diaryForm.weather} onChange={e => setDiaryForm(f => ({ ...f, weather: e.target.value }))}>
                    {WEATHER.map(w => <option key={w} value={w}>{WEATHER_LABEL[w]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Labour on site</label>
                  <input type="number" min={0} className="form-input" placeholder="0" value={diaryForm.labour_count} onChange={e => setDiaryForm(f => ({ ...f, labour_count: e.target.value }))} />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={diaryForm.worked} onChange={e => setDiaryForm(f => ({ ...f, worked: e.target.checked }))} className="w-4 h-4 accent-[#0D3B6E]" />
                    Site was worked
                  </label>
                </div>
                <div className="sm:col-span-2">
                  <label className="form-label">Work carried out</label>
                  <textarea rows={2} className="form-input" value={diaryForm.work_done} onChange={e => setDiaryForm(f => ({ ...f, work_done: e.target.value }))} />
                </div>
                <div className="sm:col-span-2">
                  <label className="form-label">Materials received</label>
                  <textarea rows={2} className="form-input" value={diaryForm.materials_received} onChange={e => setDiaryForm(f => ({ ...f, materials_received: e.target.value }))} />
                </div>
              </div>

              {/* Delays */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="form-label !mb-0">Delays</label>
                  <button type="button" className="btn-ghost text-xs" onClick={() => setDelayRows(r => [...r, { cause: profile.delay_causes[0] || 'other', hours_lost: 0, description: '' }])}>
                    <Plus className="w-3.5 h-3.5" /> Add delay
                  </button>
                </div>
                {delayRows.length === 0 ? (
                  <p className="text-xs text-gray-400">None recorded for this day.</p>
                ) : (
                  <div className="space-y-2">
                    {delayRows.map((d, i) => (
                      <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_100px_2fr_auto] gap-2 items-center">
                        <select className="form-input" value={d.cause} onChange={e => setDelayRows(r => r.map((x, xi) => xi === i ? { ...x, cause: e.target.value } : x))}>
                          {profile.delay_causes.map(c => <option key={c} value={c}>{label(c)}</option>)}
                        </select>
                        <input type="number" min={0} className="form-input" placeholder="hrs" value={d.hours_lost || ''} onChange={e => setDelayRows(r => r.map((x, xi) => xi === i ? { ...x, hours_lost: parseFloat(e.target.value) || 0 } : x))} />
                        <input className="form-input" placeholder="What happened" value={d.description || ''} onChange={e => setDelayRows(r => r.map((x, xi) => xi === i ? { ...x, description: e.target.value } : x))} />
                        <button type="button" onClick={() => setDelayRows(r => r.filter((_, xi) => xi !== i))} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button type="button" className="btn-primary mt-4" onClick={saveDiary} disabled={siteBusy}>
                {siteBusy ? 'Saving…' : 'Save entry'}
              </button>
            </div>

            {/* Diary */}
            <div className="card">
              <h2 className="font-bold text-gray-900 mb-4">Site diary</h2>
              {diary.entries.length === 0 ? (
                <p className="text-sm text-gray-400">Nothing recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {diary.entries.map(e => (
                    <div key={e.id} className="bg-gray-50 rounded-xl px-4 py-3 ring-1 ring-gray-100">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-gray-800 text-sm">{new Date(e.entry_date).toLocaleDateString()}</p>
                            <span className="badge bg-gray-100 text-gray-600">{WEATHER_LABEL[e.weather] || e.weather}</span>
                            {!e.worked && <span className="badge bg-red-50 text-red-600">Not worked</span>}
                            {e.labour_count > 0 && <span className="text-xs text-gray-400">{e.labour_count} on site</span>}
                          </div>
                          {e.work_done && <p className="text-sm text-gray-600 mt-1">{e.work_done}</p>}
                          {e.delays.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {e.delays.map((d, i) => (
                                <span key={i} className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                                  {label(d.cause)} · {d.hours_lost}h
                                </span>
                              ))}
                            </div>
                          )}
                          {e.recorded_by && <p className="text-xs text-gray-400 mt-1.5">Recorded by {e.recorded_by.name}</p>}
                        </div>
                        {canManage && (
                          <button onClick={() => removeIt('diary entry', `/projects/${id}/diary/${e.id}`, new Date(e.entry_date).toLocaleDateString())} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            </>
            )}

            {/* Documents */}
            <div className="card">
              <div className="mb-4">
                <h2 className="font-bold text-gray-900">Documents</h2>
                <p className="text-sm text-gray-500 mt-0.5">Contracts, drawings, permits, certificates and site photographs.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <div>
                  <label className="form-label">Category</label>
                  <select className="form-input" value={docForm.category} onChange={e => setDocForm(f => ({ ...f, category: e.target.value }))}>
                    {profile.document_categories.map(c => <option key={c} value={c}>{label(c)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Name <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input className="form-input" placeholder="Defaults to the filename" value={docForm.name} onChange={e => setDocForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="flex items-end">
                  <label className="btn-secondary w-full justify-center cursor-pointer">
                    <Plus className="w-4 h-4" /> {siteBusy ? 'Uploading…' : 'Choose file'}
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,application/pdf"
                      disabled={siteBusy}
                      onChange={e => { const f = e.target.files?.[0]; if (f) uploadDoc(f); e.target.value = ''; }}
                    />
                  </label>
                </div>
              </div>
              <p className="text-xs text-gray-400 mb-4">Images and PDFs, up to 10MB.</p>

              {docs.length === 0 ? (
                <p className="text-sm text-gray-400">Nothing uploaded yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {docs.map(d => (
                    <div key={d.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-2.5 ring-1 ring-gray-100">
                      <span className="badge bg-blue-50 text-[#0D3B6E] flex-shrink-0">{label(d.category)}</span>
                      <a href={d.url} target="_blank" rel="noreferrer" className="flex-1 min-w-0 text-sm text-gray-800 hover:text-[#0D3B6E] truncate">{d.name}</a>
                      <span className="text-xs text-gray-400 flex-shrink-0 hidden sm:inline">{new Date(d.createdAt).toLocaleDateString()}</span>
                      {canManage && (
                        <button onClick={() => removeIt('document', `/projects/${id}/documents/${d.id}`, d.name)} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {cert && <PaymentCertificate cert={cert} onClose={() => setCert(null)} />}

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
