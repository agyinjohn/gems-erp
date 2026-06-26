'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import PaymentQr from '@/components/pos/PaymentQr';
import api from '@/lib/api';
import { CheckCircle2, Loader2 } from 'lucide-react';

interface QueueItem {
  order_id: string;
  order_number: string;
  customer_name: string;
  amount: number;
  authorization_url: string;
  reference: string;
  is_focused?: boolean;
  expires_at?: string | null;
}

interface PaidFlash {
  order_id: string;
  order_number?: string;
  customer_name: string;
  amount: number;
}

type ViewState = 'idle' | 'paying' | 'success';

const ROTATE_MS = 10_000;

export default function CustomerDisplayPage() {
  const { user, loading, tenant } = useAuth();
  const router = useRouter();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [view, setView] = useState<ViewState>('idle');
  const [paidFlash, setPaidFlash] = useState<PaidFlash | null>(null);
  const shownPaidRef = useRef<Set<string>>(new Set());
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (!loading && user && !['business_owner', 'branch_manager', 'sales_staff'].includes(user.role)) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  const poll = useCallback(async () => {
    try {
      const r = await api.get('/pos/display/queue');
      const items: QueueItem[] = r.data.data || [];
      const flash: PaidFlash | null = r.data.paid_flash || null;

      setQueue(items);

      if (flash?.order_id && !shownPaidRef.current.has(flash.order_id)) {
        shownPaidRef.current.add(flash.order_id);
        setPaidFlash(flash);
        setView('success');
        if (successTimer.current) clearTimeout(successTimer.current);
        successTimer.current = setTimeout(() => {
          setView(items.length > 0 ? 'paying' : 'idle');
          setPaidFlash(null);
        }, 3500);
        return;
      }

      if (items.length === 0) {
        if (view !== 'success') setView('idle');
        return;
      }

      const focusIdx = items.findIndex((i) => i.is_focused);
      if (focusIdx >= 0) {
        setActiveIndex(focusIdx);
      } else {
        setActiveIndex((i) => (i >= items.length ? 0 : i));
      }

      if (view !== 'success') setView('paying');
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
    if (queue.length <= 1 || view !== 'paying') return;
    const id = setInterval(() => {
      setActiveIndex((i) => (i + 1) % queue.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [queue.length, view]);

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
  const current = queue[activeIndex] || null;

  return (
    <div className="min-h-dvh bg-gradient-to-b from-[#0D3B6E] to-[#1A5294] flex flex-col items-center justify-center p-6 text-center select-none">
      {view === 'idle' && (
        <div>
          <p className="text-white/60 text-sm uppercase tracking-[0.25em] mb-3">Customer display</p>
          <h1 className="text-white text-3xl md:text-4xl font-extrabold mb-2">{storeName}</h1>
          <p className="text-white/70 text-lg">Scan to pay when your total appears here</p>
        </div>
      )}

      {view === 'paying' && current && (
        <div className="w-full max-w-md">
          {queue.length > 1 && (
            <p className="text-white/50 text-xs mb-3">
              {activeIndex + 1} of {queue.length} waiting · rotates every {ROTATE_MS / 1000}s
            </p>
          )}
          <p className="text-white/60 text-xs uppercase tracking-widest mb-2">Amount due</p>
          <p className="text-white text-5xl md:text-6xl font-extrabold tabular-nums mb-1">
            GH₵ {Number(current.amount).toFixed(2)}
          </p>
          <p className="text-white/80 text-base mb-6">{current.customer_name}</p>

          <div className="bg-white rounded-2xl p-6 shadow-2xl inline-block">
            <PaymentQr value={current.authorization_url} size={280} />
          </div>

          <p className="text-white/90 text-lg font-medium mt-6">Scan with your phone to pay</p>
          <p className="text-white/50 text-xs mt-3 font-mono">{current.reference}</p>
        </div>
      )}

      {view === 'success' && paidFlash && (
        <div>
          <div className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-6 shadow-lg">
            <CheckCircle2 className="w-14 h-14 text-white" />
          </div>
          <p className="text-white text-3xl font-extrabold">Payment received</p>
          <p className="text-white/80 text-lg mt-2">{paidFlash.customer_name}</p>
          <p className="text-white/60 text-base mt-1">GH₵ {Number(paidFlash.amount).toFixed(2)}</p>
        </div>
      )}
    </div>
  );
}
