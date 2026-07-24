'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, Clock, Umbrella, Banknote, Wallet, FileText, CheckCircle2, Cake, Award } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { StatCard, Spinner, EmptyState } from '@/components/ui';
import { ReportBlock, DataTable, CHART_TOOLTIP, ChartEmpty } from '@/components/reports/shared';
import { fmtGhs } from '@/lib/reportUtils';
import { hrHref } from '@/lib/hrNav';
import HrReport from '@/components/hr/HrReport';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function HrDashboard() {
  const router = useRouter();
  const { tenant } = useAuth();
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    api.get('/hr/summary')
      .then((res) => setSummary(res.data.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (!summary) {
    return <EmptyState message="Couldn't load the HR dashboard" icon={<Users className="w-8 h-8 text-gray-300" />} />;
  }

  const trend = (summary.payroll_trend || []).map((t: any) => ({
    label: `${MONTHS[t.month - 1]} ${String(t.year).slice(2)}`,
    total: t.total,
  }));

  const upcomingPeople = [
    ...(summary.upcoming_birthdays || []).map((b: any) => ({ ...b, kind: 'birthday' as const })),
    ...(summary.upcoming_anniversaries || []).map((a: any) => ({ ...a, kind: 'anniversary' as const })),
  ].sort((a, b) => a.days_until - b.days_until);

  return (
    <>
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <p className="text-sm text-gray-500">Live workforce snapshot, updated in real time.</p>
        <button className="btn-primary" onClick={() => setShowReport(true)}>
          <FileText className="w-4 h-4" /> Generate HR Report
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-5">
        <StatCard label="Active staff" value={summary.active} icon={<Users className="w-5 h-5 text-white" />} color="bg-[#0D3B6E]" sub={`${summary.total_employees} total`} />
        <StatCard label="On leave today" value={summary.on_leave} icon={<Umbrella className="w-5 h-5 text-white" />} color="bg-amber-500" />
        <StatCard label="Pending approvals" value={summary.pending_leave} icon={<CheckCircle2 className="w-5 h-5 text-white" />} color="bg-red-500" />
        <StatCard label="Present today" value={summary.attendance_today} icon={<Clock className="w-5 h-5 text-white" />} color="bg-green-600" />
        <StatCard label="Last payroll run" value={fmtGhs(summary.payroll_total)} icon={<Banknote className="w-5 h-5 text-white" />} color="bg-purple-600" sub={`${summary.payroll_runs} approved run(s)`} />
        <StatCard label="Outstanding loans" value={fmtGhs(summary.outstanding_loans_total)} icon={<Wallet className="w-5 h-5 text-white" />} color="bg-sky-600" sub={`${summary.outstanding_loans_count} active`} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-5">
        <ReportBlock title="Payroll trend" subtitle="Net pay per approved period">
          {trend.length === 0 ? <ChartEmpty message="No approved payroll runs yet" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip {...CHART_TOOLTIP} formatter={(v: any) => fmtGhs(v)} />
                <Bar dataKey="total" fill="#0D3B6E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ReportBlock>

        <ReportBlock title="Headcount by department">
          {(!summary.department_breakdown || summary.department_breakdown.length === 0) ? <ChartEmpty message="No active employees yet" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={summary.department_breakdown} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis dataKey="department" type="category" tick={{ fontSize: 11 }} width={100} />
                <Tooltip {...CHART_TOOLTIP} />
                <Bar dataKey="count" fill="#1A6BB5" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ReportBlock>

        <ReportBlock
          title="Pending leave approvals"
          subtitle={summary.pending_leave > summary.pending_leave_list?.length ? `Showing ${summary.pending_leave_list.length} of ${summary.pending_leave}` : undefined}
        >
          {summary.pending_leave_list?.length > 0 ? (
            <>
              <DataTable
                headers={['Employee', 'Type', 'Dates']}
                rows={summary.pending_leave_list.map((l: any) => [
                  l.employee_name,
                  l.leave_type,
                  `${new Date(l.start_date).toLocaleDateString()} – ${new Date(l.end_date).toLocaleDateString()}`,
                ])}
              />
              <button className="text-xs text-blue-600 hover:underline mt-3" onClick={() => router.push(hrHref('leave'))}>
                Review in Leave →
              </button>
            </>
          ) : <ChartEmpty message="No pending leave requests" />}
        </ReportBlock>

        <ReportBlock title="On leave today">
          {summary.on_leave_list?.length > 0 ? (
            <DataTable
              headers={['Employee', 'Type', 'Back']}
              rows={summary.on_leave_list.map((l: any) => [l.employee_name, l.leave_type, new Date(l.end_date).toLocaleDateString()])}
            />
          ) : <ChartEmpty message="Everyone is in today" />}
        </ReportBlock>

        <ReportBlock title="Workforce mix" subtitle="Active employees by employment type">
          {summary.employment_type_breakdown?.length > 0 ? (
            <div className="space-y-3">
              {summary.employment_type_breakdown.map((t: any) => {
                const pct = summary.active ? Math.round((t.count / summary.active) * 100) : 0;
                return (
                  <div key={t.type}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-gray-600 font-medium capitalize">{t.type.replace(/_/g, ' ')}</span>
                      <span className="font-semibold text-gray-900 tabular-nums">{t.count} <span className="text-gray-400 font-normal">({pct}%)</span></span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-[#0D3B6E]/70" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <ChartEmpty message="No active employees yet" />}
        </ReportBlock>

        <ReportBlock title="Upcoming birthdays & anniversaries" subtitle="Next 30 days">
          {upcomingPeople.length > 0 ? (
            <div className="space-y-2">
              {upcomingPeople.map((p: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2">
                    {p.kind === 'birthday'
                      ? <Cake className="w-4 h-4 text-pink-500 flex-shrink-0" />
                      : <Award className="w-4 h-4 text-amber-500 flex-shrink-0" />}
                    <span className="text-sm text-gray-700">
                      {p.name} {p.kind === 'anniversary' ? `— ${p.years}-year anniversary` : '— Birthday'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">{p.days_until === 0 ? 'Today' : `in ${p.days_until}d`}</span>
                </div>
              ))}
            </div>
          ) : <ChartEmpty message="Nothing coming up in the next 30 days" />}
        </ReportBlock>
      </div>

      {showReport && (
        <HrReport summary={summary} businessName={tenant?.business_name} onClose={() => setShowReport(false)} />
      )}
    </>
  );
}
