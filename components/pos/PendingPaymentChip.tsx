'use client';

import { Loader2, Monitor, X, CheckCircle2 } from 'lucide-react';

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
  if (method === 'card_terminal') return 'VT';
  return method;
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
  const name = payment.customer_name.length > 14
    ? `${payment.customer_name.slice(0, 13)}…`
    : payment.customer_name;

  return (
    <div
      className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg border pl-2 pr-1 py-0.5 ${
        urgent ? 'border-orange-300 bg-orange-50' : 'border-amber-200 bg-white/80'
      }`}
      title={`${payment.customer_name} · ${payment.order_number}${left !== null ? ` · ${left}m left` : ''}`}
    >
      <span className="text-[11px] font-semibold text-gray-800 max-w-[88px] truncate">{name}</span>
      <span className="text-[11px] font-bold text-[#0D3B6E] tabular-nums">₵{Number(payment.total).toFixed(0)}</span>
      <span className="text-[9px] font-bold uppercase text-amber-700 bg-amber-100 px-1 rounded">{methodLabel(payment.payment_method)}</span>
      {left !== null && left <= 5 && (
        <span className="text-[9px] font-semibold text-orange-700">{left}m</span>
      )}
      <div className="flex items-center border-l border-amber-200/80 pl-1 ml-0.5">
        {hasQr && (
          <button
            type="button"
            onClick={onShowDisplay}
            disabled={displaying}
            className="p-1 rounded text-blue-700 hover:bg-blue-100 disabled:opacity-50"
            title="Show on customer screen"
          >
            {displaying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Monitor className="w-3 h-3" />}
          </button>
        )}
        <button
          type="button"
          onClick={onVerify}
          disabled={verifying}
          className="p-1 rounded text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
          title="Check payment"
        >
          {verifying ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="p-1 rounded text-red-600 hover:bg-red-50"
          title="Cancel pending payment"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
