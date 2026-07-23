'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Spinner } from '@/components/ui';
import api, { apiCache } from '@/lib/api';
import ReportsShell from '@/components/reports/ReportsShell';
import ReportPanels, { type ReportsBundle } from '@/components/reports/ReportPanels';
import ReportDetailed from '@/components/reports/ReportDetailed';
import {
  type DatePreset, getPresetRange, formatPeriodLabel,
  exportCsv, printReport, buildFullExportRows,
} from '@/lib/reportUtils';

const EMPTY: ReportsBundle = {
  overview: {}, sales: {}, inventory: {}, finance: {}, procurement: {}, hr: {}, crm: {},
};

type ReportEndpoint = keyof ReportsBundle;

// Each tab renders a subset of ReportPanels sections and only loads the
// report endpoints those sections actually read.
const TABS: {
  id: string;
  label: string;
  sections: string[];
  endpoints: ReportEndpoint[];
}[] = [
  { id: 'overview',    label: 'Overview',     sections: ['summary'],                   endpoints: ['overview', 'inventory'] },
  { id: 'sales',       label: 'Sales',        sections: ['sales', 'tax-promo', 'pos'], endpoints: ['sales', 'overview'] },
  { id: 'finance',     label: 'Finance',      sections: ['finance'],                   endpoints: ['finance', 'hr', 'procurement'] },
  { id: 'inventory',   label: 'Inventory',    sections: ['inventory'],                 endpoints: ['inventory'] },
  { id: 'procurement', label: 'Procurement',  sections: ['procurement'],               endpoints: ['procurement'] },
  { id: 'people',      label: 'People & CRM', sections: ['people'],                    endpoints: ['crm', 'hr'] },
  { id: 'full',        label: 'Full Report',  sections: [],                            endpoints: ['overview', 'sales', 'inventory', 'finance', 'procurement', 'hr', 'crm'] },
];

const ALL_ENDPOINTS: ReportEndpoint[] = ['overview', 'sales', 'inventory', 'finance', 'procurement', 'hr', 'crm'];

export default function ReportsPage() {
  const [preset, setPreset] = useState<DatePreset>('this_month');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [branchId, setBranchId] = useState('');
  const [branches, setBranches] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
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

  // Signature of the current filters — when it changes, previously loaded
  // endpoints are stale and must be refetched.
  const sig = useMemo(
    () => new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString(),
    [params],
  );

  // Per-filter store of already-loaded endpoints + the merged bundle, so
  // revisiting a tab (or the same filters) is instant.
  const store = useRef<{ sig: string; keys: Set<ReportEndpoint>; bundle: ReportsBundle }>({
    sig: '', keys: new Set<ReportEndpoint>(), bundle: { ...EMPTY },
  });

  const loadEndpoints = useCallback(async (eps: ReportEndpoint[], silent = false): Promise<ReportsBundle> => {
    // Reset when the filter signature changes.
    if (store.current.sig !== sig) {
      store.current = { sig, keys: new Set<ReportEndpoint>(), bundle: { ...EMPTY } };
      const cached = apiCache.get(`/reports:${sig}`) as ReportsBundle | null;
      if (cached) {
        store.current.bundle = { ...cached };
        (Object.keys(cached) as ReportEndpoint[]).forEach((k) => {
          if (cached[k] && Object.keys(cached[k]).length) store.current.keys.add(k);
        });
      }
    }

    const missing = eps.filter((ep) => !store.current.keys.has(ep));
    if (missing.length) {
      if (!silent) setLoading(true);
      setError('');
      try {
        const results = await Promise.all(
          missing.map((ep) => api.get(`/reports/${ep}`, { params }).then((r) => r.data.data || {})),
        );
        missing.forEach((ep, i) => { store.current.bundle[ep] = results[i]; store.current.keys.add(ep); });
        apiCache.set(`/reports:${sig}`, store.current.bundle);
      } catch (e: any) {
        setError(e.response?.data?.message || 'Failed to load reports.');
      }
    }

    setData({ ...store.current.bundle });
    setLoading(false);
    return store.current.bundle;
  }, [sig, params]);

  const tab = TABS.find((t) => t.id === activeTab) || TABS[0];

  // Load the active tab whenever it changes or the filters change.
  useEffect(() => {
    loadEndpoints(tab.endpoints);
  }, [activeTab, loadEndpoints]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyPreset = (p: DatePreset) => {
    setPreset(p);
    const r = getPresetRange(p);
    setDateFrom(r.from);
    setDateTo(r.to);
  };

  const handleDateFrom = (v: string) => { setPreset('all'); setDateFrom(v); };
  const handleDateTo = (v: string) => { setPreset('all'); setDateTo(v); };

  const branchLabel = branchId
    ? (branches.find((b) => (b.id || b._id) === branchId)?.name || 'Selected branch')
    : 'All branches';

  // Export needs the whole bundle — make sure every section is loaded first.
  const handleExport = async () => {
    const full = await loadEndpoints(ALL_ENDPOINTS, true);
    exportCsv(`gems-report-${Date.now()}.csv`, buildFullExportRows(full, periodLabel));
  };

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
        onRefresh={() => {
          tab.endpoints.forEach((ep) => store.current.keys.delete(ep));
          loadEndpoints(tab.endpoints);
        }}
        onExport={handleExport}
        onPrint={() => printReport(`GEMS Business Report — ${periodLabel}`, 'reports-print-area')}
      >
        {/* Section tabs */}
        <div className="-mt-2 mb-1 flex gap-1.5 overflow-x-auto scrollbar-hide pb-1 print:hidden" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={activeTab === t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                activeTab === t.id
                  ? 'bg-[#0D3B6E] text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-16"><Spinner /></div>
        ) : error ? (
          <div className="card text-center py-12 text-red-600">{error}</div>
        ) : activeTab === 'full' ? (
          <ReportDetailed data={data} periodLabel={periodLabel} branchLabel={branchLabel} />
        ) : (
          <ReportPanels data={data} periodLabel={periodLabel} sections={tab.sections} />
        )}
      </ReportsShell>
    </AppLayout>
  );
}
