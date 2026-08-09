/**
 * The shapes the Projects API returns.
 *
 * Shared by the detail page and every tab under it, so a field renamed on the
 * server fails to compile in one place rather than drifting quietly in seven.
 */

export interface Milestone {
  id: string; name: string; description?: string; weight: number; sequence: number;
  planned_start?: string; planned_end?: string; actual_end?: string;
  status: string; progress_pct: number; billable_amount: number;
}
export interface Task {
  id: string; name: string; milestone_id?: string; weight: number; status: string;
  due_date?: string; assignee_id?: { name: string } | null;
}
export interface Variation {
  id: string; reference: string; description: string; amount: number;
  status: string; raised_on: string;
}
export interface Financials {
  currency: string;
  contract_value: number; approved_variations: number; pending_variations: number; effective_contract: number;
  budget: number; expenses: number; labour_cost: number; labour_hours: number;
  actual_cost: number; committed_cost: number; forecast_cost: number;
  budget_variance: number; is_over_budget: boolean;
  progress_pct: number; earned_value: number; margin_to_date: number;
  invoiced: number; received: number; retention_pct: number; retention_held: number; unbilled: number;
}

export interface BillingPosition {
  currency: string; effective_contract: number; earned_value: number;
  certified_to_date: number; remaining_to_certify: number; uncertified_earned: number;
  retention_pct: number; retention_withheld: number; retention_released: number; retention_outstanding: number;
  invoiced_net: number; received: number; applications: number;
}
export interface ProjectInvoice {
  id: string; invoice_number: string; issue_date: string; due_date: string;
  work_value: number; retention_amount: number; total: number; amount_paid: number;
  status: string; is_retention_release: boolean;
}
export interface BillableMilestone { id: string; name: string; billable_amount: number; actual_end?: string }

export interface ScheduleMilestone {
  milestone_id: string; name: string; renamed_from?: string | null;
  removed?: boolean; added_since_baseline?: boolean; weight: number;
  baseline_start?: string | null; baseline_end?: string | null;
  current_end?: string | null; actual_end?: string | null;
  status: string; progress_pct: number;
  plan_slip_days: number | null; actual_slip_days: number | null; days_late: number;
}
export interface CurvePoint { month: string; label: string; planned_pct: number; actual_pct: number | null }
export interface Baseline {
  id: string; version: number; name: string; reason?: string | null; set_on?: string;
  start_date?: string | null; planned_end_date?: string | null;
  contract_value: number; milestone_count: number;
}
export interface Schedule {
  has_baseline: boolean; currency: string; actual_pct: number;
  baseline?: Baseline;
  planned_pct?: number; planned_value?: number; earned_value?: number; schedule_variance?: number;
  spi?: number | null; status?: string;
  baseline_end_date?: string | null; current_end_date?: string | null;
  completion_slip_days?: number | null;
  forecast_end_date?: string | null; forecast_slip_days?: number | null;
  milestones: ScheduleMilestone[]; curve: CurvePoint[];
}
export interface BaselineRow {
  id: string; version: number; name: string; reason?: string;
  planned_end_date?: string | null; contract_value: number;
  is_current: boolean; createdAt: string; set_by?: { name: string } | null;
}

export interface CashBucket {
  month: string; label: string; inflow: number; outflow: number;
  net: number; cumulative: number; by_category: Record<string, number>;
}
export interface CashFlow {
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

export interface EotCause {
  cause: string; hours_lost: number; occurrences?: number;
  days_equivalent: number; entitlement: string; entitlement_label?: string;
}
export interface EotEvidence {
  id: string; entry_date: string; weather: string; worked: boolean;
  hours_lost: number; causes: string[]; already_claimed_on: string | null;
}
export interface EotAnalysis {
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
export interface EotClaim {
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
export interface EotPosition {
  claims: number; submitted: number;
  days_claimed: number; days_granted: number; days_awaiting: number; days_rejected: number;
  cost_claimed: number; cost_granted: number;
}

export interface Delay { cause: string; hours_lost: number; description?: string }
export interface DiaryEntry {
  id: string; entry_date: string; weather: string; worked: boolean;
  labour_count: number; labour_notes?: string; plant_notes?: string;
  work_done?: string; materials_received?: string; delays: Delay[];
  visitors?: string; instructions?: string;
  recorded_by?: { name: string } | null;
}
export interface DiarySummary {
  entries: number; non_working_days: number; labour_days: number;
  severe_weather_days: number; hours_lost: number; weather_hours_lost: number;
  hours_lost_by_cause: { cause: string; hours: number; occurrences: number }[];
}
export interface ProjectDoc {
  id: string; name: string; category: string; url: string;
  mime_type?: string; size?: number; createdAt: string;
  uploaded_by?: { name: string } | null;
  /** Published to the client's page. Internal until somebody says otherwise. */
  shared_with_client?: boolean;
  /** Sent in by the client, so always visible to them. */
  from_client?: boolean;
  client_name?: string;
}
