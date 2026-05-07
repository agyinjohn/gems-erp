# Responsive Example - Before & After

This document shows how to make a typical ERP page responsive.

## ❌ BEFORE - Not Responsive

```tsx
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
```

### Problems:
- ❌ Fixed padding (p-6) too large on mobile
- ❌ Header buttons overflow on mobile
- ❌ 4-column grid breaks on mobile
- ❌ Table scrolls horizontally or breaks layout
- ❌ Fixed text size (text-3xl) too large on mobile

---

## ✅ AFTER - Fully Responsive

```tsx
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
```

### Improvements:
- ✅ Responsive padding: `p-4 sm:p-6`
- ✅ Header stacks on mobile: `flex-col sm:flex-row`
- ✅ Buttons stack on mobile: `flex-col sm:flex-row`
- ✅ Stats grid adapts: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
- ✅ Table becomes cards on mobile: `<ResponsiveTable>`
- ✅ Responsive heading: `text-2xl sm:text-3xl`
- ✅ Responsive spacing: `mb-4 sm:mb-6`

---

## 🎯 Key Changes Summary

| Element | Before | After | Why |
|---------|--------|-------|-----|
| Padding | `p-6` | `p-4 sm:p-6` | Smaller padding on mobile |
| Header | `flex` | `flex-col sm:flex-row` | Stack on mobile |
| Buttons | `flex` | `flex-col sm:flex-row` | Stack on mobile |
| Stats Grid | `grid-cols-4` | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` | 1→2→4 columns |
| Table | `<table>` | `<ResponsiveTable>` | Cards on mobile |
| Heading | `text-3xl` | `text-2xl sm:text-3xl` | Smaller on mobile |
| Spacing | `mb-6` | `mb-4 sm:mb-6` | Tighter on mobile |

---

## 📱 Result by Device

### Mobile (< 640px)
- Single column layout
- Stacked buttons
- Card view for data
- Smaller text and spacing

### Tablet (≥ 768px)
- 2 stat columns
- Side-by-side buttons
- Still card view or scrollable table

### Desktop (≥ 1024px)
- 4 stat columns
- Full table view
- Optimal spacing
- Larger text

---

## 🔧 Common Patterns

### 1. Responsive Padding
```tsx
// Small on mobile, larger on desktop
className="p-4 sm:p-6 lg:p-8"
```

### 2. Responsive Grid
```tsx
// 1 col → 2 cols → 3 cols → 4 cols
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
```

### 3. Stack on Mobile
```tsx
// Vertical on mobile, horizontal on desktop
className="flex flex-col sm:flex-row gap-2"
```

### 4. Responsive Text
```tsx
// Smaller on mobile, larger on desktop
className="text-sm sm:text-base lg:text-lg"
```

### 5. Hide/Show
```tsx
// Hide on mobile
className="hidden md:block"

// Show on mobile only
className="md:hidden"
```

### 6. Responsive Width
```tsx
// Full width on mobile, fixed on desktop
className="w-full md:w-64"
```

---

## 💡 Pro Tips

1. **Mobile-first approach**: Start with mobile styles, add desktop with `sm:`, `md:`, `lg:`
2. **Test at breakpoints**: 375px, 768px, 1024px, 1440px
3. **Use ResponsiveTable**: Automatically handles table → card conversion
4. **Stack buttons**: Always use `flex-col sm:flex-row` for button groups
5. **Reduce columns**: Never use more than 2 columns on mobile
6. **Smaller spacing**: Use `gap-2 sm:gap-4` for responsive gaps
7. **Truncate text**: Use `truncate` or `line-clamp-2` to prevent overflow

---

## 🚀 Quick Reference

```tsx
// Responsive container
<div className="p-4 sm:p-6 max-w-7xl mx-auto">

// Responsive grid (1→2→4 columns)
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

// Stack on mobile
<div className="flex flex-col sm:flex-row gap-2">

// Responsive text
<h1 className="text-2xl sm:text-3xl lg:text-4xl">

// Responsive table
<ResponsiveTable columns={cols} data={data} />
```

---

**Copy this pattern to all your pages for consistent responsive behavior!**
