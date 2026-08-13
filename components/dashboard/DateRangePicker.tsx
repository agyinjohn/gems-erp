'use client';

import { useState } from 'react';
import { Calendar, ChevronDown, X } from 'lucide-react';

/**
 * The window the dashboard's figures cover.
 *
 * Presets first, because "this month" is what somebody actually wants nine
 * times out of ten and picking two dates to say it is a chore. The two date
 * fields are underneath for the tenth — native ones, so the calendar is the
 * one the device already knows how to show and a phone gets its own wheel.
 *
 * "All time" is the default and is deliberately a preset rather than a cleared
 * state: the figures were all-time before this existed, and a dashboard that
 * silently starts showing one month of revenue under the same heading is worse
 * than no filter at all.
 */

export interface DateRange { from: string; to: string }

export const ALL_TIME: DateRange = { from: '', to: '' };

const iso = (d: Date) => d.toISOString().slice(0, 10);

function presets(): { key: string; label: string; range: DateRange }[] {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const today = iso(now);

  const weekStart = new Date(now);
  // Monday, because a Ghanaian trading week is not read Sunday-first.
  weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));

  const lastMonthStart = new Date(y, m - 1, 1);
  const lastMonthEnd = new Date(y, m, 0);

  return [
    { key: 'all', label: 'All time', range: ALL_TIME },
    { key: 'today', label: 'Today', range: { from: today, to: today } },
    { key: 'week', label: 'This week', range: { from: iso(weekStart), to: today } },
    { key: 'month', label: 'This month', range: { from: iso(new Date(y, m, 1)), to: today } },
    { key: 'last-month', label: 'Last month', range: { from: iso(lastMonthStart), to: iso(lastMonthEnd) } },
    { key: 'year', label: 'This year', range: { from: iso(new Date(y, 0, 1)), to: today } },
  ];
}

const sameRange = (a: DateRange, b: DateRange) => a.from === b.from && a.to === b.to;

/** What to call the window in a sentence, without making the reader parse dates. */
export function rangeLabel(range: DateRange): string {
  if (!range.from && !range.to) return 'All time';
  const hit = presets().find((p) => sameRange(p.range, range));
  if (hit) return hit.label;
  const pretty = (s: string) => (s
    ? new Date(`${s}T00:00:00Z`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
    : '');
  if (range.from && range.to) return `${pretty(range.from)} – ${pretty(range.to)}`;
  return range.from ? `From ${pretty(range.from)}` : `Up to ${pretty(range.to)}`;
}

export default function DateRangePicker({
  value, onChange,
}: {
  value: DateRange;
  onChange: (range: DateRange) => void;
}) {
  const [open, setOpen] = useState(false);
  const today = iso(new Date());

  const pick = (range: DateRange) => { onChange(range); setOpen(false); };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:border-gray-300"
      >
        <Calendar className="w-4 h-4 text-[#0D3B6E]" />
        {rangeLabel(value)}
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          {/* Tapping away closes it, which on a phone is how anything is dismissed. */}
          <button
            type="button"
            aria-label="Close"
            className="fixed inset-0 z-20 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-30 mt-2 w-72 rounded-2xl border border-gray-200 bg-white p-3 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Show figures for</p>
              <button type="button" onClick={() => setOpen(false)} className="text-gray-300 hover:text-gray-500">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {presets().map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => pick(p.range)}
                  className={`rounded-lg px-2.5 py-2 text-xs font-semibold transition-colors ${
                    sameRange(p.range, value)
                      ? 'bg-[#0D3B6E] text-white'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="mt-3 border-t border-gray-100 pt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Or pick the days</p>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="block text-[11px] text-gray-400 mb-1">From</span>
                  <input
                    type="date"
                    className="form-input !py-1.5 text-sm w-full"
                    max={value.to || today}
                    value={value.from}
                    onChange={(e) => onChange({ ...value, from: e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="block text-[11px] text-gray-400 mb-1">To</span>
                  <input
                    type="date"
                    className="form-input !py-1.5 text-sm w-full"
                    min={value.from}
                    max={today}
                    value={value.to}
                    onChange={(e) => onChange({ ...value, to: e.target.value })}
                  />
                </label>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
