'use client';

import { Modal, Spinner } from '@/components/ui';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface AccountingLedgerPanelProps {
  account: any | null;
  onClose: () => void;
}

function fmt(n: number | string | undefined) {
  const v = parseFloat(String(n ?? 0));
  if (Math.abs(v) < 0.001) return '—';
  return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

  const acc = data?.account || account;
  const lines = data?.lines || [];

  return (
    <Modal open={!!account} onClose={onClose} title={`Ledger — ${acc.code} ${acc.name}`} size="lg">
      {loading ? <Spinner /> : (
        <>
          <div className="flex flex-wrap gap-4 mb-4 text-sm">
            <div>
              <span className="text-gray-500">Current balance</span>
              <div className="font-bold tabular-nums">GH₵ {fmt(acc.display_balance ?? account.display_balance ?? 0)}</div>
            </div>
            {data?.totals && (
              <>
                <div>
                  <span className="text-gray-500">Total debits</span>
                  <div className="font-semibold tabular-nums">GH₵ {fmt(data.totals.debit)}</div>
                </div>
                <div>
                  <span className="text-gray-500">Total credits</span>
                  <div className="font-semibold tabular-nums">GH₵ {fmt(data.totals.credit)}</div>
                </div>
                <div>
                  <span className="text-gray-500">Journal entries</span>
                  <div className="font-semibold">{data.totals.entries}</div>
                </div>
              </>
            )}
          </div>
          <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="table-header sticky top-0 bg-white">
                <tr>
                  {['Date', 'Reference', 'Source', 'Description', 'Debit', 'Credit', 'Balance'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {lines.map((line: any, i: number) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{new Date(line.date).toLocaleDateString()}</td>
                    <td className="px-3 py-2 font-mono text-xs text-[#0D3B6E]">{line.reference}</td>
                    <td className="px-3 py-2 text-xs"><span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#0D3B6E]/8 text-[#0D3B6E]">{line.source}</span></td>
                    <td className="px-3 py-2 max-w-[160px] truncate">{line.description}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{line.debit > 0 ? fmt(line.debit) : '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{line.credit > 0 ? fmt(line.credit) : '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold">{fmt(line.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {lines.length === 0 && (
              <p className="text-center text-gray-400 py-8 text-sm">No journal activity for this account.</p>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}
