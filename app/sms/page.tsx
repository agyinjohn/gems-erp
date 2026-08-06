'use client';
import { useCallback, useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { toast, ConfirmDialog } from '@/components/ui';
import {
  MessageSquare, ShoppingCart, RefreshCw, CheckCircle, XCircle, AlertCircle,
  RotateCcw, Send, Save, Ban,
} from 'lucide-react';

interface Bundle { label: string; credits: number; price: number; unit_price: number }
interface Template {
  key: string; label: string; description: string;
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
  sent:                 { badge: 'bg-green-50 text-green-700', icon: CheckCircle, label: 'Sent' },
  failed:               { badge: 'bg-red-50 text-red-600',     icon: XCircle,     label: 'Failed' },
  insufficient_credits: { badge: 'bg-amber-50 text-amber-700', icon: AlertCircle, label: 'No credits' },
  disabled:             { badge: 'bg-gray-100 text-gray-600',  icon: Ban,         label: 'Switched off' },
};

const cedis = (n: number) => `GHS ${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function SmsPage() {
  const { user } = useAuth();
  const isOwner = user?.role === 'business_owner' || user?.role === 'platform_admin';

  const [balance, setBalance] = useState<Balance | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [variables, setVariables] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<number | null>(null);

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
      setVariables(t.data.variables || []);
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
    } finally {
      setSavingKey(null);
    }
  };

  const toggleTemplate = async (t: Template) => {
    try {
      await api.put(`/sms/templates/${t.key}`, { enabled: !t.enabled });
      await load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not update');
    }
  };

  const resetTemplate = (t: Template) => {
    setConfirm({
      title: 'Restore the default message?',
      message: `“${t.label}” will go back to the wording GEMS ships with. Your version will be lost.`,
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

  // Mirrors the server's segment counting so the cost shown while typing
  // matches what will actually be charged.
  const segmentsOf = (text: string) => {
    if (!text.length) return 0;
    // eslint-disable-next-line no-control-regex
    const gsm = /^[@£$¥èéùìòÇ\n\rØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&'()*+,\-./0-9:;<=>?¡A-ZÄÖÑÜ§¿a-zäöñüà^{}\\[~\]|€]*$/.test(text);
    if (gsm) return text.length <= 160 ? 1 : Math.ceil(text.length / 153);
    return text.length <= 70 ? 1 : Math.ceil(text.length / 67);
  };

  return (
    <AppLayout title="SMS" subtitle="Send and manage SMS notifications.">
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Customer SMS</h1>
            <p className="text-sm text-gray-500 mt-0.5">Buy credits and choose what your customers are told.</p>
          </div>
          <button type="button" onClick={load} className="btn-secondary" disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        {/* ── Balance ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="card">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-5 h-5 text-[#0D3B6E]" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">SMS credits</h2>
                <p className="text-sm text-gray-500 mt-0.5">One credit sends one message</p>
              </div>
            </div>
            <p className="text-4xl font-extrabold text-gray-900">{loading && !balance ? '—' : (balance?.credits ?? 0).toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">
              {balance?.messages_sent ?? 0} sent
              {(balance?.messages_blocked ?? 0) > 0 && <> · <span className="text-amber-600 font-semibold">{balance?.messages_blocked} not sent (no credits)</span></>}
            </p>
            {balance?.is_low && (
              <div className="flex items-start gap-2.5 bg-amber-50 text-amber-800 rounded-xl px-4 py-3 text-sm mt-4">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Running low — customers stop getting messages at zero.</span>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 card">
            <h2 className="font-bold text-gray-900 mb-1">Top up</h2>
            <p className="text-sm text-gray-500 mb-4">Credits never expire.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(balance?.bundles || []).map(b => (
                <div key={b.credits} className="border border-gray-200 rounded-xl p-4 hover:border-[#0D3B6E]/40 transition-colors flex flex-col">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#0D3B6E]">{b.label}</p>
                  <p className="text-2xl font-extrabold text-gray-900 mt-1">{b.credits.toLocaleString()}</p>
                  <p className="text-xs text-gray-400 mb-3">messages · {cedis(b.unit_price)} each</p>
                  <p className="font-bold text-gray-900 mb-3 mt-auto">{cedis(b.price)}</p>
                  <button
                    type="button"
                    className="btn-primary w-full justify-center"
                    disabled={!isOwner || buying !== null}
                    onClick={() => buy(b)}
                  >
                    <ShoppingCart className="w-4 h-4" />
                    {buying === b.credits ? 'Opening…' : 'Buy'}
                  </button>
                </div>
              ))}
            </div>
            {!isOwner && <p className="text-xs text-gray-400 mt-3">Only a business owner can buy credits.</p>}
          </div>
        </div>

        {/* ── Templates ── */}
        <div className="card">
          <div className="mb-5">
            <h2 className="font-bold text-gray-900">Messages</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Edit what customers receive, or switch a message off. Use{' '}
              {variables.map((v, i) => (
                <span key={v}>
                  <code className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-xs">{v}</code>
                  {i < variables.length - 1 ? ' ' : ''}
                </span>
              ))}{' '}
              to fill in order details.
            </p>
          </div>

          <div className="space-y-4">
            {templates.map(t => {
              const value = edited[t.key] ?? t.body;
              const dirty = edited[t.key] !== undefined && edited[t.key] !== t.body;
              const segs = segmentsOf(value);
              return (
                <div key={t.key} className={`rounded-xl ring-1 p-4 ${t.enabled ? 'ring-gray-100 bg-gray-50' : 'ring-gray-100 bg-gray-50/50 opacity-70'}`}>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-800 text-sm">{t.label}</p>
                        {t.is_customised && <span className="text-xs bg-blue-50 text-[#0D3B6E] font-semibold px-2 py-0.5 rounded-full">Edited</span>}
                        {!t.enabled && <span className="text-xs bg-gray-200 text-gray-600 font-semibold px-2 py-0.5 rounded-full">Off</span>}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={t.enabled}
                      disabled={!isOwner}
                      onClick={() => toggleTemplate(t)}
                      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 disabled:opacity-50 ${t.enabled ? 'bg-[#0D3B6E]' : 'bg-gray-300'}`}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${t.enabled ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                    </button>
                  </div>

                  <textarea
                    className="form-input font-mono text-xs leading-relaxed"
                    rows={3}
                    value={value}
                    disabled={!isOwner}
                    onChange={e => setEdited(p => ({ ...p, [t.key]: e.target.value }))}
                  />
                  <div className="flex items-center justify-between gap-3 mt-2 flex-wrap">
                    <p className="text-xs text-gray-400">
                      {value.length} characters · costs <span className="font-semibold text-gray-600">{segs} credit{segs === 1 ? '' : 's'}</span> per message
                    </p>
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
              <table className="w-full text-sm min-w-[640px]">
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
                    return (
                      <tr key={m.id} className="border-t border-gray-100">
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{new Date(m.createdAt).toLocaleString()}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{m.to}</td>
                        <td className="px-4 py-3 text-gray-500 max-w-[280px] truncate" title={m.body}>{m.body}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{m.credits_used}</td>
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
    </AppLayout>
  );
}
