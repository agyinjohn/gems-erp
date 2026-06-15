'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Spinner } from '@/components/ui';
import api from '@/lib/api';
import ReportsShell from '@/components/reports/ReportsShell';
import ReportPanels, { type ReportsBundle } from '@/components/reports/ReportPanels';
import {
  type DatePreset, getPresetRange, formatPeriodLabel,
  exportCsv, printReport, buildFullExportRows,
} from '@/lib/reportUtils';

const EMPTY: ReportsBundle = {
  overview: {},
  sales: {},
  inventory: {},
  finance: {},
  procurement: {},
  hr: {},
  crm: {},
};

export default function ReportsPage() {
  const [preset, setPreset] = useState<DatePreset>('this_month');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [branchId, setBranchId] = useState('');
  const [branches, setBranches] = useState<any[]>([]);
  const [data, setData] = useState<ReportsBundle>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const r = getPresetRange('this_month');
    setDateFrom(r.from);
    setDateTo(r.to);
  }, []);

  useEffect(() => {
    api.get('/reports/branches').then((res) => setBranches(res.data.data || [])).catch(() => {});
  }, []);

  const periodLabel = useMemo(() => formatPeriodLabel(dateFrom, dateTo), [dateFrom, dateTo]);

  const params = useMemo(() => ({
    from: dateFrom || undefined,
    to: dateTo || undefined,
    branch_id: branchId || undefined,
  }), [dateFrom, dateTo, branchId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const endpoints = [
        '/reports/overview',
        '/reports/sales',
        '/reports/inventory',
        '/reports/finance',
        '/reports/procurement',
        '/reports/hr',
        '/reports/crm',
      ] as const;
      const results = await Promise.all(
        endpoints.map((ep) => api.get(ep, { params }).then((r) => r.data.data || {})),
      );
      setData({
        overview: results[0],
        sales: results[1],
        inventory: results[2],
        finance: results[3],
        procurement: results[4],
        hr: results[5],
        crm: results[6],
      });
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load reports.');
      setData(EMPTY);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => { load(); }, [load]);

  const applyPreset = (p: DatePreset) => {
    setPreset(p);
    const r = getPresetRange(p);
    setDateFrom(r.from);
    setDateTo(r.to);
  };

  const handleDateFrom = (v: string) => { setPreset('all'); setDateFrom(v); };
  const handleDateTo = (v: string) => { setPreset('all'); setDateTo(v); };

  return (
    <AppLayout
      title="Reports"
      subtitle="Full business analysis for the selected period"
      allowedRoles={['business_owner', 'super_admin', 'accountant', 'hr_manager']}
    >
      <ReportsShell
        preset={preset}
        onPreset={applyPreset}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFrom={handleDateFrom}
        onDateTo={handleDateTo}
        branchId={branchId}
        onBranchId={setBranchId}
        branches={branches}
        loading={loading}
        onRefresh={load}
        onExport={() => exportCsv(`gems-report-${Date.now()}.csv`, buildFullExportRows(data, periodLabel))}
        onPrint={() => printReport(`GEMS Business Report — ${periodLabel}`, 'reports-print-area')}
      >
        {loading ? (
          <div className="py-16"><Spinner /></div>
        ) : error ? (
          <div className="card text-center py-12 text-red-600">{error}</div>
        ) : (
          <ReportPanels data={data} periodLabel={periodLabel} />
        )}
      </ReportsShell>
    </AppLayout>
  );
}
