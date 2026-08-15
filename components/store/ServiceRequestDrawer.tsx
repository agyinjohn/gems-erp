'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, ClipboardList, Copy, FileText,
  Minus, Paperclip, Plus, Upload, X,
} from 'lucide-react';
import { formatGhs } from './theme';
import {
  UNIT_WORD, estimateFor, requestProblem, submitServiceRequest,
  type PickedLine, type RequestReceipt, type ServiceOffer,
} from '@/lib/serviceOffers';

/**
 * Asking the shop to do something, without leaving the shop.
 *
 * The same three steps the standalone request page has walked people through
 * since it was built — what you need, anything to send with it, how we reach
 * you — but as a drawer beside the catalogue rather than a page the customer is
 * thrown to. Somebody who came to browse and noticed the shop also does
 * printing should not lose their cart to ask about it.
 *
 * Quote-first is the whole point and it is said plainly throughout: the shop
 * sees the job, prices it, and the customer agrees before anything is charged.
 * The standalone page remains, because a shop with a QR code on the counter
 * wants an address that is only the form.
 */

interface Props {
  tenantSlug: string;
  offers: ServiceOffer[];
  /** Picked when the drawer opened, from whichever card was tapped. */
  initialId?: string;
  onClose: () => void;
}

export default function ServiceRequestDrawer({ tenantSlug, offers, initialId, onClose }: Props) {
  const [picked, setPicked] = useState<Record<string, PickedLine>>(
    initialId ? { [initialId]: { quantity: 1, spec: '' } } : {},
  );
  const [files, setFiles] = useState<File[]>([]);
  const [contact, setContact] = useState({ customer_name: '', customer_phone: '', customer_email: '' });
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [receipt, setReceipt] = useState<RequestReceipt | null>(null);
  const [copied, setCopied] = useState(false);

  // Opening the drawer on a second service should add it to what is already
  // chosen, not start again — a customer who wants printing *and* binding taps
  // both cards.
  useEffect(() => {
    if (!initialId) return;
    setPicked(p => (p[initialId] ? p : { ...p, [initialId]: { quantity: 1, spec: '' } }));
  }, [initialId]);

  const chosen = useMemo(() => offers.filter(s => picked[s.id]), [offers, picked]);
  const { total, anyToQuote } = estimateFor(chosen, picked);
  const needFiles = chosen.filter(s => s.requires_file);

  const toggle = (s: ServiceOffer) => setPicked(p => {
    const next = { ...p };
    if (next[s.id]) delete next[s.id];
    else next[s.id] = { quantity: 1, spec: '' };
    return next;
  });

  const setQty = (id: string, delta: number) => setPicked(p => ({
    ...p, [id]: { ...p[id], quantity: Math.max(1, (p[id]?.quantity || 1) + delta) },
  }));

  const submit = async () => {
    const problem = requestProblem({
      chosen,
      name: contact.customer_name,
      phone: contact.customer_phone,
      fileCount: files.length,
    });
    if (problem) return setError(problem);

    setError('');
    setSending(true);
    try {
      setReceipt(await submitServiceRequest({ tenantSlug, chosen, picked, files, contact, notes }));
    } catch (e: unknown) {
      const res = (e as { response?: { data?: { message?: string } } }).response;
      setError(res?.data?.message || 'We could not send your request. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const trackLink = receipt && typeof window !== 'undefined'
    ? `${window.location.origin}/track/${receipt.track_token}`
    : '';

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md h-full flex flex-col shadow-2xl">

        <div className="store-panel-head flex items-center justify-between px-5 py-4 flex-shrink-0">
          <div className="flex items-center gap-2 text-white">
            <ClipboardList className="w-5 h-5" />
            <h2 className="font-bold text-base">
              {receipt ? 'Request sent' : <>Request work {chosen.length > 0 && <span className="text-amber-300">({chosen.length})</span>}</>}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="text-white/70 hover:text-white transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {receipt ? (
          /* ── Sent ── */
          <div className="flex-1 overflow-y-auto px-5 py-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900">We have your request</h3>
            <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">
              {receipt.needs_quote
                ? 'Some of what you asked for is priced by hand, so we’ll send a quote shortly.'
                : 'We’ll confirm the price shortly.'}
              {' '}Nothing is charged until you&apos;ve agreed it.
            </p>

            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mt-7">Your reference</p>
            <p className="text-2xl font-extrabold text-gray-900 font-mono">{receipt.reference}</p>

            <a href={`/track/${receipt.track_token}`} className="store-btn store-btn-primary w-full mt-5">
              Track this job
            </a>
            <button
              type="button"
              onClick={() => { navigator.clipboard?.writeText(trackLink); setCopied(true); }}
              className="store-btn-quiet w-full mt-2 inline-flex items-center justify-center gap-2"
            >
              <Copy className="w-4 h-4" /> {copied ? 'Link copied' : 'Copy the tracking link'}
            </button>
            <p className="text-xs text-gray-400 mt-4 leading-relaxed">
              Save that link — it&apos;s how you check on the job and approve the price.
            </p>

            <button type="button" onClick={onClose} className="text-sm font-semibold mt-6 [color:var(--store-brand-on-paper)]">
              Back to the shop
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

              {/* 1. What you need */}
              <section>
                <h3 className="text-sm font-bold text-gray-900">What do you need?</h3>
                <p className="text-xs text-gray-500 mt-0.5 mb-3">
                  Tap to choose. Say how many, and anything specific.
                </p>
                <div className="space-y-2">
                  {offers.map(s => {
                    const on = !!picked[s.id];
                    return (
                      <div key={s.id} className={`rounded-xl ring-1 transition-colors ${on ? 'bg-gray-50' : 'ring-gray-200'}`}
                        style={on ? { boxShadow: 'inset 0 0 0 1px var(--store-brand-on-paper)' } : undefined}>
                        <button type="button" onClick={() => toggle(s)} className="w-full text-left px-3.5 py-3 flex items-start gap-3">
                          <span
                            className="mt-0.5 w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center ring-1 ring-gray-300"
                            style={on ? { background: 'var(--store-brand-on-paper)', borderColor: 'transparent', color: '#fff' } : undefined}
                          >
                            {on && <CheckCircle2 className="w-3.5 h-3.5" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-gray-900">{s.name}</span>
                            {(s.short_description || s.description) && (
                              <span className="block text-xs text-gray-500 line-clamp-2">
                                {s.short_description || s.description}
                              </span>
                            )}
                            {s.requires_file && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-amber-800 mt-1">
                                <Paperclip className="w-3 h-3" /> Needs a file
                              </span>
                            )}
                          </span>
                          <span className="text-sm font-semibold text-gray-900 flex-shrink-0 text-right">
                            {s.priced ? (
                              <>
                                {formatGhs(s.price || 0)}
                                <span className="block text-[11px] font-normal text-gray-400">{UNIT_WORD[s.unit_type] || 'each'}</span>
                              </>
                            ) : (
                              <span className="text-[11px] font-medium text-amber-700">We&apos;ll quote</span>
                            )}
                          </span>
                        </button>

                        {on && (
                          <div className="px-3.5 pb-3 flex flex-wrap items-center gap-2.5">
                            <div className="flex items-center gap-2">
                              <button type="button" onClick={() => setQty(s.id, -1)} className="store-qty-btn">
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-8 text-center font-bold text-sm tabular-nums">{picked[s.id].quantity}</span>
                              <button type="button" onClick={() => setQty(s.id, 1)} className="store-qty-btn store-qty-btn-primary">
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            <input
                              className="flex-1 min-w-[150px] rounded-lg ring-1 ring-gray-200 px-3 py-2 text-sm"
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
              </section>

              {/* 2. Anything to send */}
              <section>
                <h3 className="text-sm font-bold text-gray-900">
                  {needFiles.length ? 'Your file' : 'Anything to send us?'}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5 mb-3 leading-relaxed">
                  {needFiles.length
                    ? `We need this to start ${needFiles.map(s => s.name).join(', ')}.`
                    : 'Optional — a photo or document helps us price it accurately.'}
                  {' '}PDF, Word, PowerPoint, Excel or an image. Up to 10 files, 25MB each.
                </p>

                <label className="block border-2 border-dashed border-gray-200 rounded-xl px-4 py-6 text-center cursor-pointer hover:border-gray-300 transition-colors">
                  <Upload className="w-6 h-6 text-gray-300 mx-auto mb-1.5" />
                  <span className="text-sm font-semibold" style={{ color: 'var(--store-brand-on-paper)' }}>Choose files</span>
                  <span className="block text-xs text-gray-400 mt-0.5">or take a photo with your camera</span>
                  <input
                    type="file" multiple className="hidden"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,image/*"
                    onChange={e => {
                      const list = e.target.files;
                      if (list) setFiles(f => [...f, ...Array.from(list)].slice(0, 10));
                      e.target.value = '';
                    }}
                  />
                </label>

                {files.length > 0 && (
                  <ul className="space-y-1.5 mt-2.5">
                    {files.map((f, i) => (
                      <li key={`${f.name}-${i}`} className="flex items-center gap-2.5 bg-gray-50 rounded-xl px-3.5 py-2.5">
                        <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="text-sm text-gray-800 truncate flex-1">{f.name}</span>
                        <span className="text-xs text-gray-400 flex-shrink-0 tabular-nums">{(f.size / 1024 / 1024).toFixed(1)}MB</span>
                        <button type="button" onClick={() => setFiles(x => x.filter((_, n) => n !== i))}
                          className="text-gray-400 hover:text-red-500 flex-shrink-0">
                          <X className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* 3. How we reach you */}
              <section>
                <h3 className="text-sm font-bold text-gray-900 mb-3">How do we reach you?</h3>
                <div className="space-y-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Your name *</label>
                    <input className="form-input w-full" value={contact.customer_name}
                      onChange={e => setContact(c => ({ ...c, customer_name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Phone *</label>
                    <input type="tel" className="form-input w-full" placeholder="024 000 0000"
                      value={contact.customer_phone}
                      onChange={e => setContact(c => ({ ...c, customer_phone: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
                    <input type="email" className="form-input w-full" value={contact.customer_email}
                      onChange={e => setContact(c => ({ ...c, customer_email: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Anything else we should know?</label>
                    <textarea rows={2} className="form-input w-full resize-none"
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
            </div>

            {/* The estimate, always in view, always labelled as an estimate. */}
            <div className="border-t border-gray-100 px-5 py-4 flex-shrink-0 space-y-3">
              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">{anyToQuote ? 'Estimate so far' : 'Estimated total'}</p>
                  <p className="text-xl font-extrabold text-gray-900 tabular-nums">{formatGhs(total)}</p>
                </div>
                <p className="text-[11px] text-gray-400 text-right leading-tight max-w-[55%]">
                  {anyToQuote
                    ? 'Some of this is priced after we’ve seen it'
                    : 'Confirmed when we quote — nothing is charged yet'}
                </p>
              </div>
              <button type="button" onClick={submit} disabled={sending} className="store-btn store-btn-primary w-full">
                {sending ? 'Sending…' : 'Send request'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
