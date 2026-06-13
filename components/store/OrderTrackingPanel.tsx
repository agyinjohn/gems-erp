'use client';
import { Package, MapPin, Truck, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { formatGhs } from './theme';

const STATUS_FLOW = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'] as const;

const STATUS_LABELS: Record<string, string> = {
  pending: 'Order placed',
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

function statusIndex(status?: string) {
  if (!status) return 0;
  const s = status.toLowerCase();
  if (s === 'cancelled') return -1;
  const idx = STATUS_FLOW.indexOf(s as typeof STATUS_FLOW[number]);
  return idx >= 0 ? idx : 1;
}

interface Props {
  order: any;
  reference: string;
}

export default function OrderTrackingPanel({ order, reference }: Props) {
  const status = (order.status || 'pending').toLowerCase();
  const currentIdx = statusIndex(status);
  const isCancelled = status === 'cancelled';
  const items = order.items || order.order_items || [];

  return (
    <div className="mt-6 pt-6 border-t border-gray-100 space-y-5">
      <div className="flex justify-between items-start gap-3">
        <div>
          <p className="text-xs text-gray-400">Order reference</p>
          <p className="font-mono font-bold text-[#0D3B6E]">{order.order_number || reference}</p>
          {order.created_at && (
            <p className="text-xs text-gray-400 mt-1">
              {new Date(order.created_at).toLocaleDateString('en-GH', {
                day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
              })}
            </p>
          )}
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ring-1 ${
          isCancelled
            ? 'bg-red-50 text-red-700 ring-red-100'
            : status === 'delivered'
              ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
              : 'bg-blue-50 text-[#0D3B6E] ring-blue-100'
        }`}>
          {STATUS_LABELS[status] || status}
        </span>
      </div>

      {!isCancelled && (
        <div className="space-y-0">
          {STATUS_FLOW.map((step, i) => {
            const done = i <= currentIdx;
            const active = i === currentIdx;
            return (
              <div key={step} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    done ? 'bg-[#0D3B6E] text-white' : 'bg-gray-100 text-gray-400'
                  } ${active ? 'ring-2 ring-[#0D3B6E]/30 ring-offset-2' : ''}`}>
                    {done ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  </div>
                  {i < STATUS_FLOW.length - 1 && (
                    <div className={`w-0.5 flex-1 min-h-[1.25rem] my-0.5 ${i < currentIdx ? 'bg-[#0D3B6E]' : 'bg-gray-200'}`} />
                  )}
                </div>
                <div className={`pb-4 ${active ? 'font-semibold text-gray-900' : done ? 'text-gray-700' : 'text-gray-400'}`}>
                  <p className="text-sm">{STATUS_LABELS[step]}</p>
                  {active && step === 'shipped' && order.tracking_note && (
                    <p className="text-xs text-gray-500 mt-0.5 font-normal">{order.tracking_note}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isCancelled && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 ring-1 ring-red-100">
          <XCircle className="w-4 h-4 shrink-0" />
          This order was cancelled.
        </div>
      )}

      {items.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-2">Items</h3>
          <div className="space-y-2">
            {items.map((item: any, i: number) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                  {item.images?.[0] || item.product?.images?.[0] ? (
                    <img src={item.images?.[0] || item.product?.images?.[0]} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-4 h-4 text-gray-300 m-auto mt-3" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {item.product_name || item.name || item.product?.name || 'Product'}
                  </p>
                  <p className="text-xs text-gray-400">Qty: {item.quantity}</p>
                </div>
                {item.price != null && (
                  <p className="text-sm font-semibold text-gray-800">
                    {formatGhs(parseFloat(item.price) * (item.quantity || 1))}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        {order.total != null && (
          <div className="bg-slate-50 rounded-xl px-4 py-3 ring-1 ring-slate-100">
            <p className="text-xs text-gray-400">Total</p>
            <p className="font-bold text-gray-900">{formatGhs(parseFloat(order.total))}</p>
          </div>
        )}
        {order.delivery_address && (
          <div className="bg-slate-50 rounded-xl px-4 py-3 ring-1 ring-slate-100 flex gap-2">
            <MapPin className="w-4 h-4 text-[#0D3B6E] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-gray-400">Delivery to</p>
              <p className="text-gray-700 leading-snug">{order.delivery_address}</p>
            </div>
          </div>
        )}
      </div>

      {status === 'shipped' || status === 'delivered' ? (
        <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 rounded-xl px-4 py-3 ring-1 ring-emerald-100">
          <Truck className="w-4 h-4" />
          {status === 'delivered' ? 'Your order has been delivered.' : 'Your order is on the way.'}
        </div>
      ) : null}
    </div>
  );
}
