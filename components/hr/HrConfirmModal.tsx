'use client';

import { Modal } from '@/components/ui';
import { AlertTriangle } from 'lucide-react';

interface HrConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  saving?: boolean;
  details?: { label: string; value: string }[];
  onClose: () => void;
  onConfirm: () => void;
}

export default function HrConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  danger,
  saving,
  details = [],
  onClose,
  onConfirm,
}: HrConfirmModalProps) {
  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="flex items-start gap-3 mb-4">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${danger ? 'bg-red-100' : 'bg-amber-100'}`}>
          <AlertTriangle className={`w-5 h-5 ${danger ? 'text-red-600' : 'text-amber-600'}`} />
        </div>
        <p className="text-sm text-gray-600">{message}</p>
      </div>

      {details.length > 0 && (
        <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 text-sm mb-4 space-y-1.5">
          {details.map((detail) => (
            <div key={detail.label} className="flex justify-between gap-2">
              <span className="text-gray-500">{detail.label}</span>
              <span className="font-medium text-gray-900 text-right">{detail.value}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3 justify-end">
        <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
        <button
          type="button"
          className={danger ? 'btn-primary bg-red-600 hover:bg-red-700' : 'btn-primary'}
          onClick={onConfirm}
          disabled={saving}
        >
          {saving ? 'Processing…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
