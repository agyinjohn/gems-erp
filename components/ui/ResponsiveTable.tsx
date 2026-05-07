'use client';

interface Column {
  key: string;
  label: string;
  render?: (value: any, row: any) => React.ReactNode;
}

interface PropsWithColumns {
  columns: Column[];
  data: any[];
  keyField?: string;
  headers?: never;
  renderRow?: never;
}

interface PropsWithHeaders {
  headers: string[];
  data: any[];
  renderRow: (row: any) => React.ReactNode[];
  keyField?: string;
  columns?: never;
}

type Props = PropsWithColumns | PropsWithHeaders;

export default function ResponsiveTable(props: Props) {
  const { data, keyField = 'id' } = props;

  // New interface with headers and renderRow
  if ('headers' in props && props.headers) {
    const { headers, renderRow } = props;
    return (
      <>
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="table-header">
              <tr>
                {headers.map(h => (
                  <th key={h} className="px-4 py-3 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map(row => (
                <tr key={row[keyField]} className="hover:bg-gray-50 transition-colors">
                  {renderRow(row).map((cell, idx) => (
                    <td key={idx} className="px-4 py-3">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3 p-3">
          {data.map(row => (
            <div key={row[keyField]} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
              {renderRow(row).map((cell, idx) => (
                <div key={idx} className="flex justify-between items-start gap-3">
                  <span className="text-xs font-semibold text-gray-500 uppercase">{headers[idx]}</span>
                  <span className="text-sm text-gray-900 text-right flex-1">{cell}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </>
    );
  }

  // Old interface with columns
  const { columns } = props as PropsWithColumns;
  return (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {columns.map(col => (
                <th key={col.key} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map(row => (
              <tr key={row[keyField]} className="hover:bg-gray-50">
                {columns.map(col => (
                  <td key={col.key} className="px-4 py-3 text-sm text-gray-700">
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {data.map(row => (
          <div key={row[keyField]} className="bg-white border border-gray-200 rounded-lg p-4 space-y-2">
            {columns.map(col => (
              <div key={col.key} className="flex justify-between items-start gap-3">
                <span className="text-xs font-semibold text-gray-500 uppercase">{col.label}</span>
                <span className="text-sm text-gray-900 text-right">
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
