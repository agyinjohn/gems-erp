'use client';
import { useRef } from 'react';
import { Modal } from '@/components/ui';
import { Printer, Download } from 'lucide-react';

interface InvoiceModalProps {
  open: boolean;
  onClose: () => void;
  order: any;
  business: any;
}

export default function InvoiceModal({ open, onClose, order, business }: InvoiceModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = printRef.current?.innerHTML;
    if (!content) return;
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(`
      <html><head><title>Invoice ${order?.order_number}</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; font-size:13px; color:#111; background:#fff; padding:40px; }
        .inv-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:32px; }
        .inv-logo { font-size:22px; font-weight:900; color:#0D3B6E; letter-spacing:-0.5px; }
        .inv-biz { font-size:11px; color:#555; margin-top:4px; line-height:1.6; }
        .inv-title { text-align:right; }
        .inv-title h1 { font-size:28px; font-weight:800; color:#0D3B6E; letter-spacing:2px; }
        .inv-title p { font-size:11px; color:#888; margin-top:4px; }
        .inv-meta { display:grid; grid-template-columns:1fr 1fr; gap:24px; margin-bottom:28px; }
        .inv-meta-box { background:#f8f9fb; border-radius:8px; padding:14px 16px; }
        .inv-meta-box h4 { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#888; margin-bottom:8px; }
        .inv-meta-box p { font-size:12px; color:#333; line-height:1.7; }
        table { width:100%; border-collapse:collapse; margin-bottom:20px; }
        thead tr { background:#0D3B6E; color:#fff; }
        thead th { padding:10px 12px; text-align:left; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; }
        thead th:last-child { text-align:right; }
        tbody tr { border-bottom:1px solid #f0f0f0; }
        tbody tr:nth-child(even) { background:#fafafa; }
        tbody td { padding:10px 12px; font-size:12px; }
        tbody td:last-child { text-align:right; font-weight:600; }
        .totals { display:flex; justify-content:flex-end; margin-bottom:28px; }
        .totals-box { width:260px; }
        .totals-row { display:flex; justify-content:space-between; padding:5px 0; font-size:12px; border-bottom:1px solid #f0f0f0; }
        .totals-row.grand { font-size:15px; font-weight:800; color:#0D3B6E; border-top:2px solid #0D3B6E; border-bottom:none; padding-top:10px; margin-top:4px; }
        .status-badge { display:inline-block; padding:3px 10px; border-radius:20px; font-size:10px; font-weight:700; text-transform:uppercase; }
        .status-paid { background:#dcfce7; color:#166534; }
        .status-pending { background:#fef9c3; color:#854d0e; }
        .status-failed { background:#fee2e2; color:#991b1b; }
        .inv-footer { text-align:center; font-size:10px; color:#aaa; border-top:1px solid #eee; padding-top:16px; margin-top:8px; }
        .payment-info { background:#f0f7ff; border:1px solid #bfdbfe; border-radius:8px; padding:12px 16px; margin-bottom:20px; font-size:11px; color:#1e40af; }
      </style></head><body>${content}</body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  if (!order) return null;

  const fmt = (v: any) => `GHS ${parseFloat(v || 0).toFixed(2)}`;
  const paymentStatusClass = order.payment_status === 'paid' ? 'status-paid' : order.payment_status === 'failed' ? 'status-failed' : 'status-pending';
  const issueDate = new Date(order.created_at || order.createdAt).toLocaleDateString('en-GH', { day: 'numeric', month: 'long', year: 'numeric' });
  const dueDate   = new Date(order.created_at || order.createdAt).toLocaleDateString('en-GH', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <Modal open={open} onClose={onClose} title={`Invoice — ${order.order_number}`} size="lg">
      {/* Action buttons */}
      <div className="flex justify-end gap-2 mb-4">
        <button onClick={handlePrint} className="btn-secondary flex items-center gap-2 text-sm">
          <Printer className="w-4 h-4" /> Print / Save PDF
        </button>
      </div>

      {/* Invoice preview */}
      <div ref={printRef} className="bg-white rounded-xl border border-gray-200 p-8 text-sm text-gray-800">

        {/* Header */}
        <div className="inv-header flex justify-between items-start mb-8">
          <div>
            <div className="inv-logo text-2xl font-black text-[#0D3B6E]">{business?.business_name || 'GEMS'}</div>
            <div className="inv-biz text-xs text-gray-500 mt-1 leading-relaxed">
              {business?.email && <div>{business.email}</div>}
              {business?.phone && <div>{business.phone}</div>}
              {business?.address && <div>{business.address}</div>}
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-3xl font-black text-[#0D3B6E] tracking-widest">INVOICE</h1>
            <p className="text-xs text-gray-400 mt-1 font-mono">{order.order_number}</p>
            <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
              order.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
              order.payment_status === 'failed' ? 'bg-red-100 text-red-700' :
              'bg-yellow-100 text-yellow-700'
            }`}>{order.payment_status}</span>
          </div>
        </div>

        {/* Meta grid */}
        <div className="grid grid-cols-2 gap-5 mb-7">
          <div className="bg-gray-50 rounded-xl p-4">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Bill To</h4>
            <p className="font-semibold text-gray-900">{order.customer_name}</p>
            {order.customer_email && <p className="text-gray-500 text-xs mt-0.5">{order.customer_email}</p>}
            {order.customer_phone && <p className="text-gray-500 text-xs">{order.customer_phone}</p>}
            {order.delivery_address && <p className="text-gray-500 text-xs mt-1">{order.delivery_address}</p>}
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Invoice Details</h4>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-gray-500">Issue Date</span><span className="font-medium">{issueDate}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Due Date</span><span className="font-medium">{dueDate}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Source</span><span className="font-medium capitalize">{order.source}</span></div>
              {order.payment_method && <div className="flex justify-between"><span className="text-gray-500">Payment Method</span><span className="font-medium capitalize">{order.payment_method.replace('_',' ')}</span></div>}
              {order.payment_ref && <div className="flex justify-between"><span className="text-gray-500">Payment Ref</span><span className="font-mono text-[10px]">{order.payment_ref}</span></div>}
            </div>
          </div>
        </div>

        {/* Items table */}
        <table className="w-full text-sm mb-5">
          <thead>
            <tr className="bg-[#0D3B6E] text-white">
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide rounded-tl-lg">#</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide">Description</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide">Qty</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide">Unit Price</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide rounded-tr-lg">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items?.map((item: any, i: number) => (
              <tr key={item.id || i} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-2.5 text-gray-400 text-xs">{i + 1}</td>
                <td className="px-4 py-2.5 font-medium">{item.product_name}</td>
                <td className="px-4 py-2.5 text-right text-gray-600">{item.quantity}</td>
                <td className="px-4 py-2.5 text-right text-gray-600">{fmt(item.unit_price)}</td>
                <td className="px-4 py-2.5 text-right font-semibold">{fmt(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-6">
          <div className="w-64 space-y-1.5">
            <div className="flex justify-between text-sm text-gray-600 pb-1.5 border-b border-gray-100">
              <span>Subtotal</span><span>{fmt(order.subtotal)}</span>
            </div>
            {parseFloat(order.tax_amount || 0) > 0 && (
              <div className="flex justify-between text-sm text-gray-600 pb-1.5 border-b border-gray-100">
                <span>Tax</span><span>{fmt(order.tax_amount)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-black text-[#0D3B6E] pt-2 border-t-2 border-[#0D3B6E]">
              <span>TOTAL</span><span>{fmt(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Payment note */}
        {order.payment_status === 'paid' && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-xs text-green-700 font-medium mb-5">
            ✓ Payment received. Thank you for your business!
          </div>
        )}
        {order.payment_status === 'pending' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-xs text-yellow-700 font-medium mb-5">
            ⏳ Payment pending. Please settle this invoice at your earliest convenience.
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-gray-300 border-t border-gray-100 pt-4 mt-2">
          Generated by GEMS · {business?.business_name} · {new Date().toLocaleDateString('en-GH', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>
    </Modal>
  );
}
