'use client';

import { useState } from 'react';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from '@/components/ui';
import api from '@/lib/api';

/**
 * The statutory figures, and the dates they took effect.
 *
 * These were compiled into the payroll calculation. That was fine until the
 * budget changed them, at which point every payslip was quietly wrong until
 * somebody shipped a release. Now they are data, and a business that needs the
 * new figures on the day they take effect does not have to wait for one.
 *
 * Dated, not simply editable. Payroll for a period uses whatever was in force
 * *then*, so re-running an old month is still correct after a change, and
 * editing today's rates cannot restate payslips already issued. That is why
 * this asks for a start date rather than just letting you type over the old
 * numbers.
 *
 * Following the national schedule is the normal case and is left alone. A
 * business only appears here at all if it needs to depart from it.
 */

interface Band { up_to: number | null | ''; rate: number | string }
interface BandSet { effective_from: string; label?: string; bands: Band[] }
interface RateSet {
  effective_from: string;
  label?: string;
  employee_rate: number | string;
  employer_rate: number | string;
  tier1_rate: number | string;
  tier2_rate: number | string;
}

interface Props {
  payeBands: BandSet[];
  pensionRates: RateSet[];
  national: { paye_bands: BandSet; pension_rates: RateSet };
  canEdit: boolean;
  onSaved: () => void;
}

const pct = (rate: number | string) => `${(Number(rate) * 100).toFixed(2).replace(/\.?0+$/, '')}%`;
const today = () => new Date().toISOString().slice(0, 10);
const asDate = (value: string) => (value || '').slice(0, 10);

export default function StatutoryRates({ payeBands, pensionRates, national, canEdit, onSaved }: Props) {
  const [bandSets, setBandSets] = useState<BandSet[]>(payeBands);
  const [rateSets, setRateSets] = useState<RateSet[]>(pensionRates);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(payeBands.length > 0 || pensionRates.length > 0);

  const save = async (next: { paye_bands?: BandSet[]; pension_rates?: RateSet[] }) => {
    setSaving(true);
    try {
      await api.patch('/hr/payroll-settings', next);
      toast.success('Statutory figures saved');
      onSaved();
    } catch (e: any) {
      // The server checks these properly — that the bands climb, that the top
      // one is open-ended, that the two halves of the pension agree. Its
      // message says which, so it is shown rather than replaced.
      toast.error(e.response?.data?.message || 'Could not save those figures');
    } finally { setSaving(false); }
  };

  /* ── PAYE ───────────────────────────────────────────────────────────────── */

  const addBandSet = () => setBandSets(sets => [...sets, {
    effective_from: today(),
    label: '',
    // Seeded from what is in force, because a change is nearly always a tweak
    // to the existing table rather than a table invented from nothing.
    bands: national.paye_bands.bands.map(b => ({ ...b })),
  }]);

  const editBand = (setIndex: number, bandIndex: number, field: 'up_to' | 'rate', value: string) =>
    setBandSets(sets => sets.map((set, i) => (i !== setIndex ? set : {
      ...set,
      bands: set.bands.map((band, j) => (j !== bandIndex ? band : {
        ...band,
        [field]: value === '' ? (field === 'up_to' ? null : '') : Number(value),
      })),
    })));

  const addBand = (setIndex: number) =>
    setBandSets(sets => sets.map((set, i) => (i !== setIndex ? set : {
      ...set,
      // The new slice goes in above the open-ended one, which always stays last.
      bands: [...set.bands.slice(0, -1), { up_to: null, rate: 0 }, set.bands[set.bands.length - 1]],
    })));

  const removeBand = (setIndex: number, bandIndex: number) =>
    setBandSets(sets => sets.map((set, i) => (i !== setIndex ? set : {
      ...set, bands: set.bands.filter((_, j) => j !== bandIndex),
    })));

  /* ── Pension ────────────────────────────────────────────────────────────── */

  const addRateSet = () => setRateSets(sets => [...sets, {
    effective_from: today(),
    label: '',
    employee_rate: national.pension_rates.employee_rate,
    employer_rate: national.pension_rates.employer_rate,
    tier1_rate: national.pension_rates.tier1_rate,
    tier2_rate: national.pension_rates.tier2_rate,
  }]);

  const editRate = (index: number, field: keyof RateSet, value: string) =>
    setRateSets(sets => sets.map((set, i) => (i !== index ? set : {
      ...set, [field]: field === 'effective_from' || field === 'label' ? value : (value === '' ? '' : Number(value)),
    })));

  /** Shown while typing, because the server will refuse a set that doesn't balance. */
  const imbalance = (set: RateSet) => {
    const inTotal = (Number(set.employee_rate) || 0) + (Number(set.employer_rate) || 0);
    const outTotal = (Number(set.tier1_rate) || 0) + (Number(set.tier2_rate) || 0);
    return Math.abs(inTotal - outTotal) < 0.000001 ? null : { inTotal, outTotal };
  };

  const inForce = national.pension_rates;

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm mb-1">Statutory figures</h3>
          <p className="text-xs text-gray-400">
            The PAYE bands and pension rates payroll calculates with. You are following the
            national schedule — set your own only if you need different figures before
            they ship, or if the law changes and this hasn&apos;t caught up yet.
          </p>
        </div>
        <button type="button" className="btn-secondary text-xs shrink-0" onClick={() => setOpen(o => !o)}>
          {open ? 'Hide' : 'Show'}
        </button>
      </div>

      {open && (
        <div className="mt-4 space-y-5">

          {/* What is being used right now */}
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">In force today</p>
            <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-xs text-gray-600">
              <span>Employee <strong className="tabular-nums">{pct(inForce.employee_rate)}</strong></span>
              <span>Employer <strong className="tabular-nums">{pct(inForce.employer_rate)}</strong></span>
              <span>Tier 1 → SSNIT <strong className="tabular-nums">{pct(inForce.tier1_rate)}</strong></span>
              <span>Tier 2 → trustee <strong className="tabular-nums">{pct(inForce.tier2_rate)}</strong></span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mt-2">
              {national.paye_bands.bands.map((b, i) => (
                <span key={i} className="tabular-nums">
                  {b.up_to === null ? 'above' : `to ${Number(b.up_to).toLocaleString()}`} · {pct(b.rate)}
                </span>
              ))}
            </div>
          </div>

          {/* PAYE bands */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-gray-800">Your PAYE bands</p>
              {canEdit && (
                <button type="button" className="btn-secondary text-xs" onClick={addBandSet}>
                  <Plus className="w-3.5 h-3.5" /> New bands from a date
                </button>
              )}
            </div>
            {bandSets.length === 0 ? (
              <p className="text-xs text-gray-400">None — the national bands above are used.</p>
            ) : (
              <div className="space-y-3">
                {bandSets.map((set, si) => (
                  <div key={si} className="rounded-xl ring-1 ring-gray-200 p-3">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <label className="text-xs text-gray-500">In force from</label>
                      <input type="date" className="form-input !py-1 !w-auto text-xs"
                        value={asDate(set.effective_from)} disabled={!canEdit}
                        onChange={e => setBandSets(sets => sets.map((x, i) => (i === si ? { ...x, effective_from: e.target.value } : x)))} />
                      <input className="form-input !py-1 flex-1 min-w-[140px] text-xs" placeholder="Label (optional)"
                        value={set.label || ''} disabled={!canEdit}
                        onChange={e => setBandSets(sets => sets.map((x, i) => (i === si ? { ...x, label: e.target.value } : x)))} />
                      {canEdit && (
                        <button type="button" title="Remove this set"
                          onClick={() => setBandSets(sets => sets.filter((_, i) => i !== si))}
                          className="p-1.5 hover:bg-red-50 rounded text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      {set.bands.map((band, bi) => {
                        const last = bi === set.bands.length - 1;
                        return (
                          <div key={bi} className="flex items-center gap-2">
                            <span className="text-xs text-gray-400 w-12 shrink-0">{last ? 'above' : 'up to'}</span>
                            <input type="number" step="0.01" className="form-input !py-1 w-32 text-xs tabular-nums"
                              placeholder={last ? 'no ceiling' : '0.00'}
                              value={last ? '' : (band.up_to ?? '')}
                              disabled={!canEdit || last}
                              onChange={e => editBand(si, bi, 'up_to', e.target.value)} />
                            <span className="text-xs text-gray-400">at</span>
                            <input type="number" step="0.001" min="0" max="1"
                              className="form-input !py-1 w-24 text-xs tabular-nums"
                              value={band.rate} disabled={!canEdit}
                              onChange={e => editBand(si, bi, 'rate', e.target.value)} />
                            <span className="text-xs text-gray-400 w-14">{pct(band.rate)}</span>
                            {canEdit && !last && set.bands.length > 1 && (
                              <button type="button" onClick={() => removeBand(si, bi)}
                                className="p-1 hover:bg-red-50 rounded text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {canEdit && (
                      <button type="button" className="btn-ghost text-xs mt-2" onClick={() => addBand(si)}>
                        <Plus className="w-3.5 h-3.5" /> Add a band
                      </button>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      Rates as fractions — 0.175 is 17.5%. Each band must end above the one before it,
                      and the last has no ceiling.
                    </p>
                  </div>
                ))}
                {canEdit && (
                  <button type="button" className="btn-primary text-xs" disabled={saving}
                    onClick={() => save({ paye_bands: bandSets })}>
                    {saving ? 'Saving…' : 'Save PAYE bands'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Pension rates */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-gray-800">Your pension rates</p>
              {canEdit && (
                <button type="button" className="btn-secondary text-xs" onClick={addRateSet}>
                  <Plus className="w-3.5 h-3.5" /> New rates from a date
                </button>
              )}
            </div>
            {rateSets.length === 0 ? (
              <p className="text-xs text-gray-400">None — the national rates above are used.</p>
            ) : (
              <div className="space-y-3">
                {rateSets.map((set, i) => {
                  const off = imbalance(set);
                  return (
                    <div key={i} className="rounded-xl ring-1 ring-gray-200 p-3">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <label className="text-xs text-gray-500">In force from</label>
                        <input type="date" className="form-input !py-1 !w-auto text-xs"
                          value={asDate(set.effective_from)} disabled={!canEdit}
                          onChange={e => editRate(i, 'effective_from', e.target.value)} />
                        <input className="form-input !py-1 flex-1 min-w-[140px] text-xs" placeholder="Label (optional)"
                          value={set.label || ''} disabled={!canEdit}
                          onChange={e => editRate(i, 'label', e.target.value)} />
                        {canEdit && (
                          <button type="button" title="Remove this set"
                            onClick={() => setRateSets(sets => sets.filter((_, j) => j !== i))}
                            className="p-1.5 hover:bg-red-50 rounded text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {([
                          ['employee_rate', 'Employee pays'],
                          ['employer_rate', 'Employer pays'],
                          ['tier1_rate', 'Tier 1 → SSNIT'],
                          ['tier2_rate', 'Tier 2 → trustee'],
                        ] as const).map(([field, label]) => (
                          <div key={field}>
                            <label className="block text-xs text-gray-500 mb-1">{label}</label>
                            <input type="number" step="0.001" min="0" max="1"
                              className="form-input !py-1 w-full text-xs tabular-nums"
                              value={set[field]} disabled={!canEdit}
                              onChange={e => editRate(i, field, e.target.value)} />
                            <span className="text-xs text-gray-400">{pct(set[field])}</span>
                          </div>
                        ))}
                      </div>
                      {off ? (
                        <p className="text-xs text-amber-700 mt-2 flex items-start gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>
                            {pct(off.inTotal)} goes in but {pct(off.outTotal)} comes out. It is one
                            contribution split two ways, so these have to match — otherwise the payslips
                            and the remittances describe different money.
                          </span>
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400 mt-2 tabular-nums">
                          {pct((Number(set.employee_rate) || 0) + (Number(set.employer_rate) || 0))} in,
                          split {pct(set.tier1_rate)} to SSNIT and {pct(set.tier2_rate)} to the trustee.
                        </p>
                      )}
                    </div>
                  );
                })}
                {canEdit && (
                  <button type="button" className="btn-primary text-xs"
                    disabled={saving || rateSets.some(set => imbalance(set))}
                    onClick={() => save({ pension_rates: rateSets })}>
                    {saving ? 'Saving…' : 'Save pension rates'}
                  </button>
                )}
              </div>
            )}
          </div>

          <p className="text-xs text-gray-400">
            Payroll for a period uses whatever was in force then, so changing these never
            restates a payslip already issued, and re-running an old month still comes out right.
          </p>
        </div>
      )}
    </div>
  );
}
