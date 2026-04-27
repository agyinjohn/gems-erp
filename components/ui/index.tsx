'use client';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { ReactNode, useEffect, useState, useCallback } from 'react';

// ── TOAST ─────────────────────────────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'info';
interface ToastItem { id: number; message: string; type: ToastType; }

let _addToast: ((msg: string, type: ToastType) => void) | null = null;

export const toast = {
  success: (msg: string) => _addToast?.(msg, 'success'),
  error:   (msg: string) => _addToast?.(msg, 'error'),
  info:    (msg: string) => _addToast?.(msg, 'info'),
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const add = useCallback((message: string, type: ToastType) => {
    const id = Date.now();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  }, []);

  useEffect(() => { _addToast = add; return () => { _addToast = null; }; }, [add]);

  const icons = { success: <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />, error: <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />, info: <Info className="w-4 h-4 text-blue-500 flex-shrink-0" /> };
  const styles = { success: 'border-green-200 bg-green-50', error: 'border-red-200 bg-red-50', info: 'border-blue-200 bg-blue-50' };
  const textStyles = { success: 'text-green-800', error: 'text-red-800', info: 'text-blue-800' };

  if (!toasts.length) return null;
  return (
    <div className="fixed top-5 right-5 z-[100] flex flex-col gap-2 w-80">
      {toasts.map(t => (
        <div key={t.id} className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg animate-in slide-in-from-right-5 ${styles[t.type]}`}>
          {icons[t.type]}
          <span className={`text-sm font-medium flex-1 ${textStyles[t.type]}`}>{t.message}</span>
          <button onClick={() => setToasts(ts => ts.filter(x => x.id !== t.id))} className="text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>
        </div>
      ))}
    </div>
  );
}

// ── MODAL ────────────────────────────────────────────────────────────────────
interface ModalProps { open: boolean; onClose: () => void; title: string; children: ReactNode; size?: 'sm'|'md'|'lg'; }
export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  if (!open) return null;
  const widths = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-xl shadow-2xl w-full ${widths[size]} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 text-lg">{title}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ── STAT CARD ────────────────────────────────────────────────────────────────
interface StatProps { label: string; value: string | number; icon: ReactNode; color: string; sub?: string; }
export function StatCard({ label, value, icon, color, sub }: StatProps) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>{icon}</div>
      <div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-sm text-gray-500">{label}</div>
        {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

// ── BADGE ─────────────────────────────────────────────────────────────────────
const badgeMap: Record<string, string> = {
  active: 'badge-green', paid: 'badge-green', delivered: 'badge-green', completed: 'badge-green', approved: 'badge-green', won: 'badge-green',
  pending: 'badge-yellow', processing: 'badge-yellow', draft: 'badge-yellow', submitted: 'badge-yellow', contacted: 'badge-yellow',
  cancelled: 'badge-red', failed: 'badge-red', terminated: 'badge-red', lost: 'badge-red',
  shipped: 'badge-blue', sent: 'badge-blue', qualified: 'badge-blue',
  inactive: 'badge-gray', on_leave: 'badge-gray',
  new: 'badge-purple', proposal: 'badge-purple', negotiation: 'badge-purple',
};
export function Badge({ status }: { status: string }) {
  const cls = badgeMap[status] || 'badge-gray';
  return <span className={`badge ${cls}`}>{status.replace(/_/g, ' ')}</span>;
}

// ── EMPTY STATE ───────────────────────────────────────────────────────────────
export function EmptyState({ message, icon }: { message: string; icon?: ReactNode }) {
  return (
    <div className="text-center py-16 text-gray-400">
      <div className="flex justify-center mb-3">{icon || <span className="text-4xl">📭</span>}</div>
      <p className="text-sm">{message}</p>
    </div>
  );
}

// ── SPINNER ───────────────────────────────────────────────────────────────────
export function Spinner() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-4 border-blue-100" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-700 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-700 animate-pulse" />
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        {[0,1,2].map(i => (
          <div key={i} className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  );
}

// ── CONFIRM DIALOG ────────────────────────────────────────────────────────────
interface ConfirmProps { open: boolean; onClose: () => void; onConfirm: () => void; title: string; message: string; danger?: boolean; }
export function ConfirmDialog({ open, onClose, onConfirm, title, message, danger }: ConfirmProps) {
  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-gray-600 text-sm mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <button onClick={onClose} className="btn-secondary">Cancel</button>
        <button onClick={() => { onConfirm(); onClose(); }} className={danger ? 'btn-danger' : 'btn-primary'}>Confirm</button>
      </div>
    </Modal>
  );
}
