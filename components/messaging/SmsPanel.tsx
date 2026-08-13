'use client';
import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { toast, ConfirmDialog } from '@/components/ui';
import {
  MessageSquare, ShoppingCart, RefreshCw, CheckCircle, XCircle, AlertCircle,
  RotateCcw, Save, Ban, Zap,
} from 'lucide-react';

interface Bundle { label: string; credits: number; price: number; unit_price: number }
interface Template {
  key: string; group: string; label: string; description: string;
  variables: string[];
  body: string; default_body: string;
  enabled: boolean; is_customised: boolean; segments: number;
}
interface Balance {
  credits: number; is_low: boolean; low_balance_at: number;
  enabled: boolean; sender_id: string;
  messages_sent: number; messages_blocked: number;
  bundles: Bundle[];
}
interface Message {
  id: string; to: string; body: string; status: string;
  segments: number; credits_used: number; error?: string;
  template_key?: string; createdAt: string;
}

const STATUS_STYLES: Record<string, { badge: string; icon: any; label: string }> = {
  sent:                 { badge: 'bg-green-50 text-green-700',  icon: CheckCircle, label: 'Sent' },
  failed:               { badge: 'bg-red-50 text-red-600',      icon: XCircle,     label: 'Failed' },
  insufficient_credits: { badge: 'bg-amber-50 text-amber-700',  icon: AlertCircle, label: 'No credits' },
  disabled:             { badge: 'bg-gray-100 text-gray-500',   icon: Ban,         label: 'Off' },
};

const cedis = (n: number) => `GHS ${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Toggle({ on, onChange, disabled }: { on: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${on ? 'bg-[#0D3B6E]' : 'bg-gray-300'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return isToday ? `Today ${time}` : `${d.toLocaleDateString([], { day: 'numeric', month: 'short' })} ${time}`;
}

/**
 * Text messages: what they cost, what they say, and what went out.
 *
 * Was the whole /sms page. It is now one of two channels on Messaging, because
 * a business does not think in terms of "the SMS page" and "the email page" —
 * it thinks about telling a customer something, and picks how.
 */
export default function SmsPanel() {
  const { user } = useAuth();
  const isOwner = user?.role === 'business_owner' || user?.role === 'platform_admin';

  const [balance, setBalance] = useState<Balance | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<number | null>(null);
  const [expandedMsg, setExpandedMsg] = useState<string | null>(null);

  const [edited, setEdited] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; message: string; danger?: boolean; run: () => void } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [b, t, m] = await Promise.all([
        api.get('/sms/balance'),
        api.get('/sms/templates'),
        api.get('/sms/messages'),
      ]);
      setBalance(b.data.data);
      setTemplates(t.data.data || []);
      setMessages(m.data.data || []);
      setEdited({});
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not load SMS');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const buy = async (bundle: Bundle) => {
    setBuying(bundle.credits);
    try {
      const r = await api.post('/sms/purchase', { credits: bundle.credits });
      const d = r.data.data;
      if (!d.paystack_public_key) throw new Error('Paystack is not configured.');
      const run = () => {
        const handler = (window as any).PaystackPop.setup({
          key: d.paystack_public_key,
          email: d.email,
          amount: Math.round(d.amount * 100),
          currency: 'GHS',
          ref: d.reference,
          onClose: () => setBuying(null),
          callback: (response: { reference: string }) => {
            api.post('/sms/purchase/verify', { reference: response.reference, purchase_id: d.purchase_id })
              .then((v) => { toast.success(v.data.message || 'Credits added'); return load(); })
              .catch((e: any) => toast.error(e.response?.data?.message || 'Could not confirm the purchase'))
              .finally(() => setBuying(null));
          },
        });
        handler.openIframe();
      };
      if ((window as any).PaystackPop) run();
      else {
        const script = document.createElement('script');
        script.src = 'https://js.paystack.co/v1/inline.js';
        script.onload = run;
        script.onerror = () => { toast.error('Could not load Paystack'); setBuying(null); };
        document.body.appendChild(script);
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || e.message || 'Could not start the purchase');
      setBuying(null);
    }
  };

  const saveTemplate = async (t: Template) => {
    const body = edited[t.key] ?? t.body;
    setSavingKey(t.key);
    try {
      await api.put(`/sms/templates/${t.key}`, { body });
      toast.success('Message saved');
      await load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not save');
    } finally { setSavingKey(null); }
  };

  const toggleTemplate = async (t: Template) => {
    setTemplates(prev => prev.map(x => x.key === t.key ? { ...x, enabled: !x.enabled } : x));
    try {
      await api.put(`/sms/templates/${t.key}`, { enabled: !t.enabled });
    } catch (e: any) {
      setTemplates(prev => prev.map(x => x.key === t.key ? { ...x, enabled: t.enabled } : x));
      toast.error(e.response?.data?.message || 'Could not update');
    }
  };

  const resetTemplate = (t: Template) => {
    setConfirm({
      title: 'Restore the default message?',
      message: `"${t.label}" will go back to the wording GEMS ships with. Your version will be lost.`,
      danger: true,
      run: async () => {
        try {
          await api.post(`/sms/templates/${t.key}/reset`);
          toast.success('Default restored');
          await load();
        } catch (e: any) {
          toast.error(e.response?.data?.message || 'Could not reset');
        }
      },
    });
  };

  const segmentsOf = (text: string) => {
    if (!text.length) return 0;
    // eslint-disable-next-line no-control-regex
    const gsm = /^[@£$¥èéùìòÇ\n\rØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&'()*+,\-./0-9:;<=>?¡A-ZÄÖÑÜ§¿a-zäöñüà^{}\\\[~\]|€]*$/.test(text);
    if (gsm) return text.length <= 160 ? 1 : Math.ceil(text.length / 153);
    return text.length <= 70 ? 1 : Math.ceil(text.length / 67);
  };

  const bestValueIdx = (balance?.bundles || []).reduce((best, b, i, arr) =>
    b.unit_price < arr[best].unit_price ? i : best, 0);

  return (
    <>
      <div className="space-y-5">
        <div className="flex justify-end">
          <button type="button" onClick={load} className="btn-secondary" disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        {/* ── Balance + Top-up ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Credits card */}
          <div className="card flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-5 h-5 text-[#0D3B6E]" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">SMS credits</p>
                <p className="text-3xl font-extrabold text-gray-900 leading-none mt-0.5">
                  {loading && !balance ? '—' : (balance?.credits ?? 0).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-400">Sent</p>
                <p className="font-semibold text-gray-700">{(balance?.messages_sent ?? 0).toLocaleString()}</p>
              </div>
              {(balance?.messages_blocked ?? 0) > 0 && (
                <div>
                  <p className="text-xs text-gray-400">Blocked</p>
                  <p className="font-semibold text-amber-600">{balance?.messages_blocked}</p>
                </div>
              )}
              {balance?.sender_id && (
                <div>
                  <p className="text-xs text-gray-400">Sender ID</p>
                  <p className="font-semibold text-gray-700">{balance.sender_id}</p>
                </div>
              )}
            </div>

            {balance?.is_low && (
              <div className="flex items-start gap-2 bg-amber-50 text-amber-800 rounded-lg px-3 py-2.5 text-xs">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Running low — customers stop getting messages at zero.</span>
              </div>
            )}
          </div>

          {/* Top-up */}
          <div className="lg:col-span-2 card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-gray-900">Top up</h2>
                <p className="text-xs text-gray-400 mt-0.5">Credits never expire.</p>
              </div>
              {!isOwner && <p className="text-xs text-gray-400">Only a business owner can buy credits.</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(balance?.bundles || []).map((b, i) => (
                <div key={b.credits} className={`relative rounded-xl border p-4 flex flex-col transition-colors ${i === bestValueIdx ? 'border-[#0D3B6E] bg-[#0D3B6E]/[0.03]' : 'border-gray-200 hover:border-gray-300'}`}>
                  {i === bestValueIdx && (
                    <span className="absolute -top-2.5 left-3 inline-flex items-center gap-1 bg-[#0D3B6E] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      <Zap className="w-2.5 h-2.5" /> Best value
                    </span>
                  )}
                  <p className="text-xs font-bold uppercase tracking-wider text-[#0D3B6E]">{b.label}</p>
                  <p className="text-2xl font-extrabold text-gray-900 mt-1">{b.credits.toLocaleString()}</p>
                  <p className="text-xs text-gray-400 mb-3">messages · {cedis(b.unit_price)} each</p>
                  <p className="font-bold text-gray-900 mb-3 mt-auto">{cedis(b.price)}</p>
                  <button
                    type="button"
                    className={`w-full justify-center ${i === bestValueIdx ? 'btn-primary' : 'btn-secondary'}`}
                    disabled={!isOwner || buying !== null}
                    onClick={() => buy(b)}
                  >
                    <ShoppingCart className="w-4 h-4" />
                    {buying === b.credits ? 'Opening…' : 'Buy'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Templates ── */}
        <div className="card">
          <div className="mb-5">
            <h2 className="font-bold text-gray-900">Messages</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Edit what customers receive, or switch a message off entirely.
            </p>
          </div>

          <div className="space-y-3">
            {templates.map((t, ti) => {
              const value = edited[t.key] ?? t.body;
              const dirty = edited[t.key] !== undefined && edited[t.key] !== t.body;
              const segs = segmentsOf(value);
              const startsGroup = ti === 0 || templates[ti - 1].group !== t.group;
              return (
                <div key={t.key}>
                  {startsGroup && (
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 mt-4 first:mt-0">
                      {t.group === 'Projects' ? 'Project clients' : t.group}
                    </p>
                  )}
                  <div className={`rounded-xl border p-4 transition-opacity ${t.enabled ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-800 text-sm">{t.label}</p>
                          {t.is_customised && (
                            <span className="text-[10px] bg-blue-50 text-[#0D3B6E] font-semibold px-2 py-0.5 rounded-full">Edited</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{t.description}</p>
                      </div>
                      <Toggle on={t.enabled} onChange={() => isOwner && toggleTemplate(t)} disabled={!isOwner} />
                    </div>

                    <textarea
                      className="form-input font-mono text-xs leading-relaxed"
                      rows={3}
                      value={value}
                      disabled={!isOwner}
                      onChange={e => setEdited(p => ({ ...p, [t.key]: e.target.value }))}
                    />

                    <div className="flex items-center justify-between gap-3 mt-2 flex-wrap">
                      <div className="flex items-center gap-3 flex-wrap">
                        <p className="text-xs text-gray-400">
                          {value.length} chars · <span className="font-medium text-gray-600">{segs} credit{segs === 1 ? '' : 's'}</span>
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {t.variables.map(v => (
                            <code key={v} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{v}</code>
                          ))}
                        </div>
                      </div>
                      {isOwner && (
                        <div className="flex items-center gap-2">
                          {t.is_customised && (
                            <button type="button" className="btn-ghost text-xs" onClick={() => resetTemplate(t)}>
                              <RotateCcw className="w-3.5 h-3.5" /> Restore default
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn-secondary text-xs"
                            disabled={!dirty || savingKey === t.key}
                            onClick={() => saveTemplate(t)}
                          >
                            <Save className="w-3.5 h-3.5" /> {savingKey === t.key ? 'Saving…' : 'Save'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── History ── */}
        <div className="card">
          <h2 className="font-bold text-gray-900 mb-4">Recent messages</h2>
          {messages.length === 0 ? (
            <p className="text-sm text-gray-400">Nothing sent yet.</p>
          ) : (
            <div className="table-wrap">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="table-header text-left">
                    <th className="px-4 py-2.5">When</th>
                    <th className="px-4 py-2.5">To</th>
                    <th className="px-4 py-2.5">Message</th>
                    <th className="px-4 py-2.5 text-right">Credits</th>
                    <th className="px-4 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map(m => {
                    const s = STATUS_STYLES[m.status] || STATUS_STYLES.failed;
                    const Icon = s.icon;
                    const expanded = expandedMsg === m.id;
                    return (
                      <tr key={m.id} className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => setExpandedMsg(expanded ? null : m.id)}>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{fmtDate(m.createdAt)}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap font-mono text-xs">{m.to}</td>
                        <td className="px-4 py-3 text-gray-500 max-w-[300px]">
                          {expanded
                            ? <span className="text-xs whitespace-pre-wrap">{m.body}</span>
                            : <span className="text-xs truncate block">{m.body}</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600 text-xs">{m.credits_used}</td>
                        <td className="px-4 py-3">
                          <span className={`badge ${s.badge} inline-flex items-center gap-1`}>
                            <Icon className="w-3 h-3" /> {s.label}
                          </span>
                          {m.error && <p className="text-xs text-gray-400 mt-1">{m.error}</p>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <ConfirmDialog
          open={!!confirm}
          onClose={() => setConfirm(null)}
          onConfirm={() => { confirm?.run(); setConfirm(null); }}
          title={confirm?.title || ''}
          message={confirm?.message || ''}
          danger={confirm?.danger}
        />
      </div>
    </>
  );
}
