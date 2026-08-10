'use client';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { publicApi } from '@/lib/api';
import {
  Check, Circle, Clock, AlertTriangle, FileText, Download,
  Building2, Phone, Mail, RefreshCw, CreditCard, Upload, Send,
  MessageSquare, ChevronRight, ShieldCheck,
} from 'lucide-react';

/**
 * What a client sees of their own job.
 *
 * Reached by a link rather than a login, so it has to stand on its own — no
 * navigation, no assumed context, and readable on a phone held in a shop.
 * Everything shown comes from the server's whitelist; there is no internal
 * figure here to hide.
 */

interface Tracked {
  kind: 'project' | 'order';
  business: { name: string; phone?: string; email?: string; logo?: string };
  reference: string;
  title: string;
  description?: string;
  status: string;
  currency: string;
  updated_at?: string;

  // Project
  stage_word?: string;
  progress_pct?: number;
  site_address?: string;
  start_date?: string | null;
  planned_end_date?: string | null;
  stages?: { name: string; status: string; progress_pct: number; due?: string | null; done_on?: string | null }[];
  billing?: {
    invoiced: number; paid: number; outstanding: number;
    invoices: { number: string; issued: string; due: string; total: number; paid: number; status: string; is_retention_release: boolean }[];
  };

  // Order / service request
  production_stage?: string | null;
  production_label?: string | null;
  // The steps this particular job goes through, in the client's words. Sent by
  // the server rather than listed here, because a repair and a print run do not
  // share a journey and this page has no business knowing either. Not `stages`
  // — a tracked project already uses that for its milestones.
  journey?: { key: string; label: string }[];
  service_type?: string;
  quote_status?: string | null;
  payment_status?: string;
  items?: { name: string; quantity: number; unit_price: number; total: number; spec?: string | null }[];
  files?: { name: string; url: string; size?: number; uploaded_at?: string }[];
  subtotal?: number;
  total?: number;
  paid?: number;
  outstanding?: number;
  notes_for_client?: string;
  placed_at?: string;

  // Project: shared both ways
  documents?: { id: string; name: string; category: string; url: string; size?: number; from_client: boolean; uploaded_at: string }[];
  unread_messages?: number;
  can_message?: boolean;
  can_upload?: boolean;
}

interface Message {
  id: string; body: string; from: 'client' | 'staff';
  author: string; attachments: { name: string; url: string }[]; at: string;
}

const date = (d?: string | null) =>
  (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const label = (s: string) => (s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

/** Progress as a ring — reads as a state at a glance, where a bar reads as loading. */
function Ring({ pct }: { pct: number }) {
  const r = 46;
  const circumference = 2 * Math.PI * r;
  const filled = Math.min(100, Math.max(0, pct)) / 100;
  return (
    <div className="relative w-28 h-28 flex-shrink-0">
      <svg viewBox="0 0 110 110" className="w-full h-full -rotate-90">
        <circle cx="55" cy="55" r={r} fill="none" stroke="currentColor" strokeWidth="9" className="text-slate-100" />
        <circle
          cx="55" cy="55" r={r} fill="none" stroke="currentColor" strokeWidth="9" strokeLinecap="round"
          className="text-[#0D3B6E] transition-[stroke-dashoffset] duration-1000 ease-out"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - filled)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-extrabold text-slate-900 tabular-nums leading-none">{Math.round(pct)}</span>
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">percent</span>
      </div>
    </div>
  );
}

/**
 * A step in the life of a job.
 *
 * Vertical rather than a row of chips: on a phone a horizontal track either
 * scrolls out of sight or shrinks past reading, and "where am I" is the one
 * thing this page exists to answer.
 */
function Step({
  title, note, state, last,
}: { title: string; note?: string; state: 'done' | 'now' | 'todo'; last?: boolean }) {
  return (
    <li className="flex gap-4">
      <div className="flex flex-col items-center flex-shrink-0">
        <span className={`w-7 h-7 rounded-full flex items-center justify-center ring-4 ${
          state === 'done' ? 'bg-[#0D3B6E] text-white ring-blue-50'
          : state === 'now' ? 'bg-amber-400 text-white ring-amber-50'
          : 'bg-white text-slate-300 ring-slate-50 border border-slate-200'
        }`}>
          {state === 'done' ? <Check className="w-3.5 h-3.5" strokeWidth={3} />
            : state === 'now' ? <Clock className="w-3.5 h-3.5" />
            : <Circle className="w-2 h-2 fill-current" />}
        </span>
        {!last && <span className={`w-0.5 flex-1 min-h-[18px] ${state === 'done' ? 'bg-[#0D3B6E]/25' : 'bg-slate-100'}`} />}
      </div>
      <div className={last ? 'min-w-0' : 'pb-5 min-w-0'}>
        <p className={`text-sm leading-tight ${
          state === 'now' ? 'font-bold text-slate-900'
          : state === 'done' ? 'font-medium text-slate-600' : 'text-slate-400'
        }`}>{title}</p>
        {note && <p className="text-xs text-slate-400 mt-0.5">{note}</p>}
      </div>
    </li>
  );
}

export default function TrackPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<Tracked | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [responding, setResponding] = useState(false);
  const [paying, setPaying] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);

  const money = (n: number) =>
    `${data?.currency || 'GHS'} ${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await publicApi.get(`/track/${token}`);
      setData(r.data.data);
      setError('');
    } catch (e: any) {
      setError(e.response?.data?.message || 'We could not open that link.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadMessages = useCallback(async () => {
    try {
      const r = await publicApi.get(`/track/${token}/messages`);
      setMessages(r.data.data || []);
    } catch { /* the thread is not the point of the page — fail quietly */ }
  }, [token]);

  useEffect(() => { if (token) load(); }, [load, token]);
  useEffect(() => { if (token && data?.can_message) loadMessages(); }, [token, data?.can_message, loadMessages]);

  const send = async () => {
    if (!draft.trim()) return;
    setSending(true);
    try {
      await publicApi.post(`/track/${token}/messages`, { body: draft.trim() });
      setDraft('');
      await loadMessages();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Could not send your message.');
    } finally { setSending(false); }
  };

  const sendFile = async (file: File) => {
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      await publicApi.post(`/track/${token}/documents`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await load();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Could not send that file.');
    } finally { setUploading(false); }
  };

  const respond = async (decision: 'accepted' | 'declined') => {
    setResponding(true);
    try {
      await publicApi.post(`/track/${token}/quote-response`, { decision });
      await load();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Could not send your answer.');
    } finally {
      setResponding(false);
    }
  };

  /**
   * Pay for the job.
   *
   * The amount is fixed by the server before the popup opens — this page is
   * reachable by anyone holding the link, and an amount set here would be an
   * amount the payer chooses. Paystack is resumed from a code, not started
   * from a figure.
   */
  const pay = async () => {
    setPaying(true);
    setError('');
    try {
      const r = await publicApi.post(`/track/${token}/pay`);
      const { access_code } = r.data.data;

      const open = () => {
        const popup = (window as any).PaystackPop;
        if (!popup?.resumeTransaction) {
          setError('Could not open the payment window. Please try again.');
          setPaying(false);
          return;
        }
        popup.resumeTransaction(access_code, {
          onSuccess: async () => {
            try {
              await publicApi.post(`/track/${token}/confirm-payment`, { reference: r.data.data.reference });
              await load();
            } catch (e: any) {
              // The money may well have left — say so plainly rather than
              // implying it failed, and give them something to quote.
              setError(`We could not confirm the payment automatically. Quote reference ${r.data.data.reference} to ${data?.business.name}.`);
            } finally { setPaying(false); }
          },
          onCancel: () => setPaying(false),
        });
      };

      if ((window as any).PaystackPop) return open();
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v2/inline.js';
      script.onload = open;
      script.onerror = () => { setError('Could not load the payment window.'); setPaying(false); };
      document.body.appendChild(script);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Could not start the payment.');
      setPaying(false);
    }
  };

  /* ── Shells ── */

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="h-40 bg-gradient-to-br from-[#0D3B6E] to-[#09294c]" />
        <div className="max-w-2xl mx-auto px-5 -mt-16 space-y-4">
          <div className="bg-white rounded-3xl h-48 animate-pulse shadow-sm" />
          <div className="bg-white rounded-3xl h-32 animate-pulse shadow-sm" />
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-sm ring-1 ring-slate-200/70 p-9 max-w-sm text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-5">
            <AlertTriangle className="w-7 h-7 text-amber-500" />
          </div>
          <p className="font-bold text-slate-900 text-lg">{error}</p>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
            The link may have expired or been withdrawn. Ask whoever sent it for a new one.
          </p>
        </div>
      </div>
    );
  }
  if (!data) return null;

  const isProject = data.kind === 'project';
  const journey = data.journey || [];
  const stageIndex = journey.findIndex(s => s.key === data.production_stage);
  const awaitingQuote = !isProject && data.quote_status === 'quoted';
  const owing = !isProject && data.quote_status === 'accepted' && (data.outstanding || 0) > 0;
  const needsAction = awaitingQuote || owing;

  const card = 'bg-white rounded-3xl shadow-sm ring-1 ring-slate-200/70';
  const heading = 'font-bold text-slate-900';

  return (
    <div className={`min-h-screen bg-slate-50 ${needsAction ? 'pb-28' : 'pb-14'}`}>

      {/* Whose business this is. Given real presence — for many clients this
          page is the only part of it they ever see working. */}
      <header className="bg-gradient-to-br from-[#0D3B6E] to-[#09294c] pt-8 pb-24">
        <div className="max-w-2xl mx-auto px-5">
          <div className="flex items-center gap-3.5">
            {data.business.logo
              ? <img src={data.business.logo} alt="" className="w-12 h-12 rounded-2xl object-cover bg-white/10 ring-1 ring-white/20" />
              : <div className="w-12 h-12 rounded-2xl bg-white/10 ring-1 ring-white/20 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-white/90" />
                </div>}
            <div className="min-w-0">
              <p className="font-bold text-white text-lg truncate leading-tight">{data.business.name}</p>
              <p className="text-xs text-white/60 mt-0.5">
                {isProject ? 'Project' : 'Print job'} &middot; {data.reference}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 -mt-16 space-y-4">

        {/* What is happening — the largest thing on the page */}
        <section className={`${card} p-6`}>
          <h1 className="text-xl font-extrabold text-slate-900 leading-tight tracking-tight">{data.title}</h1>
          {data.description && <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{data.description}</p>}

          {isProject ? (
            <>
              <div className="flex items-center gap-6 mt-6">
                <Ring pct={data.progress_pct || 0} />
                <div className="min-w-0 space-y-3">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Status</p>
                    <p className="font-bold text-slate-900">{label(data.status)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Due to finish</p>
                    <p className="font-bold text-slate-900">{date(data.planned_end_date)}</p>
                  </div>
                </div>
              </div>
              {(data.site_address || data.start_date) && (
                <div className="flex flex-wrap gap-x-5 gap-y-1 mt-5 pt-4 border-t border-slate-100 text-xs text-slate-500">
                  {data.start_date && <span>Started {date(data.start_date)}</span>}
                  {data.site_address && <span>{data.site_address}</span>}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="mt-5 mb-1">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Right now</p>
                <p className="text-2xl font-extrabold text-[#0D3B6E] leading-tight mt-0.5">{data.production_label}</p>
              </div>
              {data.production_stage !== 'cancelled' && journey.length > 0 && (
                <ol className="mt-6">
                  {journey.map((s, i) => (
                    <Step
                      key={s.key}
                      title={s.label}
                      state={stageIndex > i ? 'done' : stageIndex === i ? 'now' : 'todo'}
                      last={i === journey.length - 1}
                    />
                  ))}
                </ol>
              )}
            </>
          )}
        </section>

        {/* A decision waiting on the client. Deliberately not another card. */}
        {awaitingQuote && (
          <section className="rounded-3xl bg-white shadow-lg shadow-amber-500/5 ring-2 ring-amber-300 overflow-hidden">
            <div className="bg-amber-50 px-6 py-2.5">
              <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Waiting on you</p>
            </div>
            <div className="p-6">
              <p className="text-lg font-bold text-slate-900">Your quote is ready</p>
              <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                Nothing is printed until you say yes.
              </p>
              {data.notes_for_client && (
                <p className="text-sm text-slate-700 mt-4 bg-slate-50 rounded-2xl px-4 py-3 leading-relaxed">
                  {data.notes_for_client}
                </p>
              )}
              <p className="text-4xl font-extrabold text-slate-900 mt-5 tabular-nums tracking-tight">
                {money(data.total || 0)}
              </p>
              <div className="flex flex-col sm:flex-row gap-2 mt-5">
                <button type="button" disabled={responding} onClick={() => respond('accepted')}
                  className="flex-1 rounded-2xl bg-[#0D3B6E] text-white px-5 py-3.5 text-sm font-bold disabled:opacity-60 active:scale-[0.99] transition-transform">
                  {responding ? 'Sending…' : 'Accept and go ahead'}
                </button>
                <button type="button" disabled={responding} onClick={() => respond('declined')}
                  className="rounded-2xl ring-1 ring-slate-200 px-5 py-3.5 text-sm font-semibold text-slate-600">
                  Decline
                </button>
              </div>
            </div>
          </section>
        )}

        {owing && (
          <section className={`${card} p-6`}>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">To pay</p>
            <p className="text-4xl font-extrabold text-slate-900 mt-1 tabular-nums tracking-tight">
              {money(data.outstanding || 0)}
            </p>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              Card or mobile money now, or settle at the counter when you collect.
            </p>
            <button type="button" onClick={pay} disabled={paying}
              className="w-full mt-5 rounded-2xl bg-[#0D3B6E] text-white px-6 py-3.5 text-sm font-bold disabled:opacity-60 inline-flex items-center justify-center gap-2 active:scale-[0.99] transition-transform">
              <CreditCard className="w-4 h-4" />
              {paying ? 'Opening…' : 'Pay now'}
            </button>
            <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 mt-3">
              <ShieldCheck className="w-3.5 h-3.5" /> Secured by Paystack
            </p>
          </section>
        )}

        {!isProject && data.payment_status === 'paid' && (
          <div className="flex items-center gap-3 bg-emerald-50 text-emerald-900 rounded-2xl px-5 py-4 ring-1 ring-emerald-100">
            <span className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
              <Check className="w-4 h-4 text-white" strokeWidth={3} />
            </span>
            <span className="text-sm font-semibold">Paid in full. Thank you.</span>
          </div>
        )}

        {error && data && (
          <div className="flex items-start gap-3 bg-amber-50 text-amber-900 rounded-2xl px-5 py-4 text-sm ring-1 ring-amber-100">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* The work itself */}
        {isProject && !!data.stages?.length && (
          <section className={`${card} p-6`}>
            <h2 className={heading}>{data.stage_word || 'Stages'}</h2>
            <ol className="mt-5">
              {data.stages.map((s, i) => (
                <Step
                  key={i}
                  title={s.name}
                  state={s.status === 'completed' ? 'done' : s.status === 'in_progress' ? 'now' : 'todo'}
                  last={i === data.stages!.length - 1}
                  note={
                    s.status === 'completed' && s.done_on ? `Completed ${date(s.done_on)}`
                    : s.status === 'in_progress' ? `${Math.round(s.progress_pct)}% done`
                    : s.due ? `Due ${date(s.due)}` : undefined
                  }
                />
              ))}
            </ol>
          </section>
        )}

        {!isProject && !!data.items?.length && (
          <section className={`${card} p-6`}>
            <h2 className={heading}>What we&apos;re doing</h2>
            <ul className="mt-4 divide-y divide-slate-100">
              {data.items.map((i, n) => (
                <li key={n} className="flex items-start justify-between gap-4 py-3 first:pt-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">{i.name}</p>
                    {i.spec && <p className="text-xs text-slate-500 mt-0.5">{i.spec}</p>}
                    <p className="text-xs text-slate-400 mt-0.5 tabular-nums">{i.quantity} &times; {money(i.unit_price)}</p>
                  </div>
                  <span className="text-sm font-semibold text-slate-900 tabular-nums flex-shrink-0">
                    {i.total > 0 ? money(i.total) : <span className="text-amber-600 font-medium">To quote</span>}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between items-baseline mt-4 pt-4 border-t-2 border-slate-900">
              <span className="font-bold text-slate-900">Total</span>
              <span className="font-extrabold text-slate-900 text-xl tabular-nums">{money(data.total || 0)}</span>
            </div>
          </section>
        )}

        {!isProject && !!data.files?.length && (
          <section className={`${card} p-6`}>
            <h2 className={heading}>Files you sent</h2>
            <ul className="mt-4 space-y-2">
              {data.files.map((f, i) => (
                <li key={i}>
                  <a href={f.url} target="_blank" rel="noreferrer"
                    className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 hover:bg-slate-100 transition-colors">
                    <span className="w-9 h-9 rounded-xl bg-white ring-1 ring-slate-200 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-slate-400" />
                    </span>
                    <span className="text-sm text-slate-800 truncate flex-1 font-medium">{f.name}</span>
                    <Download className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Shared both directions */}
        {isProject && (
          <section className={`${card} p-6`}>
            <h2 className={heading}>Documents</h2>
            <p className="text-sm text-slate-500 mt-1 leading-relaxed">
              Shared with you by {data.business.name}, and anything you send back.
            </p>

            {!data.documents?.length ? (
              <p className="text-sm text-slate-400 mt-4 mb-4">Nothing shared yet.</p>
            ) : (
              <ul className="mt-4 mb-4 space-y-2">
                {data.documents.map(d => (
                  <li key={d.id}>
                    <a href={d.url} target="_blank" rel="noreferrer"
                      className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 hover:bg-slate-100 transition-colors">
                      <span className={`w-9 h-9 rounded-xl ring-1 flex items-center justify-center flex-shrink-0 ${
                        d.from_client ? 'bg-blue-50 ring-blue-100' : 'bg-white ring-slate-200'
                      }`}>
                        <FileText className={`w-4 h-4 ${d.from_client ? 'text-[#0D3B6E]' : 'text-slate-400'}`} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm text-slate-800 truncate font-medium">{d.name}</span>
                        <span className="block text-xs text-slate-400 mt-0.5">
                          {d.from_client ? 'Sent by you' : label(d.category)} &middot; {date(d.uploaded_at)}
                        </span>
                      </span>
                      <Download className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    </a>
                  </li>
                ))}
              </ul>
            )}

            {data.can_upload && (
              <label className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 px-4 py-5 cursor-pointer hover:border-[#0D3B6E]/40 hover:bg-slate-50/50 transition-colors">
                <Upload className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-bold text-[#0D3B6E]">
                  {uploading ? 'Sending…' : 'Send a file'}
                </span>
                <input type="file" className="hidden" accept="image/*,application/pdf" disabled={uploading}
                  onChange={e => { const f = e.target.files?.[0]; if (f) sendFile(f); e.target.value = ''; }} />
              </label>
            )}
          </section>
        )}

        {/* Their money */}
        {isProject && data.billing && (
          <section className={`${card} p-6`}>
            <h2 className={heading}>Invoices</h2>
            <div className="grid grid-cols-3 gap-3 mt-4 mb-5">
              {[
                ['Invoiced', data.billing.invoiced, 'text-slate-900'],
                ['Paid', data.billing.paid, 'text-emerald-600'],
                ['Outstanding', data.billing.outstanding, data.billing.outstanding > 0 ? 'text-amber-600' : 'text-slate-900'],
              ].map(([l, v, tone]) => (
                <div key={l as string} className="rounded-2xl bg-slate-50 px-3 py-3">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{l as string}</p>
                  <p className={`font-bold mt-1 text-sm tabular-nums ${tone as string}`}>{money(v as number)}</p>
                </div>
              ))}
            </div>
            {data.billing.invoices.length === 0 ? (
              <p className="text-sm text-slate-400">Nothing invoiced yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {data.billing.invoices.map(i => (
                  <li key={i.number} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="text-sm text-slate-900 font-mono font-medium">{i.number}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Due {date(i.due)}{i.is_retention_release && ' · retention'}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-slate-900 tabular-nums">{money(i.total)}</p>
                      <p className={`text-xs font-semibold mt-0.5 ${
                        i.status === 'paid' ? 'text-emerald-600' : 'text-amber-600'
                      }`}>{label(i.status)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* The conversation */}
        {isProject && data.can_message && (
          <section className={`${card} p-6`}>
            <h2 className={`${heading} flex items-center gap-2`}>
              <MessageSquare className="w-4 h-4 text-slate-400" /> Messages
            </h2>
            <p className="text-sm text-slate-500 mt-1 leading-relaxed">
              Anything you ask here stays with the job, so it can be found later.
            </p>

            {messages.length === 0 ? (
              <p className="text-sm text-slate-400 mt-5 mb-5">No messages yet. Ask away.</p>
            ) : (
              <ul className="space-y-3 mt-5 mb-5 max-h-96 overflow-y-auto">
                {messages.map(m => (
                  <li key={m.id} className={m.from === 'client' ? 'flex justify-end' : ''}>
                    <div className={`max-w-[85%] px-4 py-3 ${
                      m.from === 'client'
                        ? 'bg-[#0D3B6E] text-white rounded-2xl rounded-br-md'
                        : 'bg-slate-100 text-slate-900 rounded-2xl rounded-bl-md'
                    }`}>
                      <p className={`text-[11px] mb-1 font-medium ${m.from === 'client' ? 'text-white/60' : 'text-slate-500'}`}>
                        {m.author} &middot; {new Date(m.at).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.body}</p>
                      {m.attachments?.map((a, i) => (
                        <a key={i} href={a.url} target="_blank" rel="noreferrer"
                          className={`block text-xs underline mt-1.5 ${m.from === 'client' ? 'text-white/90' : 'text-[#0D3B6E]'}`}>
                          {a.name}
                        </a>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex items-end gap-2">
              <textarea
                rows={2}
                className="flex-1 rounded-2xl ring-1 ring-slate-200 px-4 py-3 text-sm resize-none focus:ring-2 focus:ring-[#0D3B6E] focus:outline-none transition-shadow"
                placeholder="Ask a question…"
                value={draft}
                onChange={e => setDraft(e.target.value)}
              />
              <button type="button" onClick={send} disabled={sending || !draft.trim()}
                className="rounded-2xl bg-[#0D3B6E] text-white w-12 h-12 flex items-center justify-center disabled:opacity-30 flex-shrink-0 transition-opacity">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </section>
        )}

        {/* How to reach them */}
        <section className={`${card} p-6`}>
          <h2 className={heading}>Questions?</h2>
          <div className="mt-4 space-y-2">
            {data.business.phone && (
              <a href={`tel:${data.business.phone}`}
                className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 hover:bg-slate-100 transition-colors">
                <span className="w-9 h-9 rounded-xl bg-white ring-1 ring-slate-200 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-4 h-4 text-[#0D3B6E]" />
                </span>
                <span className="text-sm font-medium text-slate-800 flex-1">{data.business.phone}</span>
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </a>
            )}
            {data.business.email && (
              <a href={`mailto:${data.business.email}`}
                className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 hover:bg-slate-100 transition-colors">
                <span className="w-9 h-9 rounded-xl bg-white ring-1 ring-slate-200 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4 text-[#0D3B6E]" />
                </span>
                <span className="text-sm font-medium text-slate-800 flex-1 truncate">{data.business.email}</span>
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </a>
            )}
          </div>
        </section>

        <p className="text-center text-xs text-slate-400 pt-1">
          Updated {data.updated_at ? new Date(data.updated_at).toLocaleString() : 'just now'} &middot;{' '}
          <button onClick={load} className="underline inline-flex items-center gap-1">
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> refresh
          </button>
        </p>
      </main>

      {/* A decision shouldn't need finding. Reachable from anywhere on the page. */}
      {needsAction && (
        <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-slate-200 px-5 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
          <div className="max-w-2xl mx-auto flex items-center gap-4">
            <div className="min-w-0">
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                {awaitingQuote ? 'Quoted' : 'To pay'}
              </p>
              <p className="font-extrabold text-slate-900 text-lg tabular-nums leading-tight">
                {money(awaitingQuote ? (data.total || 0) : (data.outstanding || 0))}
              </p>
            </div>
            <button
              type="button"
              onClick={() => (awaitingQuote ? respond('accepted') : pay())}
              disabled={responding || paying}
              className="ml-auto rounded-2xl bg-[#0D3B6E] text-white px-6 py-3 text-sm font-bold disabled:opacity-60 flex-shrink-0 active:scale-[0.99] transition-transform"
            >
              {responding || paying ? 'Working…' : awaitingQuote ? 'Accept' : 'Pay now'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
