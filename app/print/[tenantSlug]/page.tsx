'use client';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { publicApi } from '@/lib/api';
import {
  Upload, FileText, X, Plus, Minus, Building2, CheckCircle2,
  AlertTriangle, RefreshCw, Copy,
} from 'lucide-react';

/**
 * Sending a job in to be printed.
 *
 * Written for a phone held in a shop: one column, large targets, and no
 * account. A client scans a code on the counter, attaches the file, ticks what
 * they want, and leaves with a reference — the shop prices it afterwards.
 *
 * Prices shown here are the shop's list price and are labelled as an estimate,
 * because the quote is what binds and it comes after somebody has opened the
 * file.
 */

interface Service {
  id: string; name: string; description: string;
  unit_type: string; priced: boolean; price: number | null;
}
interface Store { name: string; slug: string; phone?: string; email?: string; logo?: string }

const UNIT_WORD: Record<string, string> = {
  unit: 'each', hour: 'per hour', day: 'per day', fixed: 'fixed price',
};

export default function PrintRequestPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [store, setStore] = useState<Store | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [files, setFiles] = useState<File[]>([]);
  const [picked, setPicked] = useState<Record<string, { quantity: number; spec: string }>>({});
  const [contact, setContact] = useState({ customer_name: '', customer_phone: '', customer_email: '' });
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ reference: string; track_token: string; estimated_total: number; needs_quote: boolean } | null>(null);

  const money = (n: number) => `GHS ${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await publicApi.get(`/print-requests/${tenantSlug}/services`);
      setStore(r.data.data.store);
      setServices(r.data.data.services || []);
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
  const estimate = chosen.reduce((sum, s) => sum + (s.priced ? (s.price || 0) * picked[s.id].quantity : 0), 0);
  const anyToQuote = chosen.some(s => !s.priced);

  const submit = async () => {
    if (!contact.customer_name.trim()) return setError('Please give your name.');
    if (!contact.customer_phone.trim()) return setError('Please give a phone number so we can reach you.');
    if (!files.length) return setError('Attach the file you want printed.');
    if (!chosen.length) return setError('Choose at least one service.');

    setError('');
    setSubmitting(true);
    try {
      const fd = new FormData();
      files.forEach(f => fd.append('files', f));
      fd.append('lines', JSON.stringify(chosen.map(s => ({
        service_id: s.id, quantity: picked[s.id].quantity, spec: picked[s.id].spec,
      }))));
      Object.entries(contact).forEach(([k, v]) => fd.append(k, v));
      if (notes.trim()) fd.append('notes', notes.trim());

      const r = await publicApi.post(`/print-requests/${tenantSlug}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setDone(r.data.data);
    } catch (e: any) {
      setError(e.response?.data?.message || 'We could not send your request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="w-6 h-6 text-gray-300 animate-spin" />
      </div>
    );
  }

  /* ── Sent ── */
  if (done) {
    const link = `${typeof window !== 'undefined' ? window.location.origin : ''}/track/${done.track_token}`;
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-5">
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-7 max-w-md w-full text-center">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900">Request sent</h1>
          <p className="text-sm text-gray-500 mt-1">
            {store?.name} has your file{files.length > 1 ? 's' : ''}.
            {done.needs_quote
              ? ' Some of what you asked for is priced by hand, so they will send a quote shortly.'
              : ' They will confirm the price shortly.'}
          </p>

          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mt-6">Your reference</p>
          <p className="text-2xl font-extrabold text-gray-900 font-mono">{done.reference}</p>

          <a href={`/track/${done.track_token}`}
            className="block w-full rounded-xl bg-[#0D3B6E] text-white px-5 py-3 text-sm font-semibold mt-5">
            Track this job
          </a>
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(link)}
            className="w-full rounded-xl ring-1 ring-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 mt-2 inline-flex items-center justify-center gap-2"
          >
            <Copy className="w-4 h-4" /> Copy the tracking link
          </button>
          <p className="text-xs text-gray-400 mt-4">
            Save that link — it&apos;s how you check on the job and approve the price.
          </p>
        </div>
      </div>
    );
  }

  /* ── The form ── */
  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <header className="bg-[#0D3B6E] text-white">
        <div className="max-w-2xl mx-auto px-5 py-6">
          <div className="flex items-center gap-3">
            {store?.logo
              ? <img src={store.logo} alt="" className="w-10 h-10 rounded-lg object-cover bg-white/10" />
              : <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center"><Building2 className="w-5 h-5" /></div>}
            <div>
              <p className="font-bold">{store?.name}</p>
              <p className="text-xs text-white/70">Send us something to print</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 -mt-4 space-y-4">

        {/* 1. The file */}
        <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-5">
          <h2 className="font-bold text-gray-900">1. Your file</h2>
          <p className="text-sm text-gray-500 mt-0.5 mb-4">
            PDF, Word, PowerPoint, Excel or an image. Up to 10 files, 25MB each.
          </p>

          <label className="block border-2 border-dashed border-gray-200 rounded-xl px-4 py-7 text-center cursor-pointer hover:border-[#0D3B6E]/40 transition-colors">
            <Upload className="w-7 h-7 text-gray-300 mx-auto mb-2" />
            <span className="text-sm font-semibold text-[#0D3B6E]">Choose files</span>
            <span className="block text-xs text-gray-400 mt-1">or take a photo of the document</span>
            <input type="file" multiple className="hidden"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,image/*"
              onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
          </label>

          {files.length > 0 && (
            <ul className="space-y-1.5 mt-3">
              {files.map((f, i) => (
                <li key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-2.5">
                  <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-800 truncate flex-1">{f.name}</span>
                  <span className="text-xs text-gray-400 flex-shrink-0">{(f.size / 1024 / 1024).toFixed(1)}MB</span>
                  <button type="button" onClick={() => setFiles(x => x.filter((_, n) => n !== i))}
                    className="text-gray-400 hover:text-red-500 flex-shrink-0"><X className="w-4 h-4" /></button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 2. What you want done */}
        <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-5">
          <h2 className="font-bold text-gray-900">2. What you need</h2>
          <p className="text-sm text-gray-500 mt-0.5 mb-4">Tap to choose. Say how many, and anything specific.</p>

          {services.length === 0 ? (
            <p className="text-sm text-gray-400">This shop hasn&apos;t published its price list yet. Give them a call.</p>
          ) : (
            <div className="space-y-2">
              {services.map(s => {
                const on = !!picked[s.id];
                return (
                  <div key={s.id} className={`rounded-xl ring-1 transition-colors ${on ? 'ring-[#0D3B6E] bg-blue-50/40' : 'ring-gray-200'}`}>
                    <button type="button" onClick={() => toggle(s)} className="w-full text-left px-4 py-3 flex items-start gap-3">
                      <span className={`mt-0.5 w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center ring-1 ${
                        on ? 'bg-[#0D3B6E] ring-[#0D3B6E] text-white' : 'ring-gray-300'
                      }`}>{on && <CheckCircle2 className="w-3.5 h-3.5" />}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-gray-900">{s.name}</span>
                        {s.description && <span className="block text-xs text-gray-500">{s.description}</span>}
                      </span>
                      <span className="text-sm font-semibold text-gray-900 flex-shrink-0 text-right">
                        {s.priced ? (
                          <>
                            {money(s.price || 0)}
                            <span className="block text-xs font-normal text-gray-400">{UNIT_WORD[s.unit_type] || 'each'}</span>
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
                            className="w-9 h-9 rounded-lg ring-1 ring-gray-200 flex items-center justify-center text-gray-600">
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-10 text-center font-semibold tabular-nums">{picked[s.id].quantity}</span>
                          <button type="button" onClick={() => setQty(s.id, 1)}
                            className="w-9 h-9 rounded-lg ring-1 ring-gray-200 flex items-center justify-center text-gray-600">
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <input
                          className="flex-1 min-w-[160px] rounded-lg ring-1 ring-gray-200 px-3 py-2 text-sm"
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

        {/* 3. Who you are */}
        <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-5">
          <h2 className="font-bold text-gray-900">3. How we reach you</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Your name *</label>
              <input className="w-full rounded-lg ring-1 ring-gray-200 px-3 py-2.5 text-sm"
                value={contact.customer_name} onChange={e => setContact(c => ({ ...c, customer_name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Phone *</label>
              <input type="tel" className="w-full rounded-lg ring-1 ring-gray-200 px-3 py-2.5 text-sm"
                placeholder="024 000 0000"
                value={contact.customer_phone} onChange={e => setContact(c => ({ ...c, customer_phone: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Email</label>
              <input type="email" className="w-full rounded-lg ring-1 ring-gray-200 px-3 py-2.5 text-sm"
                value={contact.customer_email} onChange={e => setContact(c => ({ ...c, customer_email: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Anything else we should know?</label>
              <textarea rows={2} className="w-full rounded-lg ring-1 ring-gray-200 px-3 py-2.5 text-sm resize-none"
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
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 px-5 py-3 shadow-lg">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <div className="min-w-0">
            <p className="text-xs text-gray-400">
              {anyToQuote ? 'Estimate so far' : 'Estimated total'}
            </p>
            <p className="font-bold text-gray-900 text-lg">{money(estimate)}</p>
            <p className="text-[11px] text-gray-400 leading-tight">
              {anyToQuote ? 'Some items priced after we see the file' : 'Confirmed when we quote'}
            </p>
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="ml-auto rounded-xl bg-[#0D3B6E] text-white px-6 py-3 text-sm font-semibold disabled:opacity-60 flex-shrink-0"
          >
            {submitting ? 'Sending…' : 'Send request'}
          </button>
        </div>
      </div>
    </div>
  );
}
