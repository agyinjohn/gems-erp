'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import PaymentQr from '@/components/pos/PaymentQr';
import api from '@/lib/api';
import { CheckCircle2, Loader2 } from 'lucide-react';

interface DisplaySession {
  order_id: string;
  order_number: string;
  customer_name: string;
  amount: number;
  authorization_url: string;
  reference: string;
  payment_method: string;
}

type ViewState = 'idle' | 'paying' | 'success';

export default function CustomerDisplayPage() {
  const { user, loading, tenant } = useAuth();
  const router = useRouter();
  const [session, setSession] = useState<DisplaySession | null>(null);
  const [view, setView] = useState<ViewState>('idle');
  const lastOrderId = useRef<string | null>(null);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (!loading && user && !['business_owner', 'branch_manager', 'sales_staff'].includes(user.role)) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  const poll = useCallback(async () => {
    try {
      const r = await api.get('/pos/display/current');
      const data: DisplaySession | null = r.data.data;

      if (data?.authorization_url) {
        lastOrderId.current = data.order_id;
        setSession(data);
        setView('paying');
        if (successTimer.current) {
          clearTimeout(successTimer.current);
          successTimer.current = null;
        }
        return;
      }

      if (view === 'paying' && lastOrderId.current) {
        setView('success');
        setSession(null);
        successTimer.current = setTimeout(() => {
          setView('idle');
          lastOrderId.current = null;
        }, 3500);
        return;
      }

      if (view === 'idle') {
        setSession(null);
      }
    } catch {
      /* keep last view */
    }
  }, [view]);

  useEffect(() => {
    if (!user) return;
    void poll();
    const id = setInterval(() => { void poll(); }, 2000);
    return () => {
      clearInterval(id);
      if (successTimer.current) clearTimeout(successTimer.current);
    };
  }, [user, poll]);

  useEffect(() => {
    document.documentElement.requestFullscreen?.().catch(() => {});
  }, []);

  if (loading || !user) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#0D3B6E]">
        <Loader2 className="w-10 h-10 text-white animate-spin" />
      </div>
    );
  }

  const storeName = tenant?.business_name || 'Welcome';

  return (
    <div className="min-h-dvh bg-gradient-to-b from-[#0D3B6E] to-[#1A5294] flex flex-col items-center justify-center p-6 text-center select-none">
      {view === 'idle' && (
        <div>
          <p className="text-white/60 text-sm uppercase tracking-[0.25em] mb-3">Customer display</p>
          <h1 className="text-white text-3xl md:text-4xl font-extrabold mb-2">{storeName}</h1>
          <p className="text-white/70 text-lg">Scan to pay when your total appears here</p>
        </div>
      )}

      {view === 'paying' && session && (
        <div className="w-full max-w-md">
          <p className="text-white/60 text-xs uppercase tracking-widest mb-2">Amount due</p>
          <p className="text-white text-5xl md:text-6xl font-extrabold tabular-nums mb-1">
            GH₵ {Number(session.amount).toFixed(2)}
          </p>
          <p className="text-white/80 text-base mb-6">{session.customer_name}</p>

          <div className="bg-white rounded-2xl p-6 shadow-2xl inline-block">
            <PaymentQr value={session.authorization_url} size={280} />
          </div>

          <p className="text-white/90 text-lg font-medium mt-6">Scan with your phone to pay</p>
          <p className="text-white/50 text-xs mt-3 font-mono">{session.reference}</p>
        </div>
      )}

      {view === 'success' && (
        <div>
          <div className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-6 shadow-lg">
            <CheckCircle2 className="w-14 h-14 text-white" />
          </div>
          <p className="text-white text-3xl font-extrabold">Payment received</p>
          <p className="text-white/70 text-lg mt-2">Thank you!</p>
        </div>
      )}
    </div>
  );
}
