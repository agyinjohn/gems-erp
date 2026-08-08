'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { toast } from '@/components/ui';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import type { TabProps } from '@/components/projects/shared';
import { ENTITLEMENT_TONE, ENTITLEMENT_LABEL, CLAIM_TONE, label } from '@/components/projects/shared';
import type { EotClaim, EotPosition, EotAnalysis } from '@/components/projects/types';

/**
 * Claims for more time, built from the site diary.
 *
 * Whether lost time earns anything turns on whose risk the cause was, so the
 * diary is read back sorted into what earns time, what also earns money, and
 * what the contractor carries itself.
 */
interface Props extends TabProps {
  eot: { claims: EotClaim[]; position: EotPosition | null } | null;
}

export default function ClaimsTab({
  projectId, canManage, isOwner, money, reload, confirmAction, removeIt, eot
}: Props) {
  const [analysis, setAnalysis] = useState<EotAnalysis | null>(null);
  const [analysing, setAnalysing] = useState(false);
  const [eotForm, setEotForm] = useState({
    title: '', description: '', period_from: '', period_to: '', days_claimed: '', cost_claimed: '',
  });
  const [decideFor, setDecideFor] = useState<string | null>(null);
  const [decideForm, setDecideForm] = useState({ days_granted: '', cost_granted: '', decision_notes: '', rebaseline: true });
  const [planBusy, setPlanBusy] = useState(false);

  useEffect(() => {
    const { period_from, period_to } = eotForm;
    if (!period_from || !period_to || period_from > period_to) { setAnalysis(null); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      // Flagged here rather than in the effect body: the effect runs on every
      // keystroke, the fetch only after the pause.
      setAnalysing(true);
      try {
        const r = await api.get(`/projects/${projectId}/eot/analysis`, { params: { from: period_from, to: period_to } });
        if (!cancelled) setAnalysis(r.data.data);
      } catch {
        if (!cancelled) setAnalysis(null);
      } finally {
        if (!cancelled) setAnalysing(false);
      }
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [projectId, eotForm.period_from, eotForm.period_to]);

  const raiseClaim = async (submit: boolean) => {
    if (!eotForm.title.trim()) return toast.error('Give the claim a title');
    if (!eotForm.period_from || !eotForm.period_to) return toast.error('Set the period the claim covers');
    const days = parseFloat(eotForm.days_claimed);
    if (!Number.isFinite(days) || days <= 0) return toast.error('Enter the days being claimed');
    setPlanBusy(true);
    try {
      const r = await api.post(`/projects/${projectId}/eot`, {
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
      await reload();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not raise the claim');
    } finally { setPlanBusy(false); }
  };

  const claimAction = async (c: EotClaim, action: 'submit' | 'withdraw') => {
    try {
      await api.patch(`/projects/${projectId}/eot/${c.id}`, { action });
      toast.success(`${c.reference} ${action === 'submit' ? 'submitted' : 'withdrawn'}`);
      await reload();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Could not update'); }
  };

  const recordDecision = async (c: EotClaim) => {
    const granted = parseFloat(decideForm.days_granted);
    if (!Number.isFinite(granted) || granted < 0) return toast.error('Enter the days granted — zero if refused');
    setPlanBusy(true);
    try {
      const r = await api.patch(`/projects/${projectId}/eot/${c.id}/decision`, {
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
      await reload();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not record the decision');
    } finally { setPlanBusy(false); }
  };

  const reopenClaim = (c: EotClaim) => confirmAction({
    title: `Reopen ${c.reference}?`,
    message: c.days_granted > 0
      ? `The ${c.days_granted} days granted will be taken back off the completion date, returning it to ${c.previous_end_date ? new Date(c.previous_end_date).toLocaleDateString() : 'its previous value'}.`
      : 'The claim goes back to awaiting a decision.',
    run: async () => {
      try {
        await api.patch(`/projects/${projectId}/eot/${c.id}/decision`, { decision: 'reopen' });
        await reload();
      } catch (e: any) { toast.error(e.response?.data?.message || 'Could not reopen'); }
    },
  });

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
                      onClick={() => removeIt('claim', `/projects/${projectId}/eot/${c.id}`, c.reference)}>
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
}
