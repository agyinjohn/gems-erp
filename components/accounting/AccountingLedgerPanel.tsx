'use client';

import { Modal, Spinner } from '@/components/ui';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface AccountingLedgerPanelProps {
  account: any | null;
  onClose: () => void;
}

export default function AccountingLedgerPanel({ account, onClose }: AccountingLedgerPanelProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!account) return;
    setLoading(true);
    api.get(`/accounting/gl/${account.id || account._id}`)
      .then((res) => setData(res.data.data))
      .finally(() => setLoading(false));
  }, [account]);

  if (!account) return null;

  return (
    <Modal open={!!account} onClose={onClose} title={`Ledger — ${account.code} ${account.name}`} size="lg">
      {loading ? <Spinner /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="table-header">
              <tr>{['Date', 'Reference', 'Description', 'Debit', 'Credit', 'Balance'].map((h) => (
                <th key={h} className="px-3 py-2 text-left">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(data?.lines || []).map((line: any, i: number) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-xs text-gray-500">{new Date(line.date).toLocaleDateString()}</td>
                  <td className="px-3 py-2 font-mono text-xs">{line.reference}</td>
                  <td className="px-3 py-2">{line.description}</td>
                  <td className="px-3 py-2 text-right">{line.debit > 0 ? parseFloat(line.debit).toFixed(2) : '—'}</td>
                  <td className="px-3 py-2 text-right">{line.credit > 0 ? parseFloat(line.credit).toFixed(2) : '—'}</td>
                  <td className="px-3 py-2 text-right font-semibold">{parseFloat(line.balance).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!data?.lines || data.lines.length === 0) && (
            <p className="text-center text-gray-400 py-8 text-sm">No journal activity for this account.</p>
          )}
        </div>
      )}
    </Modal>
  );
}
