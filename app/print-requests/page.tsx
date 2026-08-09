'use client';
import { useCallback, useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { toast } from '@/components/ui';
import {
  RefreshCw, FileText, Printer, ExternalLink, Copy, Filter, Clock,
} from 'lucide-react';

/**
 * The print shop's queue.
 *
 * Requests arrive priced only where the list could price them, so the job here
 * is: open the file, put a number on it, send it back. Work can't start until
 * the client has agreed — the server enforces that, and this reflects it.
 */

interface Item {
  _id?: string; product_name: string; quantity: number;
  unit_price: number; total: number; print_spec?: string;
}
interface Req {
  id: string; order_number: string; customer_name: string; customer_phone: string;
  customer_email?: string; items: Item[]; files: { name: string; url: string; size?: number }[];
  subtotal: number; total: number; notes?: string; quote_note?: string;
  quote_status: string | null; production_stage: string | null;
  payment_status: string; track_token?: string; createdAt: string;
}

const STAGES = ['queued', 'preparing', 'printing', 'finishing', 'ready', 'collected'];
const STAGE_TONE: Record<string, string> = {
  awaiting_quote: 'bg-amber-50 text-amber-700',
  quoted:         'bg-blue-50 text-blue-700',
  queued:         'bg-gray-100 text-gray-600',
  preparing:      'bg-gray-100 text-gray-600',
  printing:       'bg-[#0D3B6E]/10 text-[#0D3B6E]',
  finishing:      'bg-[#0D3B6E]/10 text-[#0D3B6E]',
  ready:          'bg-green-50 text-green-700',
  collected:      'bg-gray-100 text-gray-400',
  cancelled:      'bg-red-50 text-red-600',
};
const label = (s: string) => (s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
const money = (n: number) => `GHS ${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function PrintRequestsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [openOnly, setOpenOnly] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/print-requests', { params: openOnly ? { open: 'true' } : {} });
      setRows(r.data.data || []);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not load print requests');
    } finally {
      setLoading(false);
    }
  }, [openOnly]);

  useEffect(() => { load(); }, [load]);

  const openRow = (r: Req) => {
    if (open === r.id) { setOpen(null); return; }
    setOpen(r.id);
    setDraft(Object.fromEntries(r.items.map(i => [String(i._id), String(i.unit_price || '')])));
    setNote(r.quote_note || '');
  };

  const sendQuote = async (r: Req) => {
    setBusy(true);
    try {
      await api.post(`/print-requests/${r.id}/quote`, {
        lines: r.items.map(i => ({ id: String(i._id), unit_price: parseFloat(draft[String(i._id)]) || 0 })),
        note,
      });
      toast.success(`Quote sent for ${r.order_number}`);
      setOpen(null);
      await load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not send the quote');
    } finally { setBusy(false); }
  };

  const moveTo = async (r: Req, stage: string) => {
    try {
      await api.patch(`/print-requests/${r.id}/stage`, { stage });
      await load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not update the stage');
    }
  };

  const copyLink = (r: Req) => {
    const link = `${window.location.origin}/track/${r.track_token}`;
    navigator.clipboard?.writeText(link);
    toast.success('Tracking link copied');
  };

  const awaiting = rows.filter(r => r.quote_status === 'awaiting_quote').length;
  const quoted = rows.filter(r => r.quote_status === 'quoted').length;
  const onFloor = rows.filter(r => ['queued', 'preparing', 'printing', 'finishing'].includes(r.production_stage || '')).length;
  const ready = rows.filter(r => r.production_stage === 'ready').length;

  return (
    <AppLayout
      title="Print requests"
      subtitle="Jobs clients have sent in"
      allowedRoles={['platform_admin', 'business_owner', 'branch_manager', 'sales_staff']}
    >
      <div className="space-y-5">

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            ['To price', awaiting, awaiting ? 'text-amber-700' : 'text-gray-900'],
            ['Awaiting the client', quoted, 'text-blue-700'],
            ['On the floor', onFloor, 'text-gray-900'],
            ['Ready for collection', ready, ready ? 'text-green-600' : 'text-gray-900'],
          ].map(([l, v, tone]) => (
            <div key={l as string} className="card">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">{l as string}</p>
              <p className={`text-2xl font-extrabold mt-1 ${tone as string}`}>{v as number}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={openOnly ? 'btn-primary' : 'btn-secondary'} onClick={() => setOpenOnly(v => !v)}>
            <Filter className="w-4 h-4" /> {openOnly ? 'Open jobs' : 'Everything'}
          </button>
          <button type="button" onClick={load} className="btn-secondary ml-auto" disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {loading && !rows.length ? (
          <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="card animate-pulse h-24" />)}</div>
        ) : rows.length === 0 ? (
          <div className="card text-center py-16">
            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Printer className="w-7 h-7 text-gray-300" />
            </div>
            <p className="font-semibold text-gray-700">Nothing waiting</p>
            <p className="text-sm text-gray-400 mt-1 max-w-sm mx-auto">
              Requests clients send from your print page land here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map(r => {
              const isOpen = open === r.id;
              const draftTotal = r.items.reduce((s, i) => s + (parseFloat(draft[String(i._id)]) || 0) * i.quantity, 0);
              return (
                <div key={r.id} className="card !p-0 overflow-hidden">
                  <button type="button" onClick={() => openRow(r)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs text-gray-500">{r.order_number}</span>
                          <span className={`badge ${STAGE_TONE[r.production_stage || ''] || 'bg-gray-100 text-gray-600'}`}>
                            {label(r.production_stage || 'new')}
                          </span>
                          {r.payment_status === 'paid' && <span className="badge bg-green-50 text-green-700">Paid</span>}
                        </div>
                        <p className="font-semibold text-gray-900 text-sm mt-0.5">{r.customer_name}</p>
                        <p className="text-xs text-gray-500">
                          {r.customer_phone} · {r.files.length} file{r.files.length === 1 ? '' : 's'} ·
                          {' '}{new Date(r.createdAt).toLocaleDateString()}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {r.items.map((i, n) => (
                            <span key={n} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                              {i.quantity} × {i.product_name}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-gray-900">{r.total > 0 ? money(r.total) : '—'}</p>
                        {r.quote_status === 'awaiting_quote' && <p className="text-xs text-amber-700">needs a price</p>}
                      </div>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-gray-100 px-4 py-4 bg-gray-50/60 space-y-4">
                      {/* The files */}
                      <div>
                        <p className="form-label">Files</p>
                        <ul className="space-y-1.5">
                          {r.files.map((f, i) => (
                            <li key={i}>
                              <a href={f.url} target="_blank" rel="noreferrer"
                                className="flex items-center gap-3 bg-white rounded-xl px-4 py-2.5 ring-1 ring-gray-100 hover:ring-gray-200">
                                <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                <span className="text-sm text-gray-800 truncate flex-1">{f.name}</span>
                                <ExternalLink className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {r.notes && (
                        <div>
                          <p className="form-label">What they said</p>
                          <p className="text-sm text-gray-700 bg-white rounded-xl px-4 py-2.5 ring-1 ring-gray-100">{r.notes}</p>
                        </div>
                      )}

                      {/* Pricing */}
                      {r.quote_status !== 'accepted' && (
                        <div>
                          <p className="form-label">Price the job</p>
                          <div className="space-y-2">
                            {r.items.map(i => (
                              <div key={String(i._id)} className="grid grid-cols-[1fr_110px] gap-2 items-center">
                                <div className="min-w-0">
                                  <p className="text-sm text-gray-800 truncate">{i.quantity} × {i.product_name}</p>
                                  {i.print_spec && <p className="text-xs text-gray-500 truncate">{i.print_spec}</p>}
                                </div>
                                <input type="number" min={0} step="0.01" className="form-input !py-1.5 text-sm"
                                  placeholder="unit price"
                                  value={draft[String(i._id)] ?? ''}
                                  onChange={e => setDraft(d => ({ ...d, [String(i._id)]: e.target.value }))} />
                              </div>
                            ))}
                          </div>
                          <input className="form-input mt-2" placeholder="A note for the client (optional)"
                            value={note} onChange={e => setNote(e.target.value)} />
                          <div className="flex flex-wrap items-center gap-3 mt-3">
                            <button type="button" className="btn-primary !py-1.5 text-xs" disabled={busy || draftTotal <= 0}
                              onClick={() => sendQuote(r)}>
                              {busy ? 'Sending…' : r.quote_status === 'quoted' ? 'Re-send quote' : 'Send quote'}
                            </button>
                            <span className="text-sm font-semibold text-gray-900">{money(draftTotal)}</span>
                            {r.quote_status === 'quoted' && (
                              <span className="text-xs text-blue-700 inline-flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" /> waiting on the client
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Shop floor */}
                      <div>
                        <p className="form-label">Stage</p>
                        {r.quote_status !== 'accepted' ? (
                          <p className="text-xs text-gray-500">
                            The client hasn&apos;t accepted the quote yet, so the job can&apos;t be started.
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {STAGES.map(s => (
                              <button key={s} type="button" onClick={() => moveTo(r, s)}
                                className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                                  r.production_stage === s
                                    ? 'bg-[#0D3B6E] text-white font-semibold'
                                    : 'bg-white ring-1 ring-gray-200 text-gray-600 hover:ring-gray-300'
                                }`}>{label(s)}</button>
                            ))}
                          </div>
                        )}
                      </div>

                      {r.track_token && (
                        <button type="button" onClick={() => copyLink(r)} className="btn-ghost text-xs">
                          <Copy className="w-3.5 h-3.5" /> Copy the client&apos;s tracking link
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
