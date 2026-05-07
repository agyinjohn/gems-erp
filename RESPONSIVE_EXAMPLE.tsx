// EXAMPLE: Making a typical ERP page responsive

// ❌ BEFORE - Not Responsive
export default function InventoryPage() {
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Inventory</h1>
        <div className="flex gap-2">
          <button className="btn-secondary">Export</button>
          <button className="btn-primary">Add Product</button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Products" value="1,234" />
        <StatCard label="Low Stock" value="23" />
        <StatCard label="Out of Stock" value="5" />
        <StatCard label="Total Value" value="GHS 45,678" />
      </div>

      <div className="card">
        <table className="w-full">
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Stock</th>
              <th>Price</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.sku}</td>
                <td>{p.stock}</td>
                <td>GHS {p.price}</td>
                <td><Badge status={p.status} /></td>
                <td>
                  <button>Edit</button>
                  <button>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ✅ AFTER - Fully Responsive
import { ResponsiveTable } from '@/components/ui';
import { containerClasses } from '@/lib/responsive';

export default function InventoryPage() {
  return (
    <div className="p-4 sm:p-6">
      {/* Header - Stack on mobile */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Inventory</h1>
        <div className="flex flex-col sm:flex-row gap-2">
          <button className="btn-secondary">Export</button>
          <button className="btn-primary">Add Product</button>
        </div>
      </div>

      {/* Stats - Responsive grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <StatCard label="Total Products" value="1,234" />
        <StatCard label="Low Stock" value="23" />
        <StatCard label="Out of Stock" value="5" />
        <StatCard label="Total Value" value="GHS 45,678" />
      </div>

      {/* Table - Responsive component */}
      <div className="card">
        <ResponsiveTable
          columns={[
            { key: 'name', label: 'Product' },
            { key: 'sku', label: 'SKU' },
            { key: 'stock', label: 'Stock' },
            { 
              key: 'price', 
              label: 'Price',
              render: (val) => `GHS ${val}`
            },
            { 
              key: 'status', 
              label: 'Status',
              render: (val) => <Badge status={val} />
            },
            {
              key: 'actions',
              label: 'Actions',
              render: (_, row) => (
                <div className="flex gap-2">
                  <button className="text-blue-600 text-sm">Edit</button>
                  <button className="text-red-600 text-sm">Delete</button>
                </div>
              )
            }
          ]}
          data={products}
          keyField="id"
        />
      </div>
    </div>
  );
}

// 🎯 KEY CHANGES:
// 1. Padding: p-6 → p-4 sm:p-6
// 2. Header: flex → flex-col sm:flex-row
// 3. Buttons: flex → flex-col sm:flex-row
// 4. Stats grid: grid-cols-4 → grid-cols-1 sm:grid-cols-2 lg:grid-cols-4
// 5. Table: <table> → <ResponsiveTable>
// 6. Heading: text-3xl → text-2xl sm:text-3xl
// 7. Spacing: mb-6 → mb-4 sm:mb-6

// 📱 RESULT:
// - Mobile (< 640px): Single column, stacked buttons, card view
// - Tablet (≥ 768px): 2 stat columns, side-by-side buttons
// - Desktop (≥ 1024px): 4 stat columns, full table view
