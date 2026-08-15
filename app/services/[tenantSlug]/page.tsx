'use client';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Upload, FileText, X, Plus, Minus, Building2, CheckCircle2,
  AlertTriangle, RefreshCw, Copy,
} from 'lucide-react';
import {
  UNIT_WORD, estimateFor, fetchServiceOffers, requestProblem, submitServiceRequest,
  type PickedLine, type RequestReceipt, type ServiceOffer, type ServiceShop,
} from '@/lib/serviceOffers';

/**
 * Asking a business to do something.
 *
 * Written for a phone held in a shop: one column, large targets, and no
 * account. A client scans a code on the counter, ticks what they want, sends
 * anything needed with it, and leaves with a reference — the shop prices it
 * afterwards.
 *
 * What is on offer is whatever the business has published as a service, so this
 * one form covers printing, repairs, design and site work without knowing
 * anything about any of them. Only some of that work needs a file, which is why
 * the choosing comes first and the attachment second: what to ask for depends
 * on what was picked.
 *
 * Prices shown here are the shop's list price and are labelled as an estimate,
 * because the quote is what binds and it comes after somebody has looked.
 */

// The shape of an offering, the running total, what makes a request invalid
// and how one is sent all live in lib/serviceOffers, because the shop front's
// request drawer does exactly the same things and two copies of "what is wrong
// with this request" is one copy too many.
type Service = ServiceOffer;
type Store = ServiceShop;

export default function ServiceRequestPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [store, setStore] = useState<Store | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [files, setFiles] = useState<File[]>([]);
  const [picked, setPicked] = useState<Record<string, PickedLine>>({});
  const [contact, setContact] = useState({ customer_name: '', customer_phone: '', customer_email: '' });
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<RequestReceipt | null>(null);

  const money = (n: number) => `GHS ${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetchServiceOffers(tenantSlug);
      setStore(r.shop);
      setServices(r.offers);
    } catch (e: any) {
      setError(e.response?.data?.message || 'We could not load this shop.');
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => { if (tenantSlug) load(); }, [load, tenantSlug]);

  const toggle = (s: Service) => setPicked(p => {
    const next = { ...p };
    if (next[s.id]) delete next[s.id];
    else next[s.id] = { quantity: 1, spec: '' };
    return next;
  });

  const setQty = (id: string, delta: number) => setPicked(p => ({
    ...p, [id]: { ...p[id], quantity: Math.max(1, (p[id]?.quantity || 1) + delta) },
  }));

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    setFiles(f => [...f, ...Array.from(list)].slice(0, 10));
  };

  const chosen = services.filter(s => picked[s.id]);
  const { total: estimate, anyToQuote } = estimateFor(chosen, picked);
  // Printing cannot start without artwork; a call-out has nothing to attach.
  // The services themselves say which, so the form asks only when it matters.
  const needFiles = chosen.filter(s => s.requires_file);

  const submit = async () => {
    const problem = requestProblem({
      chosen,
      name: contact.customer_name,
      phone: contact.customer_phone,
      fileCount: files.length,
    });
    if (problem) return setError(problem);

    setError('');
    setSubmitting(true);
    try {
      setDone(await submitServiceRequest({ tenantSlug, chosen, picked, files, contact, notes }));
    } catch (e: any) {
      setError(e.response?.data?.message || 'We could not send your request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <RefreshCw className="w-6 h-6 text-slate-300 animate-spin" />
      </div>
    );
  }

  /* ── Sent ── */
  if (done) {
    const link = `${typeof window !== 'undefined' ? window.location.origin : ''}/track/${done.track_token}`;
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-5">
        <div className="bg-white rounded-3xl shadow-sm ring-1 ring-slate-200/70 p-8 max-w-md w-full text-center">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-900">Request sent</h1>
          <p className="text-sm text-slate-500 mt-1">
            {store?.name} has your request{files.length ? ` and your file${files.length > 1 ? 's' : ''}` : ''}.
            {done.needs_quote
              ? ' Some of what you asked for is priced by hand, so they will send a quote shortly.'
              : ' They will confirm the price shortly.'}
          </p>

          <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mt-6">Your reference</p>
          <p className="text-2xl font-extrabold text-slate-900 font-mono">{done.reference}</p>

          <a href={`/track/${done.track_token}`}
            className="block w-full rounded-xl bg-[#0D3B6E] text-white px-5 py-3 text-sm font-semibold mt-5">
            Track this job
          </a>
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(link)}
            className="w-full rounded-xl ring-1 ring-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 mt-2 inline-flex items-center justify-center gap-2"
          >
            <Copy className="w-4 h-4" /> Copy the tracking link
          </button>
          <p className="text-xs text-slate-400 mt-4">
            Save that link — it&apos;s how you check on the job and approve the price.
          </p>
        </div>
      </div>
    );
  }

  /* ── The form ── */
  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      <header className="bg-gradient-to-br from-[#0D3B6E] to-[#09294c] pt-8 pb-24">
        <div className="max-w-2xl mx-auto px-5">
          <div className="flex items-center gap-3.5">
            {store?.logo
              ? <img src={store.logo} alt="" className="w-12 h-12 rounded-2xl object-cover bg-white/10 ring-1 ring-white/20" />
              : <div className="w-12 h-12 rounded-2xl bg-white/10 ring-1 ring-white/20 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-white/90" />
                </div>}
            <div className="min-w-0">
              <p className="font-bold text-white text-lg truncate leading-tight">{store?.name}</p>
              <p className="text-xs text-white/60 mt-0.5">Tell us what you need</p>
            </div>
          </div>
          <h1 className="text-white text-2xl font-extrabold mt-6 leading-tight tracking-tight">
            Three steps and we&apos;ll price it
          </h1>
          <p className="text-sm text-white/70 mt-1.5 leading-relaxed max-w-md">
            Tell us what you need, send anything we&apos;ll want to see, and we&apos;ll come
            back with a price before any work starts.
          </p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 -mt-16 space-y-4">

        {/* 1. What you need done */}
        <section className="bg-white rounded-3xl shadow-sm ring-1 ring-slate-200/70 p-6">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-[#0D3B6E] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
            <h2 className="font-bold text-slate-900 text-base">What you need</h2>
          </div>
          <p className="text-sm text-slate-500 mt-0.5 mb-4">Tap to choose. Say how many, and anything specific.</p>

          {services.length === 0 ? (
            <p className="text-sm text-slate-400">This shop hasn&apos;t published its price list yet. Give them a call.</p>
          ) : (
            <div className="space-y-2">
              {services.map(s => {
                const on = !!picked[s.id];
                return (
                  <div key={s.id} className={`rounded-xl ring-1 transition-colors ${on ? 'ring-[#0D3B6E] bg-blue-50/40' : 'ring-slate-200'}`}>
                    <button type="button" onClick={() => toggle(s)} className="w-full text-left px-4 py-3 flex items-start gap-3">
                      <span className={`mt-0.5 w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center ring-1 ${
                        on ? 'bg-[#0D3B6E] ring-[#0D3B6E] text-white' : 'ring-slate-300'
                      }`}>{on && <CheckCircle2 className="w-3.5 h-3.5" />}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-slate-900">
                          {s.name}
                          {s.is_solution && (
                            <span className="ml-2 align-middle text-[10px] font-bold uppercase tracking-wide text-[#0D3B6E] bg-[#0D3B6E]/8 rounded-full px-2 py-0.5">
                              Package
                            </span>
                          )}
                        </span>
                        {s.description && <span className="block text-xs text-slate-500">{s.description}</span>}
                      </span>
                      <span className="text-sm font-semibold text-slate-900 flex-shrink-0 text-right">
                        {s.priced ? (
                          <>
                            {money(s.price || 0)}
                            <span className="block text-xs font-normal text-slate-400">{UNIT_WORD[s.unit_type] || 'each'}</span>
                          </>
                        ) : (
                          <span className="text-xs font-medium text-amber-700">We&apos;ll quote</span>
                        )}
                      </span>
                    </button>

                    {on && (
                      <div className="px-4 pb-3 flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => setQty(s.id, -1)}
                            className="w-9 h-9 rounded-lg ring-1 ring-slate-200 flex items-center justify-center text-slate-600">
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-10 text-center font-semibold tabular-nums">{picked[s.id].quantity}</span>
                          <button type="button" onClick={() => setQty(s.id, 1)}
                            className="w-9 h-9 rounded-lg ring-1 ring-slate-200 flex items-center justify-center text-slate-600">
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <input
                          className="flex-1 min-w-[160px] rounded-lg ring-1 ring-slate-200 px-3 py-2 text-sm"
                          placeholder="e.g. A4, double sided, gloss"
                          value={picked[s.id].spec}
                          onChange={e => setPicked(p => ({ ...p, [s.id]: { ...p[s.id], spec: e.target.value } }))}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 2. Anything to send in */}
        <section className="bg-white rounded-3xl shadow-sm ring-1 ring-slate-200/70 p-6">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-[#0D3B6E] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
            <h2 className="font-bold text-slate-900 text-base">
              {needFiles.length ? 'Your file' : 'Anything to send?'}
            </h2>
          </div>
          <p className="text-sm text-slate-500 mt-0.5 mb-4">
            {needFiles.length
              ? `We need this to start ${needFiles.map(s => s.name).join(', ')}.`
              : 'Optional — a photo or document helps us price it accurately.'}
            {' '}PDF, Word, PowerPoint, Excel or an image. Up to 10 files, 25MB each.
          </p>

          <label className="block border-2 border-dashed border-slate-200 rounded-xl px-4 py-7 text-center cursor-pointer hover:border-[#0D3B6E]/40 transition-colors">
            <Upload className="w-7 h-7 text-slate-300 mx-auto mb-2" />
            <span className="text-sm font-semibold text-[#0D3B6E]">Choose files</span>
            <span className="block text-xs text-slate-400 mt-1">or take a photo with your camera</span>
            <input type="file" multiple className="hidden"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,image/*"
              onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
          </label>

          {files.length > 0 && (
            <ul className="space-y-1.5 mt-3">
              {files.map((f, i) => (
                <li key={i} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-2.5">
                  <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="text-sm text-slate-800 truncate flex-1">{f.name}</span>
                  <span className="text-xs text-slate-400 flex-shrink-0">{(f.size / 1024 / 1024).toFixed(1)}MB</span>
                  <button type="button" onClick={() => setFiles(x => x.filter((_, n) => n !== i))}
                    className="text-slate-400 hover:text-red-500 flex-shrink-0"><X className="w-4 h-4" /></button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 3. Who you are */}
        <section className="bg-white rounded-3xl shadow-sm ring-1 ring-slate-200/70 p-6">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-[#0D3B6E] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">3</span>
            <h2 className="font-bold text-slate-900 text-base">How we reach you</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Your name *</label>
              <input className="w-full rounded-lg ring-1 ring-slate-200 px-3 py-2.5 text-sm"
                value={contact.customer_name} onChange={e => setContact(c => ({ ...c, customer_name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Phone *</label>
              <input type="tel" className="w-full rounded-lg ring-1 ring-slate-200 px-3 py-2.5 text-sm"
                placeholder="024 000 0000"
                value={contact.customer_phone} onChange={e => setContact(c => ({ ...c, customer_phone: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Email</label>
              <input type="email" className="w-full rounded-lg ring-1 ring-slate-200 px-3 py-2.5 text-sm"
                value={contact.customer_email} onChange={e => setContact(c => ({ ...c, customer_email: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Anything else we should know?</label>
              <textarea rows={2} className="w-full rounded-lg ring-1 ring-slate-200 px-3 py-2.5 text-sm resize-none"
                placeholder="When you need it, how it should be finished…"
                value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          </div>
        </section>

        {error && (
          <div className="flex items-start gap-2.5 bg-red-50 text-red-800 rounded-xl px-4 py-3 text-sm">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </main>

      {/* Estimate and send, always reachable */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 px-5 py-3 shadow-lg">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <div className="min-w-0">
            <p className="text-xs text-slate-400">
              {anyToQuote ? 'Estimate so far' : 'Estimated total'}
            </p>
            <p className="font-bold text-slate-900 text-lg">{money(estimate)}</p>
            <p className="text-[11px] text-slate-400 leading-tight">
              {anyToQuote ? 'Some items priced after we see the file' : 'Confirmed when we quote'}
            </p>
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="ml-auto rounded-2xl bg-[#0D3B6E] text-white px-6 py-3.5 text-sm font-bold disabled:opacity-60 flex-shrink-0 active:scale-[0.99] transition-transform"
          >
            {submitting ? 'Sending…' : 'Send request'}
          </button>
        </div>
      </div>
    </div>
  );
}
