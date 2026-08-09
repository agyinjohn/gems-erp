'use client';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { publicApi } from '@/lib/api';
import {
  CheckCircle2, Circle, Clock, AlertTriangle, FileText, Download,
  Building2, Phone, Mail, RefreshCw,
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

  // Order / print job
  production_stage?: string | null;
  production_label?: string | null;
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
}

const STAGES = ['awaiting_quote', 'quoted', 'queued', 'preparing', 'printing', 'finishing', 'ready', 'collected'];
const STAGE_SHORT: Record<string, string> = {
  awaiting_quote: 'Pricing', quoted: 'Quoted', queued: 'Queued', preparing: 'Preparing',
  printing: 'Printing', finishing: 'Finishing', ready: 'Ready', collected: 'Collected',
};
const date = (d?: string | null) =>
  (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const label = (s: string) => (s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

export default function TrackPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<Tracked | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [responding, setResponding] = useState(false);

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

  useEffect(() => { if (token) load(); }, [load, token]);

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

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <RefreshCw className="w-6 h-6 text-gray-300 animate-spin" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-8 max-w-sm text-center">
          <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-3" />
          <p className="font-semibold text-gray-800">{error}</p>
          <p className="text-sm text-gray-500 mt-2">
            Check the link, or ask whoever sent it for a new one.
          </p>
        </div>
      </div>
    );
  }
  if (!data) return null;

  const isProject = data.kind === 'project';
  const stageIndex = STAGES.indexOf(data.production_stage || '');

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Who this is from */}
      <header className="bg-[#0D3B6E] text-white">
        <div className="max-w-3xl mx-auto px-5 py-6">
          <div className="flex items-center gap-3">
            {data.business.logo
              ? <img src={data.business.logo} alt="" className="w-10 h-10 rounded-lg object-cover bg-white/10" />
              : <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center"><Building2 className="w-5 h-5" /></div>}
            <div className="min-w-0">
              <p className="font-bold truncate">{data.business.name}</p>
              <p className="text-xs text-white/70">
                {isProject ? 'Project update' : 'Job update'} · {data.reference}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 -mt-4 space-y-4">

        {/* Headline */}
        <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-5">
          <h1 className="text-lg font-bold text-gray-900">{data.title}</h1>
          {data.description && <p className="text-sm text-gray-500 mt-1">{data.description}</p>}

          {isProject ? (
            <>
              <div className="flex items-center justify-between text-sm mt-4 mb-1.5">
                <span className="text-gray-500">Progress</span>
                <span className="font-bold text-gray-900">{Math.round(data.progress_pct || 0)}%</span>
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#0D3B6E] rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, data.progress_pct || 0)}%` }} />
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-1 mt-4 text-sm">
                <span className="text-gray-500">Started <strong className="text-gray-800">{date(data.start_date)}</strong></span>
                <span className="text-gray-500">Due <strong className="text-gray-800">{date(data.planned_end_date)}</strong></span>
                {data.site_address && <span className="text-gray-500">{data.site_address}</span>}
              </div>
            </>
          ) : (
            <>
              <p className="text-base font-semibold text-[#0D3B6E] mt-3">{data.production_label}</p>
              {/* Where the job is on the shop floor */}
              <ol className="flex items-center gap-1 mt-4 overflow-x-auto pb-1">
                {STAGES.slice(0, 8).map((s, i) => {
                  const done = stageIndex >= 0 && i < stageIndex;
                  const now = i === stageIndex;
                  return (
                    <li key={s} className="flex items-center gap-1 flex-shrink-0">
                      <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs whitespace-nowrap ${
                        now ? 'bg-[#0D3B6E] text-white font-semibold'
                        : done ? 'bg-blue-50 text-[#0D3B6E]' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {done ? <CheckCircle2 className="w-3 h-3" /> : now ? <Clock className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                        {STAGE_SHORT[s]}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </>
          )}
        </section>

        {/* A quote waiting on the client */}
        {!isProject && data.quote_status === 'quoted' && (
          <section className="bg-white rounded-2xl shadow-sm ring-1 ring-amber-200 p-5">
            <p className="font-bold text-gray-900">Your quote is ready</p>
            <p className="text-sm text-gray-500 mt-0.5">
              {data.business.name} has priced your job. Nothing is printed until you say yes.
            </p>
            {data.notes_for_client && (
              <p className="text-sm text-gray-700 mt-3 bg-amber-50 rounded-xl px-4 py-3">{data.notes_for_client}</p>
            )}
            <p className="text-3xl font-extrabold text-gray-900 mt-4">{money(data.total || 0)}</p>
            <div className="flex flex-wrap gap-2 mt-4">
              <button type="button" disabled={responding}
                onClick={() => respond('accepted')}
                className="rounded-xl bg-[#0D3B6E] text-white px-5 py-2.5 text-sm font-semibold disabled:opacity-60">
                {responding ? 'Sending…' : 'Accept and go ahead'}
              </button>
              <button type="button" disabled={responding}
                onClick={() => respond('declined')}
                className="rounded-xl ring-1 ring-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600">
                Decline
              </button>
            </div>
          </section>
        )}

        {/* Stages of a project */}
        {isProject && !!data.stages?.length && (
          <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-5">
            <h2 className="font-bold text-gray-900 mb-3">{data.stage_word || 'Stages'}</h2>
            <ol className="space-y-2.5">
              {data.stages.map((s, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-0.5 flex-shrink-0">
                    {s.status === 'completed'
                      ? <CheckCircle2 className="w-4.5 h-4.5 text-green-500" />
                      : s.status === 'in_progress'
                        ? <Clock className="w-4.5 h-4.5 text-amber-500" />
                        : <Circle className="w-4.5 h-4.5 text-gray-300" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium ${s.status === 'completed' ? 'text-gray-500' : 'text-gray-900'}`}>
                      {s.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {s.status === 'completed' && s.done_on ? `Completed ${date(s.done_on)}`
                        : s.status === 'in_progress' ? `${Math.round(s.progress_pct)}% done`
                        : s.due ? `Due ${date(s.due)}` : 'Not started'}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* What the job is made of */}
        {!isProject && !!data.items?.length && (
          <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-5">
            <h2 className="font-bold text-gray-900 mb-3">What we&apos;re doing</h2>
            <ul className="space-y-2.5">
              {data.items.map((i, n) => (
                <li key={n} className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-900">{i.name}</p>
                    {i.spec && <p className="text-xs text-gray-500">{i.spec}</p>}
                    <p className="text-xs text-gray-400">{i.quantity} × {money(i.unit_price)}</p>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 tabular-nums flex-shrink-0">
                    {i.total > 0 ? money(i.total) : 'To quote'}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-100">
              <span className="font-semibold text-gray-900">Total</span>
              <span className="font-bold text-gray-900 text-lg">{money(data.total || 0)}</span>
            </div>
            {(data.outstanding || 0) > 0 && (data.paid || 0) > 0 && (
              <p className="text-sm text-amber-700 mt-1 text-right">{money(data.outstanding!)} still to pay</p>
            )}
          </section>
        )}

        {/* Files the client sent */}
        {!isProject && !!data.files?.length && (
          <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-5">
            <h2 className="font-bold text-gray-900 mb-3">Files you sent</h2>
            <ul className="space-y-1.5">
              {data.files.map((f, i) => (
                <li key={i}>
                  <a href={f.url} target="_blank" rel="noreferrer"
                    className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-2.5 hover:bg-gray-100 transition-colors">
                    <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-800 truncate flex-1">{f.name}</span>
                    <Download className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Their money */}
        {isProject && data.billing && (
          <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-5">
            <h2 className="font-bold text-gray-900 mb-3">Invoices</h2>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                ['Invoiced', data.billing.invoiced, 'text-gray-900'],
                ['Paid', data.billing.paid, 'text-green-600'],
                ['Outstanding', data.billing.outstanding, data.billing.outstanding > 0 ? 'text-amber-700' : 'text-gray-900'],
              ].map(([l, v, tone]) => (
                <div key={l as string}>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">{l as string}</p>
                  <p className={`font-bold mt-0.5 ${tone as string}`}>{money(v as number)}</p>
                </div>
              ))}
            </div>
            {data.billing.invoices.length === 0 ? (
              <p className="text-sm text-gray-400">Nothing invoiced yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {data.billing.invoices.map(i => (
                  <li key={i.number} className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm text-gray-800 font-mono">{i.number}</p>
                      <p className="text-xs text-gray-400">
                        Issued {date(i.issued)} · due {date(i.due)}
                        {i.is_retention_release && ' · retention'}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-gray-900 tabular-nums">{money(i.total)}</p>
                      <p className={`text-xs font-medium ${
                        i.status === 'paid' ? 'text-green-600' : 'text-amber-700'
                      }`}>{label(i.status)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* How to reach them */}
        <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-5">
          <h2 className="font-bold text-gray-900 mb-2">Questions?</h2>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {data.business.phone && (
              <a href={`tel:${data.business.phone}`} className="flex items-center gap-2 text-[#0D3B6E]">
                <Phone className="w-4 h-4" /> {data.business.phone}
              </a>
            )}
            {data.business.email && (
              <a href={`mailto:${data.business.email}`} className="flex items-center gap-2 text-[#0D3B6E]">
                <Mail className="w-4 h-4" /> {data.business.email}
              </a>
            )}
          </div>
        </section>

        <p className="text-center text-xs text-gray-400 pt-2">
          Updated {data.updated_at ? new Date(data.updated_at).toLocaleString() : 'just now'} ·
          {' '}<button onClick={load} className="underline">refresh</button>
        </p>
      </main>
    </div>
  );
}
