'use client';

import { Loader2, Monitor, X, CheckCircle2, Clock } from 'lucide-react';

export interface PendingPayment {
  order_id: string;
  order_number: string;
  customer_name: string;
  customer_phone?: string;
  total: number;
  payment_method: string;
  reference: string;
  authorization_url: string | null;
  created_at: string;
  expires_at?: string | null;
}

function methodLabel(method: string) {
  if (method === 'momo') return 'MoMo';
  if (method === 'card') return 'Card';
  if (method === 'card_terminal') return 'Terminal';
  return method;
}

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins === 1) return '1 min ago';
  return `${mins} min ago`;
}

function minutesLeft(expiresAt?: string | null) {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / 60000);
}

export default function PendingPaymentChip({
  payment,
  onShowDisplay,
  onVerify,
  onCancel,
  verifying,
  displaying,
}: {
  payment: PendingPayment;
  onShowDisplay: () => void;
  onVerify: () => void;
  onCancel: () => void;
  verifying?: boolean;
  displaying?: boolean;
}) {
  const hasQr = !!payment.authorization_url;
  const left = minutesLeft(payment.expires_at);
  const urgent = left !== null && left <= 5;

  return (
    <div className={`shrink-0 w-[168px] rounded-xl border p-2.5 shadow-sm ${
      urgent ? 'border-orange-300 bg-orange-50/90' : 'border-amber-200 bg-amber-50/90'
    }`}>
      <div className="flex items-start justify-between gap-1 mb-1">
        <p className="text-[11px] font-bold text-amber-950 truncate leading-tight" title={payment.customer_name}>
          {payment.customer_name}
        </p>
        <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
          {methodLabel(payment.payment_method)}
        </span>
      </div>
      <p className="text-sm font-extrabold text-[#0D3B6E] tabular-nums">GH₵ {Number(payment.total).toFixed(2)}</p>
      <div className="flex items-center gap-1 mt-0.5 text-[10px] text-amber-800/70">
        <span>{timeAgo(payment.created_at)}</span>
        {left !== null && (
          <>
            <span>·</span>
            <span className={`inline-flex items-center gap-0.5 ${urgent ? 'text-orange-700 font-semibold' : ''}`}>
              <Clock className="w-3 h-3" />
              {left <= 0 ? 'expiring' : `${left}m left`}
            </span>
          </>
        )}
      </div>
      <div className="flex flex-wrap gap-1 mt-2">
        {hasQr && (
          <button
            type="button"
            onClick={onShowDisplay}
            disabled={displaying}
            className="flex items-center gap-0.5 text-[10px] font-semibold text-blue-800 bg-blue-100 hover:bg-blue-200 disabled:opacity-50 px-1.5 py-1 rounded-md"
            title="Show QR on customer screen"
          >
            {displaying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Monitor className="w-3 h-3" />}
            Screen
          </button>
        )}
        <button
          type="button"
          onClick={onVerify}
          disabled={verifying}
          className="flex items-center gap-0.5 text-[10px] font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 disabled:opacity-50 px-1.5 py-1 rounded-md"
        >
          {verifying ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
          Check
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-0.5 text-[10px] font-semibold text-red-700 bg-red-50 hover:bg-red-100 px-1.5 py-1 rounded-md"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
