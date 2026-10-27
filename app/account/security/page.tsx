'use client';
import { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import AppLayout from '@/components/layout/AppLayout';
import { useAuth, type TwoFactorMethod } from '@/lib/auth';
import api from '@/lib/api';
import { toast, ConfirmDialog } from '@/components/ui';
import {
  ShieldCheck, ShieldAlert, Smartphone, MessageSquare, Mail, Copy, Download, LogOut,
  KeyRound, Check, Lock, History, CheckCircle2, XCircle,
} from 'lucide-react';

type Step = 'choose' | 'scan' | 'verify' | 'codes';

interface Status {
  enabled: boolean;
  method: TwoFactorMethod | null;
  destination: string | null;
  recovery_left: number;
  email: string;
  suggested_phone: string | null;
  last_login_at: string | null;
}

interface Activity { _id: string; action: string; description: string; device?: string; ip?: string; status: 'success' | 'failed'; createdAt: string }

const METHODS: { id: TwoFactorMethod; title: string; blurb: string; icon: typeof Smartphone; tag?: string }[] = [
  { id: 'totp', title: 'Authenticator app', blurb: 'Google Authenticator, Microsoft Authenticator or Authy. Works without signal.', icon: Smartphone, tag: 'Most secure' },
  { id: 'sms', title: 'Text message', blurb: 'A 6-digit code is texted to your phone each time you sign in.', icon: MessageSquare },
  { id: 'email', title: 'Email', blurb: 'A 6-digit code is sent to your email address each time you sign in.', icon: Mail },
];
const methodInfo = (m: TwoFactorMethod | null) => METHODS.find(x => x.id === m) || METHODS[0];

const ACTIVITY_LABEL: Record<string, string> = {
  LOGIN: 'Signed in',
  LOGIN_FAILED: 'Failed sign-in',
  TWO_FACTOR_ON: 'Two-factor turned on',
  TWO_FACTOR_OFF: 'Two-factor turned off',
  CHANGE_PASSWORD: 'Password changed',
  RESET_PASSWORD: 'Password reset',
  LOGOUT_ALL: 'Signed out everywhere',
};

const when = (d?: string | null) => d ? new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';
const codeInput = 'form-input max-w-[200px] text-center text-lg tracking-[0.3em] font-bold';
const primary = 'btn-primary !bg-[#0D3B6E] hover:!bg-[#0a2f58]';
const card = 'bg-white rounded-xl border border-gray-100 shadow-sm p-5';

export default function SecurityPage() {
  const { user, refreshUser, logout } = useAuth();

  const [status, setStatus] = useState<Status | null>(null);
  const [activity, setActivity] = useState<Activity[] | null>(null);
  const enabled = status ? status.enabled : !!user?.twofa_enabled;

  const load = useCallback(async () => {
    const [s, a] = await Promise.allSettled([api.get('/auth/2fa/status'), api.get('/auth/activity')]);
    if (s.status === 'fulfilled') setStatus(s.value.data.data);
    setActivity(a.status === 'fulfilled' ? a.value.data.data || [] : []);
  }, []);
  useEffect(() => { load(); }, [load]);

  /* ── turning on ── */
  const [step, setStep] = useState<Step>('choose');
  const [method, setMethod] = useState<TwoFactorMethod>('totp');
  const [phone, setPhone] = useState('');
  const [secret, setSecret] = useState('');
  const [otpauth, setOtpauth] = useState('');
  const [qr, setQr] = useState('');
  const [destination, setDestination] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [recovery, setRecovery] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => { if (status?.suggested_phone && !phone) setPhone(status.suggested_phone); }, [status, phone]);

  // Draw the QR for the setup link as soon as the server hands it over.
  useEffect(() => {
    if (!otpauth) { setQr(''); return; }
    QRCode.toDataURL(otpauth, { margin: 1, width: 220 }).then(setQr).catch(() => setQr(''));
  }, [otpauth]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const start = async () => {
    setBusy(true);
    try {
      const r = await api.post('/auth/2fa/setup', { method, ...(method === 'sms' && { phone }) });
      const d = r.data.data;
      setCode('');
      if (method === 'totp') {
        setSecret(d.secret); setOtpauth(d.otpauth_url); setStep('scan');
      } else {
        setDestination(d.destination); setCooldown(d.resend_in || 30); setStep('verify');
        toast.success(r.data.message || 'Code sent');
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not start setup');
      if (e.response?.data?.data?.resend_in) setCooldown(e.response.data.data.resend_in);
    } finally { setBusy(false); }
  };

  const confirm = async () => {
    setBusy(true);
    try {
      const r = await api.post('/auth/2fa/enable', { code });
      setRecovery(r.data.data.recovery_codes || []);
      setSaved(false);
      setStep('codes');
      setOtpauth(''); setSecret('');
      await Promise.all([refreshUser(true), load()]);
    } catch (e: any) { toast.error(e.response?.data?.message || 'That code is not right'); }
    finally { setBusy(false); }
  };

  const cancelSetup = () => { setStep('choose'); setOtpauth(''); setSecret(''); setCode(''); };

  /* ── turning off ── */
  const [disabling, setDisabling] = useState(false);
  const [offPassword, setOffPassword] = useState('');
  const [offCode, setOffCode] = useState('');
  const [offRecovery, setOffRecovery] = useState(false);
  const [offCooldown, setOffCooldown] = useState(0);
  useEffect(() => {
    if (offCooldown <= 0) return;
    const t = setTimeout(() => setOffCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [offCooldown]);

  const sendOffCode = async () => {
    try {
      const r = await api.post('/auth/2fa/send-code');
      toast.success(r.data.message || 'Code sent');
      setOffCooldown(r.data.data?.resend_in || 30);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not send a code');
      if (e.response?.data?.data?.resend_in) setOffCooldown(e.response.data.data.resend_in);
    }
  };

  const closeOff = () => { setDisabling(false); setOffPassword(''); setOffCode(''); setOffRecovery(false); };

  const turnOff = async () => {
    setBusy(true);
    try {
      await api.post('/auth/2fa/disable', { password: offPassword, ...(offRecovery ? { recovery_code: offCode } : { code: offCode }) });
      toast.success('Two-factor sign-in is off');
      closeOff();
      setStep('choose');
      await Promise.all([refreshUser(true), load()]);
    } catch (e: any) { toast.error(e.response?.data?.message || 'Could not turn it off'); }
    finally { setBusy(false); }
  };

  /* ── password ── */
  const [pw, setPw] = useState({ current: '', next: '', again: '' });
  const [pwBusy, setPwBusy] = useState(false);
  const pwMismatch = !!pw.again && pw.next !== pw.again;
  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.next !== pw.again) return;
    setPwBusy(true);
    try {
      await api.post('/auth/change-password', { current_password: pw.current, new_password: pw.next });
      // Changing the password signs every device out, this one included.
      toast.success('Password changed. Please sign in with your new password.');
      logout();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Could not change the password'); }
    finally { setPwBusy(false); }
  };

  /* ── sessions ── */
  const [confirmAll, setConfirmAll] = useState(false);
  const signOutEverywhere = async () => {
    try {
      await api.post('/auth/logout-all');
      toast.success('Signed out of all devices');
      logout();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Could not sign out'); }
  };

  const copyCodes = () => { navigator.clipboard?.writeText(recovery.join('\n')); toast.success('Recovery codes copied'); };
  const downloadCodes = () => {
    const blob = new Blob([`GEMS recovery codes for ${user?.email}\nEach code works once.\n\n${recovery.join('\n')}\n`], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'gems-recovery-codes.txt'; a.click();
  };

  const isSensitiveRole = ['business_owner', 'accountant'].includes(user?.role || '');
  const current = methodInfo(status?.method || null);
  const CurrentIcon = current.icon;
  const offCodeOk = offRecovery ? offCode.replace(/[^A-Z0-9]/gi, '').length >= 10 : offCode.length === 6;

  return (
    <AppLayout title="Account security" subtitle="Protect your sign-in">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">

        <div className="lg:col-span-2 space-y-4 min-w-0">
        {/* ── Two-factor ── */}
        <section className={card}>
          <div className="flex items-start gap-4">
            <span className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${enabled ? 'bg-[#0D3B6E] text-white' : 'bg-gray-100 text-gray-500'}`}>
              {enabled ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-bold text-gray-900">Two-factor sign-in</h2>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{enabled ? 'On' : 'Off'}</span>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                {enabled
                  ? 'After your password, GEMS asks for a 6-digit code — so a stolen password alone cannot open your account.'
                  : 'Add a second step after your password. Choose how you want to get your code.'}
              </p>
              {!enabled && isSensitiveRole && step === 'choose' && (
                <p className="text-xs text-amber-700 mt-2">Recommended for your role: this account can see and move money.</p>
              )}
            </div>
          </div>

          {/* Off: choose a method */}
          {!enabled && step === 'choose' && (
            <div className="mt-5">
              <div role="radiogroup" aria-label="Two-factor method" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {METHODS.map(m => {
                  const Icon = m.icon; const on = method === m.id;
                  return (
                    <button key={m.id} type="button" role="radio" aria-checked={on} onClick={() => setMethod(m.id)}
                      className={`text-left rounded-xl border p-4 transition-colors ${on ? 'border-[#0D3B6E] bg-[#0D3B6E]/[0.04] ring-1 ring-[#0D3B6E]' : 'border-gray-200 hover:border-gray-300'}`}>
                      <div className="flex items-center justify-between">
                        <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${on ? 'bg-[#0D3B6E] text-white' : 'bg-gray-100 text-gray-500'}`}><Icon className="w-4 h-4" /></span>
                        <span className={`w-4 h-4 rounded-full border-2 ${on ? 'border-[#0D3B6E] bg-[#0D3B6E] shadow-[inset_0_0_0_2px_white]' : 'border-gray-300'}`} />
                      </div>
                      <div className="mt-3 font-semibold text-sm text-gray-900 flex items-center gap-2">
                        {m.title}
                        {m.tag && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">{m.tag}</span>}
                      </div>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">{m.blurb}</p>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 rounded-xl bg-gray-50 border border-gray-100 p-4 flex flex-col sm:flex-row sm:items-end gap-3">
                {method === 'sms' && (
                  <div className="flex-1 max-w-sm">
                    <label htmlFor="twofa-phone" className="text-xs font-semibold text-gray-600">Phone number</label>
                    <input id="twofa-phone" className="form-input mt-1" type="tel" inputMode="tel" placeholder="024 123 4567" value={phone} onChange={e => setPhone(e.target.value)} />
                    <p className="text-[11px] text-gray-400 mt-1">Ghana numbers can start with 0. Include the country code for other countries.</p>
                  </div>
                )}
                {method === 'email' && (
                  <p className="flex-1 text-sm text-gray-600">Codes will go to <span className="font-semibold text-gray-900">{status?.email || user?.email}</span>.</p>
                )}
                {method === 'totp' && (
                  <p className="flex-1 text-sm text-gray-600">You will scan a QR code with the app on your phone.</p>
                )}
                <button className={primary} onClick={start} disabled={busy || (method === 'sms' && phone.replace(/\D/g, '').length < 9) || (method !== 'totp' && cooldown > 0)}>
                  {busy ? 'Starting…' : method === 'totp' ? 'Set up app' : cooldown > 0 ? `Send code (${cooldown}s)` : 'Send code'}
                </button>
              </div>
            </div>
          )}

          {/* Authenticator: scan */}
          {step === 'scan' && (
            <div className="mt-5 pt-5 border-t border-gray-100 grid sm:grid-cols-[220px_1fr] gap-5">
              <div className="w-[220px] h-[220px] rounded-xl border border-gray-200 bg-white flex items-center justify-center">
                {qr ? <img src={qr} alt="QR code to scan with your authenticator app" width={220} height={220} /> : <span className="text-xs text-gray-400">Preparing…</span>}
              </div>
              <div className="space-y-3">
                <ol className="text-sm text-gray-600 space-y-1.5 list-decimal pl-4">
                  <li>Open an authenticator app (Google Authenticator, Microsoft Authenticator, Authy…).</li>
                  <li>Scan this code, or choose “enter a key” and type the one below.</li>
                  <li>Type the 6-digit code the app shows, then press Confirm.</li>
                </ol>
                <div className="text-xs text-gray-400">Key</div>
                <code className="block text-xs bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 break-all select-all">{secret}</code>
                <input className={codeInput} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} />
                <div className="flex gap-2">
                  <button className="btn-secondary" onClick={cancelSetup}>Cancel</button>
                  <button className={primary} onClick={confirm} disabled={busy || code.length < 6}>{busy ? 'Checking…' : 'Confirm'}</button>
                </div>
              </div>
            </div>
          )}

          {/* Text / email: enter the code sent */}
          {step === 'verify' && (
            <div className="mt-5 pt-5 border-t border-gray-100 space-y-3">
              <p className="text-sm text-gray-600">
                We sent a 6-digit code by {method === 'sms' ? 'text message' : 'email'} to <span className="font-semibold text-gray-900">{destination}</span>. Enter it below to finish.
              </p>
              <input className={codeInput} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} />
              <div className="flex flex-wrap items-center gap-2">
                <button className="btn-secondary" onClick={cancelSetup}>Cancel</button>
                <button className={primary} onClick={confirm} disabled={busy || code.length < 6}>{busy ? 'Checking…' : 'Confirm'}</button>
                <button type="button" className="text-sm font-semibold text-[#0D3B6E] hover:underline disabled:text-gray-400 disabled:no-underline ml-1" onClick={start} disabled={busy || cooldown > 0}>
                  {cooldown > 0 ? `Send again in ${cooldown}s` : 'Send a new code'}
                </button>
              </div>
            </div>
          )}

          {/* Recovery codes */}
          {step === 'codes' && (
            <div className="mt-5 pt-5 border-t border-gray-100">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900"><KeyRound className="w-4 h-4" /> Save your recovery codes</div>
              <p className="text-sm text-gray-500 mt-1">If you lose your phone or cannot get a code, each of these signs you in once. They are shown only now — keep them somewhere safe, apart from your password.</p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3">
                {recovery.map(c => <code key={c} className="text-sm font-mono bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-center select-all">{c}</code>)}
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <button className="btn-secondary" onClick={copyCodes}><Copy className="w-4 h-4" /> Copy</button>
                <button className="btn-secondary" onClick={downloadCodes}><Download className="w-4 h-4" /> Download</button>
              </div>
              <label className="flex items-center gap-2 mt-4 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" className="w-4 h-4" checked={saved} onChange={e => setSaved(e.target.checked)} /> I have saved these codes
              </label>
              <button className={`${primary} mt-3`} disabled={!saved} onClick={() => { setStep('choose'); setRecovery([]); toast.success('Two-factor sign-in is on'); }}>
                <Check className="w-4 h-4" /> Done
              </button>
            </div>
          )}

          {/* On: the method in use */}
          {enabled && step !== 'codes' && (
            <div className="mt-5 pt-5 border-t border-gray-100">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 sm:col-span-2 flex items-center gap-3">
                  <span className="w-9 h-9 rounded-lg bg-[#0D3B6E] text-white flex items-center justify-center flex-shrink-0"><CurrentIcon className="w-4 h-4" /></span>
                  <div className="min-w-0">
                    <div className="text-xs text-gray-500">Method</div>
                    <div className="font-semibold text-sm text-gray-900">{current.title}{status?.destination ? <span className="font-normal text-gray-500"> · {status.destination}</span> : null}</div>
                  </div>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <div className="text-xs text-gray-500">Recovery codes left</div>
                  <div className={`font-semibold text-sm ${status && status.recovery_left <= 2 ? 'text-amber-700' : 'text-gray-900'}`}>{status ? `${status.recovery_left} of 10` : '—'}</div>
                </div>
              </div>

              {!disabling ? (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button className="btn-secondary" onClick={() => setDisabling(true)}>Turn off</button>
                  <span className="text-xs text-gray-400">To use a different method, turn it off and choose again.</span>
                </div>
              ) : (
                <div className="mt-4 grid sm:grid-cols-2 gap-3 max-w-2xl">
                  <p className="sm:col-span-2 text-sm text-gray-600">
                    Confirm with your password and {offRecovery ? 'one of your recovery codes' : status?.method === 'totp' ? 'a code from your app' : `a code we send by ${status?.method === 'sms' ? 'text' : 'email'}`}.
                  </p>
                  <input type="password" className="form-input" placeholder="Your password" autoComplete="current-password" value={offPassword} onChange={e => setOffPassword(e.target.value)} />
                  <div className="flex gap-2">
                    <input className="form-input flex-1" inputMode={offRecovery ? 'text' : 'numeric'} maxLength={offRecovery ? 12 : 6} placeholder={offRecovery ? 'XXXXX-XXXXX' : '6-digit code'}
                      value={offCode} onChange={e => setOffCode(offRecovery ? e.target.value.toUpperCase() : e.target.value.replace(/\D/g, ''))} />
                    {!offRecovery && status?.method !== 'totp' && (
                      <button type="button" className="btn-secondary whitespace-nowrap" onClick={sendOffCode} disabled={offCooldown > 0}>{offCooldown > 0 ? `${offCooldown}s` : 'Send code'}</button>
                    )}
                  </div>
                  <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
                    <button className="btn-secondary" onClick={closeOff}>Cancel</button>
                    <button className="btn-danger" onClick={turnOff} disabled={busy || !offPassword || !offCodeOk}>{busy ? 'Turning off…' : 'Turn off two-factor'}</button>
                    <button type="button" className="text-sm font-semibold text-[#0D3B6E] hover:underline ml-1" onClick={() => { setOffRecovery(v => !v); setOffCode(''); }}>
                      {offRecovery ? 'Use a code instead' : 'Use a recovery code'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── Activity ── */}
        <section className={`${card} !p-0 overflow-hidden`}>
          <div className="px-5 py-4 flex items-center gap-2 border-b border-gray-100">
            <History className="w-4 h-4 text-gray-500" /><h2 className="font-bold text-gray-900">Recent sign-in activity</h2>
            <span className="text-xs text-gray-400 ml-auto hidden sm:inline">Don&apos;t recognise something? Change your password and sign out of all devices.</span>
          </div>
          {activity === null ? (
            <div className="px-5 py-6 text-sm text-gray-400">Loading…</div>
          ) : activity.length === 0 ? (
            <div className="px-5 py-6 text-sm text-gray-400">No activity yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500">
                  <tr>
                    <th className="text-left font-semibold px-5 py-2.5">Event</th>
                    <th className="text-left font-semibold px-5 py-2.5">Device</th>
                    <th className="text-left font-semibold px-5 py-2.5">IP address</th>
                    <th className="text-left font-semibold px-5 py-2.5">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {activity.map(a => (
                    <tr key={a._id}>
                      <td className="px-5 py-2.5">
                        <span className="inline-flex items-center gap-2">
                          {a.status === 'failed' ? <XCircle className="w-4 h-4 text-red-500" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                          <span className={a.status === 'failed' ? 'text-red-700 font-medium' : 'text-gray-900'}>{ACTIVITY_LABEL[a.action] || a.description}</span>
                        </span>
                      </td>
                      <td className="px-5 py-2.5 text-gray-600 whitespace-nowrap">{a.device || '—'}</td>
                      <td className="px-5 py-2.5 text-gray-500 font-mono text-xs">{a.ip || '—'}</td>
                      <td className="px-5 py-2.5 text-gray-500 whitespace-nowrap">{when(a.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        </div>

        {/* ── Right column ── */}
        <div className="space-y-4">
          <section className={card}>
            <h2 className="font-bold text-gray-900">Your account</h2>
            <dl className="mt-3 space-y-2.5 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-gray-500">Email</dt><dd className="font-medium text-gray-900 truncate">{user?.email}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-gray-500">Last sign-in</dt><dd className="font-medium text-gray-900">{when(status?.last_login_at)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-gray-500">Two-factor</dt><dd className={`font-medium ${enabled ? 'text-emerald-700' : 'text-gray-500'}`}>{enabled ? current.title : 'Off'}</dd></div>
            </dl>
          </section>

          <section className={card}>
            <div className="flex items-center gap-2"><Lock className="w-4 h-4 text-gray-500" /><h2 className="font-bold text-gray-900">Change password</h2></div>
            <form onSubmit={changePassword} className="mt-3 space-y-2.5">
              <input type="password" className="form-input" placeholder="Current password" autoComplete="current-password" value={pw.current} onChange={e => setPw(p => ({ ...p, current: e.target.value }))} />
              <input type="password" className="form-input" placeholder="New password" autoComplete="new-password" value={pw.next} onChange={e => setPw(p => ({ ...p, next: e.target.value }))} />
              <input type="password" className="form-input" placeholder="Repeat new password" autoComplete="new-password" value={pw.again} onChange={e => setPw(p => ({ ...p, again: e.target.value }))} />
              <p className={`text-[11px] ${pwMismatch ? 'text-red-600' : 'text-gray-400'}`}>
                {pwMismatch ? 'The new passwords do not match.' : 'At least 8 characters, with a capital letter, a number and a symbol. You will be signed out everywhere.'}
              </p>
              <button type="submit" className={`${primary} w-full justify-center`} disabled={pwBusy || !pw.current || !pw.next || pw.next !== pw.again}>
                {pwBusy ? 'Saving…' : 'Change password'}
              </button>
            </form>
          </section>

          <section className={card}>
            <div className="flex items-center gap-2"><LogOut className="w-4 h-4 text-gray-500" /><h2 className="font-bold text-gray-900">Signed-in devices</h2></div>
            <p className="text-sm text-gray-500 mt-1">Lost a phone or used a shared computer? Sign out everywhere, including here, then sign back in.</p>
            <button className="btn-secondary mt-3 w-full justify-center" onClick={() => setConfirmAll(true)}>Sign out of all devices</button>
          </section>
        </div>

      </div>

      <ConfirmDialog open={confirmAll} onClose={() => setConfirmAll(false)} onConfirm={signOutEverywhere}
        title="Sign out of all devices?" message="Every device signed in to your account, including this one, will be signed out." />
    </AppLayout>
  );
}
