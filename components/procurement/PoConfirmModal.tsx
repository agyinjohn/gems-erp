'use client';

import { Modal } from '@/components/ui';
import { AlertTriangle } from 'lucide-react';

export type PoConfirmAction = 'submit' | 'approve' | 'send' | 'receive' | 'pay';

const ACTION_CONFIG: Record<PoConfirmAction, { title: string; message: string; confirmLabel: string; danger?: boolean }> = {
  submit: {
    title: 'Submit for approval?',
    message: 'This purchase order will be sent to approvers and can no longer be edited.',
    confirmLabel: 'Submit',
  },
  approve: {
    title: 'Approve purchase order?',
    message: 'The PO will be approved and ready to send to the supplier.',
    confirmLabel: 'Approve',
  },
  send: {
    title: 'Mark as sent to supplier?',
    message: 'Confirm this purchase order has been sent to the supplier.',
    confirmLabel: 'Mark sent',
  },
  receive: {
    title: 'Confirm goods receipt?',
    message: 'Stock levels will be updated for the quantities you entered. This cannot be undone from this screen.',
    confirmLabel: 'Confirm receipt',
  },
  pay: {
    title: 'Record supplier payment?',
    message: 'This will log the payment against the purchase order and update accounting records.',
    confirmLabel: 'Record payment',
  },
};

interface PoConfirmModalProps {
  open: boolean;
  action: PoConfirmAction | null;
  po: any;
  details?: { label: string; value: string }[];
  saving?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function PoConfirmModal({ open, action, po, details = [], saving, onClose, onConfirm }: PoConfirmModalProps) {
  if (!open || !action || !po) return null;

  const config = ACTION_CONFIG[action];
  const supplierName = po.supplier_name || po.supplier_id?.name || '—';

  return (
    <Modal open={open} onClose={onClose} title={config.title} size="sm">
      <div className="flex items-start gap-3 mb-4">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${config.danger ? 'bg-red-100' : 'bg-amber-100'}`}>
          <AlertTriangle className={`w-5 h-5 ${config.danger ? 'text-red-600' : 'text-amber-600'}`} />
        </div>
        <p className="text-sm text-gray-600">{config.message}</p>
      </div>

      <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 text-sm mb-4 space-y-1.5">
        <div className="flex justify-between gap-2">
          <span className="text-gray-500">PO</span>
          <span className="font-mono font-medium text-gray-900">{po.po_number}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-gray-500">Supplier</span>
          <span className="font-medium text-gray-900 text-right">{supplierName}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-gray-500">Total</span>
          <span className="font-bold text-[#0D3B6E] tabular-nums">GH₵ {parseFloat(po.total_cost || 0).toFixed(2)}</span>
        </div>
        {details.map((d) => (
          <div key={d.label} className="flex justify-between gap-2">
            <span className="text-gray-500">{d.label}</span>
            <span className="font-medium text-gray-900 text-right">{d.value}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-3 justify-end">
        <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
        <button
          type="button"
          className={config.danger ? 'btn-primary bg-red-600 hover:bg-red-700' : 'btn-primary'}
          onClick={onConfirm}
          disabled={saving}
        >
          {saving ? 'Processing…' : config.confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
