'use client';

import { ReactNode } from 'react';
import { Download, RefreshCw, Printer } from 'lucide-react';
import type { DatePreset } from '@/lib/reportUtils';
import { formatPeriodLabel } from '@/lib/reportUtils';

const PRESETS: { id: DatePreset; label: string }[] = [
  { id: 'this_month', label: 'This month' },
  { id: 'last_30', label: 'Last 30 days' },
  { id: 'ytd', label: 'Year to date' },
  { id: 'all', label: 'All time' },
];

interface Props {
  preset: DatePreset;
  onPreset: (p: DatePreset) => void;
  dateFrom: string;
  dateTo: string;
  onDateFrom: (v: string) => void;
  onDateTo: (v: string) => void;
  branchId: string;
  onBranchId: (v: string) => void;
  branches: any[];
  loading: boolean;
  onRefresh: () => void;
  onExport: () => void;
  onPrint: () => void;
  children: ReactNode;
}

export default function ReportsShell({
  preset, onPreset, dateFrom, dateTo, onDateFrom, onDateTo,
  branchId, onBranchId, branches, loading, onRefresh, onExport, onPrint, children,
}: Props) {
  const periodLabel = formatPeriodLabel(dateFrom, dateTo);

  return (
    <div className="min-w-0">
      <div className="mb-4 md:mb-6">
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-3 md:px-4 py-3 flex flex-col lg:flex-row lg:items-center gap-3 bg-gray-50/80">
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mr-1 hidden sm:inline">Period</span>
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onPreset(p.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                    preset === p.id
                      ? 'bg-[#0D3B6E] text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {p.label}
                </button>
              ))}
              <span className="hidden md:inline w-px h-5 bg-gray-200 mx-1" />
              <input
                type="date"
                className="form-input py-1 text-xs w-[8.75rem] bg-white"
                value={dateFrom}
                onChange={(e) => onDateFrom(e.target.value)}
                aria-label="From"
              />
              <span className="text-gray-300 text-xs">–</span>
              <input
                type="date"
                className="form-input py-1 text-xs w-[8.75rem] bg-white"
                value={dateTo}
                onChange={(e) => onDateTo(e.target.value)}
                aria-label="To"
              />
              {branches.length > 0 && (
                <select
                  className="form-input py-1 text-xs min-w-[8.75rem] bg-white max-w-[10rem]"
                  value={branchId}
                  onChange={(e) => onBranchId(e.target.value)}
                >
                  <option value="">All branches</option>
                  {branches.map((b) => (
                    <option key={b._id || b.id} value={b._id || b.id}>{b.name}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center justify-between lg:justify-end gap-2 shrink-0">
              <p className="text-xs text-gray-500 lg:hidden truncate">{periodLabel}</p>
              <div className="flex items-center gap-2">
                <span className="hidden lg:inline text-xs text-gray-500 mr-1 tabular-nums">{periodLabel}</span>
                <button type="button" className="btn-secondary py-1.5 px-2.5" onClick={onRefresh} title="Refresh" disabled={loading}>
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <button type="button" className="btn-secondary py-1.5 text-xs flex items-center gap-1.5" onClick={onExport} disabled={loading}>
                  <Download className="w-3.5 h-3.5" /><span className="hidden sm:inline">Export</span>
                </button>
                <button type="button" className="btn-secondary py-1.5 text-xs flex items-center gap-1.5" onClick={onPrint} disabled={loading}>
                  <Printer className="w-3.5 h-3.5" /><span className="hidden sm:inline">Print</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div id="reports-print-area" className="space-y-8 md:space-y-10">
        {children}
      </div>
    </div>
  );
}
