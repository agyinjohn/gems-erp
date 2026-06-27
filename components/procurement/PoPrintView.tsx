'use client';

export default function PoPrintView({ po, businessName }: { po: any; businessName?: string }) {
  if (!po) return null;
  const supplierName = po.supplier_id?.name || po.supplier_name || '—';

  return (
    <div id="po-print" className="text-sm text-gray-900">
      <div className="text-center border-b border-gray-200 pb-4 mb-4">
        <h1 className="text-lg font-bold">{businessName || 'Purchase Order'}</h1>
        <p className="font-mono text-[#0D3B6E] font-semibold mt-1">{po.po_number}</p>
        <p className="text-xs text-gray-500 mt-1">
          {po.created_at || po.createdAt
            ? new Date(po.created_at || po.createdAt).toLocaleString()
            : ''}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <p className="text-xs uppercase text-gray-400 font-semibold">Supplier</p>
          <p className="font-medium">{supplierName}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-gray-400 font-semibold">Status</p>
          <p className="font-medium capitalize">{(po.status || '').replace(/_/g, ' ')}</p>
        </div>
        {po.expected_date && (
          <div>
            <p className="text-xs uppercase text-gray-400 font-semibold">Expected delivery</p>
            <p>{new Date(po.expected_date).toLocaleDateString()}</p>
          </div>
        )}
        <div>
          <p className="text-xs uppercase text-gray-400 font-semibold">Total</p>
          <p className="font-bold">GH₵ {parseFloat(po.total_cost || 0).toFixed(2)}</p>
        </div>
      </div>

      <table className="w-full text-sm border border-gray-200">
        <thead>
          <tr className="bg-gray-50">
            {['Product', 'Qty', 'Unit cost', 'Total'].map((h) => (
              <th key={h} className="px-2 py-2 text-left text-xs font-semibold text-gray-500">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(po.items || []).map((item: any, i: number) => (
            <tr key={i} className="border-t border-gray-100">
              <td className="px-2 py-2">{item.product_name}</td>
              <td className="px-2 py-2">{item.quantity_ordered}</td>
              <td className="px-2 py-2">GH₵ {parseFloat(item.unit_cost || 0).toFixed(2)}</td>
              <td className="px-2 py-2 font-medium">GH₵ {parseFloat(item.total || 0).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {po.notes && (
        <p className="mt-4 text-xs text-gray-600">
          <span className="font-semibold">Notes:</span> {po.notes}
        </p>
      )}
    </div>
  );
}
