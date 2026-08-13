'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { toast, ConfirmDialog } from '@/components/ui';
import {
  Mail, RefreshCw, CheckCircle, XCircle, AlertCircle, Ban, Save, RotateCcw,
  Send, ShieldCheck, Eye, EyeOff, KeyRound, ExternalLink, ChevronDown,
} from 'lucide-react';

/**
 * Email, sent as the business rather than as GEMS.
 *
 * The business supplies the mailbox it already has — a Gmail, a Workspace
 * account, whatever came with the domain — and everything the app sends a
 * client goes through it. That is not an implementation detail worth hiding: a
 * quote that arrives from someone else's address lands in spam, and a customer
 * who hits reply has to reach the shop.
 *
 * So this page is arranged as the three questions in order: can we send at all,
 * what do the messages say, and what actually went out.
 */

interface Preset {
  key: string; label: string; host: string; port: number; secure: boolean;
  note: string;
  username_hint: string;
  needs_app_password: boolean;
  help_url: string;
  steps: string[];
  caveat: string;
}

interface Settings {
  enabled: boolean;
  from_name: string;
  from_email: string;
  reply_to: string;
  smtp: { host: string; port: number; secure: boolean; username: string; password_set: boolean };
  configured: boolean;
  missing: string[];
  verified_at: string | null;
  last_error: string;
  sends: number;
  failures: number;
  presets: Preset[];
  preview_from: string;
}

interface Template {
  key: string; group: string; label: string; description: string;
  variables: string[];
  subject: string; body: string;
  default_subject: string; default_body: string;
  enabled: boolean; customised: boolean;
}

interface Message {
  id: string; to: string; subject: string; body: string; status: string;
  error?: string; template_key?: string; createdAt: string;
}

type ApiError = { response?: { data?: { message?: string } } };
const reason = (e: unknown, fallback: string) =>
  (e as ApiError)?.response?.data?.message || fallback;

const STATUS_STYLES: Record<string, { badge: string; icon: typeof CheckCircle; label: string }> = {
  sent:           { badge: 'bg-green-50 text-green-700', icon: CheckCircle, label: 'Sent' },
  failed:         { badge: 'bg-red-50 text-red-600',     icon: XCircle,     label: 'Failed' },
  not_configured: { badge: 'bg-amber-50 text-amber-700', icon: AlertCircle, label: 'Not set up' },
  disabled:       { badge: 'bg-gray-100 text-gray-500',  icon: Ban,         label: 'Off' },
};

function fmtDate(iso: string) {
  const d = new Date(iso);
  const isToday = d.toDateString() === new Date().toDateString();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return isToday ? `Today ${time}` : `${d.toLocaleDateString([], { day: 'numeric', month: 'short' })} ${time}`;
}

function Toggle({ on, onChange, disabled }: { on: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button" role="switch" aria-checked={on} disabled={disabled} onClick={onChange}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${on ? 'bg-[#0D3B6E]' : 'bg-gray-300'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

const BLANK_FORM = {
  from_name: '', from_email: '', reply_to: '',
  host: '', port: '587', secure: false, username: '', password: '',
};

export default function EmailPanel() {
  const { user } = useAuth();
  const isOwner = user?.role === 'business_owner' || user?.role === 'platform_admin';

  const [settings, setSettings] = useState<Settings | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({ ...BLANK_FORM });
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const [edited, setEdited] = useState<Record<string, { subject?: string; body?: string }>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [expandedMsg, setExpandedMsg] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; message: string; run: () => void } | null>(null);

  const [compose, setCompose] = useState({ to: '', subject: '', body: '' });
  const [sending, setSending] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, t, m] = await Promise.all([
        api.get('/email/settings'),
        api.get('/email/templates'),
        api.get('/email/messages').catch(() => ({ data: { data: [] } })),
      ]);
      const data: Settings = s.data.data;
      setSettings(data);
      setTemplates(t.data.data || []);
      setMessages(m.data.data || []);
      setForm({
        from_name: data.from_name, from_email: data.from_email, reply_to: data.reply_to,
        host: data.smtp.host, port: String(data.smtp.port || 587),
        secure: data.smtp.secure, username: data.smtp.username,
        password: '',
      });
    } catch (e) {
      toast.error(reason(e, 'Could not load the email settings'));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load]);

  const [presetKey, setPresetKey] = useState<string>('');

  const applyPreset = (preset: Preset) => {
    setPresetKey(preset.key);
    // Whoever just picked their provider is about to need the instructions.
    setShowSteps(true);
    setForm(f => ({
      ...f,
      host: preset.host || f.host,
      port: String(preset.port),
      secure: preset.secure,
      // Nearly every provider wants the full address, and the one that doesn't
      // is easier to correct than to guess.
      username: f.username || f.from_email,
    }));
  };

  /**
   * Which provider's instructions to show. What was just clicked if anything,
   * otherwise whatever the saved server matches — somebody coming back to a
   * half-finished setup should not have to remember what they chose.
   */
  const presets = settings?.presets || [];
  const chosen = presets.find(p => p.key === presetKey)
    || presets.find(p => p.host && p.host === form.host)
    || null;

  const save = async () => {
    setSaving(true);
    try {
      const r = await api.put('/email/settings', {
        from_name: form.from_name,
        from_email: form.from_email,
        reply_to: form.reply_to,
        smtp: {
          host: form.host,
          port: Number(form.port) || 587,
          secure: form.secure,
          username: form.username,
          // Blank means "keep the one you have" — saving the form must not wipe
          // a working mailbox.
          ...(form.password ? { password: form.password } : {}),
        },
      });
      setSettings(r.data.data);
      setForm(f => ({ ...f, password: '' }));
      toast.success('Saved');
    } catch (e) {
      toast.error(reason(e, 'Could not save'));
    } finally { setSaving(false); }
  };

  const verify = async () => {
    setVerifying(true);
    try {
      await api.post('/email/verify');
      toast.success('The mailbox answered. Email is ready to send.');
      load();
    } catch (e) {
      toast.error(reason(e, 'The mailbox did not answer'));
      load();
    } finally { setVerifying(false); }
  };

  const toggleChannel = async () => {
    if (!settings) return;
    try {
      const r = await api.put('/email/settings', { enabled: !settings.enabled });
      setSettings(r.data.data);
    } catch (e) { toast.error(reason(e, 'Could not update')); }
  };

  const saveTemplate = async (t: Template) => {
    const change = edited[t.key];
    if (!change) return;
    setSavingKey(t.key);
    try {
      const r = await api.put(`/email/templates/${t.key}`, {
        subject: change.subject ?? t.subject,
        body: change.body ?? t.body,
      });
      setTemplates(ts => ts.map(x => (x.key === t.key ? r.data.data : x)));
      setEdited(e => { const next = { ...e }; delete next[t.key]; return next; });
      toast.success('Saved');
    } catch (e) {
      toast.error(reason(e, 'Could not save'));
    } finally { setSavingKey(null); }
  };

  const toggleTemplate = async (t: Template) => {
    try {
      const r = await api.put(`/email/templates/${t.key}`, { enabled: !t.enabled });
      setTemplates(ts => ts.map(x => (x.key === t.key ? r.data.data : x)));
    } catch (e) { toast.error(reason(e, 'Could not update')); }
  };

  const resetTemplate = (t: Template) => setConfirm({
    title: `Reset ${t.label}?`,
    message: 'Your wording is replaced with the one GEMS ships. This cannot be undone.',
    run: async () => {
      try {
        const r = await api.post(`/email/templates/${t.key}/reset`);
        setTemplates(ts => ts.map(x => (x.key === t.key ? r.data.data : x)));
        setEdited(e => { const next = { ...e }; delete next[t.key]; return next; });
      } catch (e) { toast.error(reason(e, 'Could not reset')); }
    },
  });

  const sendOne = async () => {
    if (!compose.to || !compose.subject.trim() || !compose.body.trim()) {
      toast.error('A recipient, a subject and a message are all required');
      return;
    }
    setSending(true);
    try {
      await api.post('/email/send', compose);
      toast.success('Sent');
      setCompose({ to: '', subject: '', body: '' });
      load();
    } catch (e) {
      toast.error(reason(e, 'Could not send'));
    } finally { setSending(false); }
  };

  const groups = [...new Set(templates.map(t => t.group))];
  const ready = settings?.configured && settings?.enabled;

  return (
    <>
      <div className="space-y-5">
        <div className="flex justify-end">
          <button type="button" onClick={load} className="btn-secondary" disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        {/* ── Where email stands ── */}
        <div className="card">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0D3B6E]/8 flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5 text-[#0D3B6E]" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Email</p>
                <p className="text-lg font-bold text-gray-900 leading-tight">
                  {loading && !settings ? '—'
                    : !settings?.configured ? 'Not set up yet'
                      : settings.verified_at ? 'Ready to send' : 'Set up, not yet tested'}
                </p>
                {settings?.preview_from && (
                  <p className="text-xs text-gray-400 mt-0.5">Arrives from {settings.preview_from}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div>
                <p className="text-xs text-gray-400">Sent</p>
                <p className="font-semibold text-gray-700">{(settings?.sends ?? 0).toLocaleString()}</p>
              </div>
              {(settings?.failures ?? 0) > 0 && (
                <div>
                  <p className="text-xs text-gray-400">Failed</p>
                  <p className="font-semibold text-red-600">{settings?.failures}</p>
                </div>
              )}
              {isOwner && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{settings?.enabled ? 'On' : 'Off'}</span>
                  <Toggle on={!!settings?.enabled} onChange={toggleChannel} disabled={loading} />
                </div>
              )}
            </div>
          </div>

          {!loading && settings && !settings.configured && (
            <div className="mt-4 flex items-start gap-2 bg-amber-50 text-amber-800 rounded-lg px-3 py-2.5 text-xs">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                Nothing can be emailed until this is filled in — still missing {settings.missing.join(', ')}.
                Until then, customers only hear from you by text.
              </span>
            </div>
          )}
          {settings?.last_error && (
            <div className="mt-4 flex items-start gap-2 bg-red-50 text-red-700 rounded-lg px-3 py-2.5 text-xs">
              <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                Last attempt failed: {settings.last_error}
                {/* The commonest failure by a distance, and the one nobody
                    solves without being shown where the setting lives. */}
                {isOwner && /app password/i.test(settings.last_error) && (
                  <button type="button" onClick={() => setShowSteps(true)} className="font-semibold underline ml-1">
                    Show me how to get one
                  </button>
                )}
              </span>
            </div>
          )}
        </div>

        {/* ── The mailbox ── */}
        {isOwner && (
          <div className="card space-y-4">
            <div>
              <h3 className="font-semibold text-gray-800">The mailbox email is sent from</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Your own, not ours. Mail sent from somebody else&apos;s address lands in spam, and a
                customer who replies has to reach you.
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-2">Who provides your email?</p>
              <div className="flex flex-wrap gap-1.5">
                {presets.map(p => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                      chosen?.key === p.key ? 'bg-[#0D3B6E] text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* How to get a password out of the chosen provider. The single
                thing that stops this working: somebody types the password they
                sign in with, Google refuses it, and without being told why they
                conclude the feature is broken. */}
            {chosen && (
              <div className="rounded-xl border border-[#0D3B6E]/15 bg-[#0D3B6E]/[0.04] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowSteps(v => !v)}
                  className="w-full flex items-start gap-2.5 px-3.5 py-3 text-left"
                >
                  <KeyRound className="w-4 h-4 text-[#0D3B6E] mt-0.5 flex-shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-gray-800">
                      {chosen.needs_app_password
                        ? `Getting an app password from ${chosen.label}`
                        : `Setting up ${chosen.label}`}
                    </span>
                    <span className="block text-xs text-gray-500 mt-0.5">{chosen.note}</span>
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${showSteps ? 'rotate-180' : ''}`} />
                </button>

                {showSteps && (
                  <div className="px-3.5 pb-3.5 pt-0 space-y-3">
                    <ol className="space-y-2">
                      {chosen.steps.map((step, i) => (
                        <li key={i} className="flex gap-2.5 text-xs text-gray-600 leading-relaxed">
                          <span className="w-4 h-4 rounded-full bg-[#0D3B6E] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>

                    {chosen.caveat && (
                      <p className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 rounded-lg px-2.5 py-2">
                        <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                        <span>{chosen.caveat}</span>
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3">
                      {chosen.help_url && (
                        <a
                          href={chosen.help_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0D3B6E] hover:underline"
                        >
                          Open {chosen.label} <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <span className="text-[11px] text-gray-400">
                        If those menus have moved, search their help for &ldquo;app password&rdquo; — their own page is the one that&apos;s right.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="form-label">Send from *</label>
                <input className="form-input" type="email" placeholder="orders@yourbusiness.com"
                  value={form.from_email} onChange={e => setForm(f => ({ ...f, from_email: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">Shown as</label>
                <input className="form-input" placeholder="Your business name"
                  value={form.from_name} onChange={e => setForm(f => ({ ...f, from_name: e.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <label className="form-label">Replies go to <span className="text-gray-400 font-normal">(optional)</span></label>
                <input className="form-input" type="email" placeholder="Leave blank to use the address above"
                  value={form.reply_to} onChange={e => setForm(f => ({ ...f, reply_to: e.target.value }))} />
              </div>

              <div className="sm:col-span-2 border-t border-gray-100 pt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Mail server</p>
              </div>

              <div>
                <label className="form-label">Server *</label>
                <input className="form-input" placeholder="smtp.gmail.com"
                  value={form.host} onChange={e => setForm(f => ({ ...f, host: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Port</label>
                  <input className="form-input" type="number" placeholder="587"
                    value={form.port} onChange={e => setForm(f => ({ ...f, port: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">TLS</label>
                  <div className="h-[42px] flex items-center">
                    <Toggle on={form.secure} onChange={() => setForm(f => ({ ...f, secure: !f.secure }))} />
                    <span className="ml-2 text-xs text-gray-500">{form.secure ? 'On (465)' : 'Off (587)'}</span>
                  </div>
                </div>
              </div>
              <div>
                <label className="form-label">Username *</label>
                <input className="form-input" placeholder={chosen?.username_hint || 'Usually the full email address'}
                  value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">
                  {chosen?.needs_app_password ? 'App password *' : 'Password *'}
                  {settings?.smtp.password_set && !form.password && (
                    <span className="text-gray-400 font-normal"> (one is saved — leave blank to keep it)</span>
                  )}
                </label>
                <div className="relative">
                  <input
                    className="form-input pr-10"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={settings?.smtp.password_set ? '••••••••' : 'App password'}
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {chosen?.needs_app_password
                    ? 'Not the password you sign in with — that one will be refused.'
                    : 'If the mailbox has two-step verification, this must be an app password rather than the one you sign in with.'}
                  {' '}Stored encrypted and never shown again.
                  {chosen && (
                    <button type="button" onClick={() => setShowSteps(true)} className="text-[#0D3B6E] font-semibold hover:underline ml-1">
                      Where do I find it?
                    </button>
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 justify-end">
              {settings?.verified_at && (
                <span className="text-xs text-green-700 inline-flex items-center gap-1 mr-auto">
                  <ShieldCheck className="w-3.5 h-3.5" /> Last proved working {fmtDate(settings.verified_at)}
                </span>
              )}
              <button type="button" className="btn-secondary" onClick={verify} disabled={verifying || saving}>
                <ShieldCheck className={`w-4 h-4 ${verifying ? 'animate-spin' : ''}`} /> Test the mailbox
              </button>
              <button type="button" className="btn-primary" onClick={save} disabled={saving}>
                <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )}

        {/* ── What the messages say ── */}
        <div className="card space-y-4">
          <div>
            <h3 className="font-semibold text-gray-800">What each email says</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Sent automatically when the event happens. Switch off any you would rather send yourself.
              Anything in {'{{'}braces{'}}'} is filled in when it goes out.
            </p>
          </div>

          {groups.map(group => (
            <div key={group} className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">{group}</p>
              {templates.filter(t => t.group === group).map(t => {
                const subject = edited[t.key]?.subject ?? t.subject;
                const body = edited[t.key]?.body ?? t.body;
                const dirty = !!edited[t.key];
                return (
                  <div key={t.key} className={`rounded-xl border p-3.5 ${t.enabled ? 'border-gray-200' : 'border-gray-100 bg-gray-50/60'}`}>
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800">{t.label}</p>
                        <p className="text-xs text-gray-400">{t.description}</p>
                      </div>
                      {isOwner && <Toggle on={t.enabled} onChange={() => toggleTemplate(t)} />}
                    </div>

                    <input
                      className="form-input text-sm mb-2"
                      value={subject}
                      disabled={!isOwner || !t.enabled}
                      placeholder="Subject line"
                      onChange={e => setEdited(x => ({ ...x, [t.key]: { ...x[t.key], subject: e.target.value } }))}
                    />
                    <textarea
                      className="form-input text-sm font-mono leading-relaxed"
                      rows={5}
                      value={body}
                      disabled={!isOwner || !t.enabled}
                      onChange={e => setEdited(x => ({ ...x, [t.key]: { ...x[t.key], body: e.target.value } }))}
                    />

                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <div className="flex flex-wrap gap-1 mr-auto">
                        {t.variables.map(v => (
                          <button
                            key={v}
                            type="button"
                            disabled={!isOwner || !t.enabled}
                            onClick={() => setEdited(x => ({ ...x, [t.key]: { ...x[t.key], body: `${body}${v}` } }))}
                            className="text-[10px] font-mono bg-gray-100 text-gray-500 hover:bg-gray-200 rounded px-1.5 py-0.5 disabled:opacity-50"
                          >{v}</button>
                        ))}
                      </div>
                      {isOwner && t.customised && (
                        <button type="button" onClick={() => resetTemplate(t)} className="btn-secondary !py-1 !px-2 text-xs">
                          <RotateCcw className="w-3.5 h-3.5" /> Reset
                        </button>
                      )}
                      {isOwner && dirty && (
                        <button type="button" onClick={() => saveTemplate(t)} disabled={savingKey === t.key}
                          className="btn-primary !py-1 !px-2 text-xs">
                          <Save className="w-3.5 h-3.5" /> {savingKey === t.key ? 'Saving…' : 'Save'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* ── Write to somebody ── */}
        {isOwner && (
          <div className="card space-y-3">
            <div>
              <h3 className="font-semibold text-gray-800">Send one now</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Write to a client from the business address — and the surest way to prove the mailbox works.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input className="form-input" type="email" placeholder="Their email address"
                value={compose.to} onChange={e => setCompose(c => ({ ...c, to: e.target.value }))} />
              <input className="form-input" placeholder="Subject"
                value={compose.subject} onChange={e => setCompose(c => ({ ...c, subject: e.target.value }))} />
            </div>
            <textarea className="form-input" rows={4} placeholder="Your message"
              value={compose.body} onChange={e => setCompose(c => ({ ...c, body: e.target.value }))} />
            <div className="flex justify-end">
              <button type="button" className="btn-primary" onClick={sendOne} disabled={sending || !ready}>
                <Send className="w-4 h-4" /> {sending ? 'Sending…' : 'Send'}
              </button>
            </div>
            {!ready && (
              <p className="text-xs text-amber-700 text-right">
                {settings?.enabled === false ? 'Email is switched off.' : 'Set the mailbox up first.'}
              </p>
            )}
          </div>
        )}

        {/* ── What went out ── */}
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-3">Recent emails</h3>
          {messages.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">Nothing sent yet.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {messages.map(m => {
                const style = STATUS_STYLES[m.status] || STATUS_STYLES.failed;
                const Icon = style.icon;
                const open = expandedMsg === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setExpandedMsg(open ? null : m.id)}
                    className="w-full text-left py-2.5 flex items-start gap-3 hover:bg-gray-50/60"
                  >
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${style.badge}`}>
                      <Icon className="w-3 h-3" /> {style.label}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-gray-800 truncate">{m.subject || '(no subject)'}</span>
                      <span className="block text-xs text-gray-400 truncate">{m.to}</span>
                      {open && (
                        <span className="block text-xs text-gray-600 whitespace-pre-wrap mt-1.5">{m.body}</span>
                      )}
                      {m.error && open && <span className="block text-xs text-red-600 mt-1">{m.error}</span>}
                    </span>
                    <span className="text-xs text-gray-400 flex-shrink-0">{fmtDate(m.createdAt)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => { confirm?.run(); setConfirm(null); }}
        title={confirm?.title || ''}
        message={confirm?.message || ''}
        danger
      />
    </>
  );
}
