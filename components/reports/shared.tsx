'use client';

import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { ReactNode } from 'react';

export const CHART_COLORS = ['#0D3B6E', '#1A6BB5', '#2E8BC0', '#60A5FA', '#22c55e', '#f59e0b', '#ef4444', '#a855f7'];

export const CHART_TOOLTIP = {
  contentStyle: { borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 },
  labelStyle: { fontWeight: 600, color: '#374151' },
};

export function ChangeBadge({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) return null;
  const up = value >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium mt-1 ${up ? 'text-[#0D3B6E]' : 'text-red-600'}`}>
      {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {up ? '+' : ''}{value}% vs prior
    </span>
  );
}

export function ChartEmpty({ message = 'No data for this period' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-gray-400 text-sm">
      <p>{message}</p>
    </div>
  );
}

export function ReportBlock({ title, subtitle, children, className = '' }: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`card p-0 overflow-hidden ${className}`}>
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export function ReportSection({ id, title, subtitle, children }: {
  id: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4 md:space-y-5">
      <div>
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

export function MetricGrid({ children, cols = 4 }: { children: ReactNode; cols?: 2 | 4 }) {
  const colClass = cols === 2 ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4';
  return <div className={`grid ${colClass} gap-3 md:gap-4`}>{children}</div>;
}

export function MetricStrip({ items }: { items: { label: string; value: string; sub?: string }[] }) {
  const colClass = items.length <= 2
    ? 'grid-cols-2'
    : items.length === 3
      ? 'grid-cols-2 sm:grid-cols-3'
      : 'grid-cols-2 sm:grid-cols-4';
  return (
    <div className={`grid ${colClass} gap-3`}>
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-gray-100 bg-gray-50/70 px-3 py-2.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">{item.label}</p>
          <p className="text-base sm:text-lg font-bold text-gray-900 tabular-nums mt-0.5 truncate">{item.value}</p>
          {item.sub && <p className="text-xs text-gray-400 mt-0.5 truncate">{item.sub}</p>}
        </div>
      ))}
    </div>
  );
}

export function DataTable({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  if (!rows.length) return <ChartEmpty />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            {headers.map((h, i) => (
              <th
                key={h}
                className={`px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide ${i > 0 ? 'text-right' : 'text-left'}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci} className={`px-3 py-2.5 text-gray-800 ${ci > 0 ? 'text-right tabular-nums font-medium' : ''}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StockHealthBars({ healthy, low, out, total }: {
  healthy: number;
  low: number;
  out: number;
  total: number;
}) {
  const rows = [
    { label: 'Healthy', value: healthy, color: 'bg-[#0D3B6E]/70' },
    { label: 'Low stock', value: low, color: 'bg-amber-400' },
    { label: 'Out of stock', value: out, color: 'bg-red-500' },
  ];
  return (
    <div className="space-y-4">
      {rows.map((row) => {
        const pct = total ? Math.round((row.value / total) * 100) : 0;
        return (
          <div key={row.label}>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-gray-600 font-medium">{row.label}</span>
              <span className="font-semibold text-gray-900 tabular-nums">
                {row.value} <span className="text-gray-400 font-normal">({pct}%)</span>
              </span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${row.color}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
