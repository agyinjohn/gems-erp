'use client';
import { useState } from 'react';
import api from '@/lib/api';
import { toast } from '@/components/ui';
import Link from 'next/link';
import { Plus, AlertTriangle, FileText, Info } from 'lucide-react';
import PaymentCertificate, { type Certificate } from '@/components/projects/PaymentCertificate';
import type { TabProps } from '@/components/projects/shared';
import { label, article } from '@/components/projects/shared';
import type { BillingPosition, ProjectInvoice, BillableMilestone } from '@/components/projects/types';

/**
 * Raising applications and getting paid.
 *
 * Valuations are cumulative: each one states the value of work to date, and
 * what falls due is that less what has already been certified. Working that way
 * means a later revaluation corrects itself instead of compounding.
 */
interface Props extends TabProps {
  billing: { position: BillingPosition | null; invoices: ProjectInvoice[]; billable_milestones: BillableMilestone[] } | null;
}

export default function BillingTab({
  projectId, project, profile, canManage, money, reload, billing
}: Props) {
  const cap = profile.capabilities;
  const term = profile.terms;
  const [picked, setPicked] = useState<string[]>([]);
  const [billForm, setBillForm] = useState({ amount: '', due_date: '', notes: '' });
  const [releaseForm, setReleaseForm] = useState({ amount: '', due_date: '' });
  const [billing_busy, setBillingBusy] = useState(false);
  const [cert, setCert] = useState<Certificate | null>(null);
  const [certBusy, setCertBusy] = useState<string | null>(null);
  const [planBusy, setPlanBusy] = useState(false);
  const [clientSms, setClientSms] = useState({
    enabled: !!project.client_sms_enabled,
    phone: project.client_phone || '',
  });

  const raiseApplication = async () => {
    if (!billForm.due_date) return toast.error('Set a due date');
    const usingMilestones = picked.length > 0;
    const amt = parseFloat(billForm.amount);
    if (!usingMilestones && (!Number.isFinite(amt) || amt <= 0)) {
      return toast.error('Pick milestones to certify, or enter an amount');
    }
    setBillingBusy(true);
    try {
      const r = await api.post(`/projects/${projectId}/invoices`, {
        ...(usingMilestones ? { milestone_ids: picked } : { amount: amt }),
        due_date: billForm.due_date,
        notes: billForm.notes || undefined,
      });
      toast.success(`${r.data.data.invoice_number} raised as a draft invoice`);
      setBillForm({ amount: '', due_date: '', notes: '' });
      await reload();
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
      const r = await api.post(`/projects/${projectId}/retention-release`, { amount: amt, due_date: releaseForm.due_date });
      toast.success(`${r.data.data.invoice_number} raised for retention`);
      setReleaseForm({ amount: '', due_date: '' });
      await reload();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not release retention');
    } finally { setBillingBusy(false); }
  };

  // Reading the diary back for the chosen window. Debounced, since the dates
  // are typed and every keystroke would otherwise be a round trip.

  const openCertificate = async (invoiceId: string) => {
    setCertBusy(invoiceId);
    try {
      const r = await api.get(`/projects/${projectId}/invoices/${invoiceId}/certificate`);
      setCert(r.data.data);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not build the certificate');
    } finally { setCertBusy(null); }
  };

  const saveClientSms = async (next: { enabled: boolean; phone: string }) => {
    setPlanBusy(true);
    try {
      await api.put(`/projects/${projectId}`, {
        client_sms_enabled: next.enabled,
        client_phone: next.phone.trim(),
      });
      setClientSms(next);
      toast.success(next.enabled ? 'Client updates are on' : 'Client updates are off');
      await reload();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not save');
    } finally { setPlanBusy(false); }
  };

  const pos = billing?.position;
  const pickedTotal = (billing?.billable_milestones || [])
    .filter(m => picked.includes(m.id))
    .reduce((s, m) => s + m.billable_amount, 0);
  const gross = picked.length ? pickedTotal : (parseFloat(billForm.amount) || 0);
  // A type without retention withholds nothing, whatever percentage is
  // still sitting on the project — the server guards this too, and the
  // preview has to agree with it or the figure on screen is a lie.
  const retention = cap.retention ? gross * ((pos?.retention_pct || 0) / 100) : 0;

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
            <h2 className="font-bold text-gray-900">Raise {article(term.application)} {term.application.toLowerCase()}</h2>
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
            <Link href="/messaging" className="underline">Messaging page</Link>, where any of the four can also
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

      {/* The certificate lives with the button that opens it. It used to be
          rendered by the page, which is how it survived the split unmounted. */}
      {cert && <PaymentCertificate cert={cert} onClose={() => setCert(null)} />}
    </>
  );
}
