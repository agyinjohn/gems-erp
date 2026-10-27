'use client';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import AppLayout from '@/components/layout/AppLayout';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import { toast, ConfirmDialog } from '@/components/ui';
import { ShieldCheck, ShieldAlert, Smartphone, Copy, Download, LogOut, KeyRound, Check } from 'lucide-react';

type Step = 'idle' | 'scan' | 'codes';

export default function SecurityPage() {
  const { user, refreshUser, logout } = useAuth();
  const enabled = !!user?.twofa_enabled;

  const [step, setStep] = useState<Step>('idle');
  const [secret, setSecret] = useState('');
  const [qr, setQr] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [recovery, setRecovery] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  const [disabling, setDisabling] = useState(false);
  const [offPassword, setOffPassword] = useState('');
  const [offCode, setOffCode] = useState('');
  const [confirmAll, setConfirmAll] = useState(false);

  // Draw the QR for the setup link as soon as the server hands it over.
  const [otpauth, setOtpauth] = useState('');
  useEffect(() => {
    if (!otpauth) { setQr(''); return; }
    QRCode.toDataURL(otpauth, { margin: 1, width: 220 }).then(setQr).catch(() => setQr(''));
  }, [otpauth]);

  const start = async () => {
    setBusy(true);
    try {
      const r = await api.post('/auth/2fa/setup');
      setSecret(r.data.data.secret);
      setOtpauth(r.data.data.otpauth_url);
      setCode('');
      setStep('scan');
    } catch (e: any) { toast.error(e.response?.data?.message || 'Could not start setup'); }
    finally { setBusy(false); }
  };

  const confirm = async () => {
    setBusy(true);
    try {
      const r = await api.post('/auth/2fa/enable', { code });
      setRecovery(r.data.data.recovery_codes || []);
      setSaved(false);
      setStep('codes');
      setOtpauth(''); setSecret('');
      await refreshUser(true);
    } catch (e: any) { toast.error(e.response?.data?.message || 'That code is not right'); }
    finally { setBusy(false); }
  };

  const turnOff = async () => {
    setBusy(true);
    try {
      await api.post('/auth/2fa/disable', { password: offPassword, code: offCode });
      toast.success('Two-factor sign-in is off');
      setDisabling(false); setOffPassword(''); setOffCode('');
      await refreshUser(true);
    } catch (e: any) { toast.error(e.response?.data?.message || 'Could not turn it off'); }
    finally { setBusy(false); }
  };

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

  return (
    <AppLayout title="Account security" subtitle="Protect your sign-in">
      <div className="max-w-2xl space-y-4">

        {/* Two-factor */}
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-start gap-4">
            <span className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${enabled ? 'bg-[#0D3B6E] text-white' : 'bg-gray-100 text-gray-500'}`}>
              {enabled ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
            </span>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-gray-900">Two-factor sign-in</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {enabled
                  ? 'On. After your password, GEMS asks for a 6-digit code from your authenticator app.'
                  : 'Off. Adding a code from an authenticator app means a stolen password alone cannot open your account.'}
              </p>
              {!enabled && isSensitiveRole && step === 'idle' && (
                <p className="text-xs text-amber-700 mt-2">Recommended for your role: this account can see and move money.</p>
              )}

              {step === 'idle' && !enabled && (
                <button className="btn-primary !bg-[#0D3B6E] hover:!bg-[#0a2f58] mt-4" onClick={start} disabled={busy}>
                  <Smartphone className="w-4 h-4" /> {busy ? 'Starting…' : 'Turn on'}
                </button>
              )}

              {step === 'idle' && enabled && !disabling && (
                <button className="btn-secondary mt-4" onClick={() => setDisabling(true)}>Turn off</button>
              )}

              {disabling && (
                <div className="mt-4 space-y-3 max-w-sm">
                  <p className="text-sm text-gray-600">Confirm with your password and a current code.</p>
                  <input type="password" className="form-input" placeholder="Your password" autoComplete="current-password" value={offPassword} onChange={e => setOffPassword(e.target.value)} />
                  <input className="form-input" inputMode="numeric" maxLength={6} placeholder="6-digit code" value={offCode} onChange={e => setOffCode(e.target.value.replace(/\D/g, ''))} />
                  <div className="flex gap-2">
                    <button className="btn-secondary" onClick={() => { setDisabling(false); setOffPassword(''); setOffCode(''); }}>Cancel</button>
                    <button className="btn-danger" onClick={turnOff} disabled={busy || !offPassword || offCode.length < 6}>{busy ? 'Turning off…' : 'Turn off two-factor'}</button>
                  </div>
                </div>
              )}
            </div>
          </div>

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
                <input className="form-input max-w-[200px] text-center text-lg tracking-[0.3em] font-bold" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} />
                <div className="flex gap-2">
                  <button className="btn-secondary" onClick={() => { setStep('idle'); setOtpauth(''); setSecret(''); }}>Cancel</button>
                  <button className="btn-primary !bg-[#0D3B6E] hover:!bg-[#0a2f58]" onClick={confirm} disabled={busy || code.length < 6}>{busy ? 'Checking…' : 'Confirm'}</button>
                </div>
              </div>
            </div>
          )}

          {step === 'codes' && (
            <div className="mt-5 pt-5 border-t border-gray-100">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900"><KeyRound className="w-4 h-4" /> Save your recovery codes</div>
              <p className="text-sm text-gray-500 mt-1">If you lose your phone, each of these signs you in once. They are shown only now — keep them somewhere safe, apart from your password.</p>
              <div className="grid grid-cols-2 gap-2 mt-3 max-w-sm">
                {recovery.map(c => <code key={c} className="text-sm font-mono bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-center select-all">{c}</code>)}
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <button className="btn-secondary" onClick={copyCodes}><Copy className="w-4 h-4" /> Copy</button>
                <button className="btn-secondary" onClick={downloadCodes}><Download className="w-4 h-4" /> Download</button>
              </div>
              <label className="flex items-center gap-2 mt-4 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" className="w-4 h-4" checked={saved} onChange={e => setSaved(e.target.checked)} /> I have saved these codes
              </label>
              <button className="btn-primary !bg-[#0D3B6E] hover:!bg-[#0a2f58] mt-3" disabled={!saved} onClick={() => { setStep('idle'); setRecovery([]); toast.success('Two-factor sign-in is on'); }}>
                <Check className="w-4 h-4" /> Done
              </button>
            </div>
          )}
        </section>

        {/* Sessions */}
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
          <span className="w-11 h-11 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center flex-shrink-0"><LogOut className="w-5 h-5" /></span>
          <div className="flex-1">
            <h2 className="font-bold text-gray-900">Signed-in devices</h2>
            <p className="text-sm text-gray-500 mt-0.5">Lost a phone or used a shared computer? Sign out everywhere, including here, then sign back in.</p>
            <button className="btn-secondary mt-3" onClick={() => setConfirmAll(true)}>Sign out of all devices</button>
          </div>
        </section>
      </div>

      <ConfirmDialog open={confirmAll} onClose={() => setConfirmAll(false)} onConfirm={signOutEverywhere}
        title="Sign out of all devices?" message="Every device signed in to your account, including this one, will be signed out." />
    </AppLayout>
  );
}
