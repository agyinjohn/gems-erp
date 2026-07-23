'use client';

import type { ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import { fmtGhs } from '@/lib/reportUtils';
import { DataTable } from './shared';
import type { ReportsBundle } from './ReportPanels';

interface Props {
  data: ReportsBundle;
  periodLabel: string;
  branchLabel: string;
}

const fmtNum = (n: unknown) => Number(n ?? 0).toLocaleString('en-GH');
const fmtPct = (n: unknown) => `${(Number(n ?? 0)).toFixed(1)}%`;
const margin = (rev: number, profit: number) => (rev ? `${((profit / rev) * 100).toFixed(1)}%` : '—');
const fmtDate = (d: unknown) => {
  if (!d) return '—';
  const dt = new Date(d as string);
  return Number.isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('en-GH', { day: '2-digit', month: 'short', year: 'numeric' });
};
const cap = (s: unknown) => String(s ?? '—').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/** A titled block that avoids being split across printed pages. */
function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-6 break-inside-avoid">
      <h4 className="text-sm font-bold text-gray-800 mb-2">{title}</h4>
      {children}
    </div>
  );
}

/** Compact label/value grid for a section's headline numbers. */
function Kpis({ items }: { items: { label: string; value: string; sub?: string }[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-5 break-inside-avoid">
      {items.map((it) => (
        <div key={it.label} className="rounded-lg border border-gray-200 px-3 py-2.5">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{it.label}</div>
          <div className="text-lg font-bold text-gray-900 tabular-nums mt-0.5">{it.value}</div>
          {it.sub && <div className="text-[11px] text-gray-400 mt-0.5">{it.sub}</div>}
        </div>
      ))}
    </div>
  );
}

function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="mb-9 break-inside-avoid-page">
      <div className="flex items-center gap-2 border-b-2 border-[#0D3B6E] pb-1.5 mb-4">
        <span className="w-6 h-6 rounded bg-[#0D3B6E] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{n}</span>
        <h3 className="text-base font-bold text-gray-900">{title}</h3>
      </div>
      {children}
    </section>
  );
}

export default function ReportDetailed({ data, periodLabel, branchLabel }: Props) {
  const { tenant } = useAuth();
  const { overview = {}, sales = {}, inventory = {}, finance = {}, procurement = {}, hr = {}, crm = {} } = data as any;
  const gl = finance.gl_summary || {};

  return (
    <div className="bg-white text-gray-900">
      {/* ── Report header ── */}
      <header className="mb-8 pb-5 border-b border-gray-200">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xl font-extrabold text-[#0D3B6E]">{tenant?.business_name || 'GEMS'}</div>
            <h1 className="text-2xl font-black text-gray-900 mt-1">Detailed Business Report</h1>
          </div>
          <div className="text-sm text-gray-500 text-right">
            <div><span className="text-gray-400">Period:</span> <span className="font-semibold text-gray-700">{periodLabel}</span></div>
            <div><span className="text-gray-400">Scope:</span> <span className="font-semibold text-gray-700">{branchLabel}</span></div>
            <div><span className="text-gray-400">Generated:</span> <span className="font-semibold text-gray-700">{new Date().toLocaleString('en-GH', { dateStyle: 'medium', timeStyle: 'short' })}</span></div>
          </div>
        </div>
      </header>

      {/* ── 1. Executive summary ── */}
      <Section n={1} title="Executive Summary">
        <Kpis items={[
          { label: 'Revenue', value: fmtGhs(overview.revenue), sub: overview.revenue_change != null ? `${overview.revenue_change > 0 ? '+' : ''}${fmtPct(overview.revenue_change)} vs prev` : undefined },
          { label: 'Orders', value: fmtNum(overview.orders), sub: overview.orders_change != null ? `${overview.orders_change > 0 ? '+' : ''}${fmtPct(overview.orders_change)} vs prev` : undefined },
          { label: 'Net profit', value: fmtGhs(overview.net_profit), sub: `Margin ${margin(overview.revenue, overview.net_profit)}` },
          { label: 'Avg order value', value: fmtGhs(overview.avg_order_value) },
          { label: 'Expenses', value: fmtGhs(overview.expenses) },
          { label: 'Refunds', value: fmtGhs(overview.refunds) },
          { label: 'Discounts', value: fmtGhs(overview.discounts) },
          { label: 'Stock value', value: fmtGhs(inventory.total_value), sub: `${fmtNum(inventory.low_stock_count)} low · ${fmtNum(inventory.out_of_stock)} out` },
          { label: 'Active employees', value: fmtNum(overview.active_employees) },
          { label: 'Pipeline', value: fmtGhs(overview.pipeline_value), sub: `${fmtNum(overview.pipeline_leads)} leads` },
          { label: 'Procurement spend', value: fmtGhs(overview.procurement_spend) },
          { label: 'POS shifts closed', value: fmtNum(overview.pos_shifts_closed), sub: `Variance ${fmtGhs(overview.pos_cash_variance)}` },
        ]} />
      </Section>

      {/* ── 2. Sales ── */}
      <Section n={2} title="Sales">
        <Kpis items={[
          { label: 'Total revenue', value: fmtGhs(sales.total_revenue) },
          { label: 'Paid orders', value: fmtNum(sales.total_orders) },
          { label: 'Avg order value', value: fmtGhs(sales.avg_order_value) },
          { label: 'Subtotal (ex-tax)', value: fmtGhs(sales.subtotal) },
          { label: 'Tax collected', value: fmtGhs(sales.tax_total) },
          { label: 'Refunds', value: fmtGhs(sales.refund_total), sub: `${fmtNum(sales.refund_orders)} orders` },
          { label: 'Discounts', value: fmtGhs(sales.discount_total) },
        ]} />
        <Block title="Monthly revenue trend">
          <DataTable headers={['Month', 'Revenue', 'Orders']} rows={(sales.monthly || []).map((m: any) => [m.month, fmtGhs(m.revenue), fmtNum(m.orders)])} />
        </Block>
        <Block title="Revenue by payment method">
          <DataTable headers={['Method', 'Revenue', 'Orders']} rows={(sales.by_payment || []).map((p: any) => [cap(p.method), fmtGhs(p.revenue), fmtNum(p.orders)])} />
        </Block>
        <Block title="Revenue by channel">
          <DataTable headers={['Channel', 'Revenue', 'Orders']} rows={(sales.by_source || []).map((s: any) => [cap(s.source), fmtGhs(s.revenue), fmtNum(s.orders)])} />
        </Block>
        {(sales.by_branch || []).length > 1 && (
          <Block title="Revenue by branch">
            <DataTable headers={['Branch', 'Revenue', 'Orders']} rows={sales.by_branch.map((b: any) => [b.branch || 'Unassigned', fmtGhs(b.revenue), fmtNum(b.orders)])} />
          </Block>
        )}
        <Block title="Top products by revenue">
          <DataTable headers={['Product', 'Units sold', 'Revenue']} rows={(sales.top_products || []).map((p: any) => [p.name, fmtNum(p.units_sold), fmtGhs(p.revenue)])} />
        </Block>
        {(sales.by_coupon || []).length > 0 && (
          <Block title="Coupon performance">
            <DataTable headers={['Code', 'Orders', 'Discount', 'Revenue']} rows={sales.by_coupon.map((c: any) => [c.code, fmtNum(c.orders), fmtGhs(c.discount), fmtGhs(c.revenue)])} />
          </Block>
        )}
        {(sales.recent_shifts || []).length > 0 && (
          <Block title="POS shifts closed">
            <DataTable headers={['Shift', 'Closed', 'Sales', 'Txns', 'Cash variance']} rows={sales.recent_shifts.map((s: any) => [s.shift_number, fmtDate(s.closed_at), fmtGhs(s.sales_total), fmtNum(s.sales_count), fmtGhs(s.cash_variance)])} />
          </Block>
        )}
      </Section>

      {/* ── 3. Inventory ── */}
      <Section n={3} title="Inventory">
        <Kpis items={[
          { label: 'Total products', value: fmtNum(inventory.total_products) },
          { label: 'Stock value', value: fmtGhs(inventory.total_value) },
          { label: 'Low stock', value: fmtNum(inventory.low_stock_count) },
          { label: 'Out of stock', value: fmtNum(inventory.out_of_stock) },
        ]} />
        <Block title="Inventory value by category">
          <DataTable headers={['Category', 'Products', 'Value']} rows={(inventory.by_category || []).map((c: any) => [c.category || 'Uncategorized', fmtNum(c.count), fmtGhs(c.value)])} />
        </Block>
        <Block title="Low stock items">
          <DataTable headers={['Product', 'SKU', 'On hand', 'Threshold', 'Unit cost']} rows={(inventory.low_stock || []).map((p: any) => [p.name, p.sku || '—', fmtNum(p.stock_qty), fmtNum(p.low_stock_threshold), fmtGhs(p.cost_price)])} />
        </Block>
        <Block title="Stock movements by type">
          <DataTable headers={['Type', 'Movements', 'Units']} rows={(inventory.movements_by_type || []).map((m: any) => [cap(m.type), fmtNum(m.count), fmtNum(m.qty)])} />
        </Block>
        <Block title="Most moved products">
          <DataTable headers={['Product', 'Movements', 'Units']} rows={(inventory.top_moved_products || []).map((p: any) => [p.name, fmtNum(p.moves), fmtNum(p.qty)])} />
        </Block>
      </Section>

      {/* ── 4. Finance ── */}
      <Section n={4} title="Finance">
        <Kpis items={[
          { label: 'Revenue', value: fmtGhs(finance.revenue) },
          { label: 'Total expenses', value: fmtGhs(finance.total_expenses) },
          { label: 'Net profit', value: fmtGhs(finance.net_profit), sub: `Margin ${margin(finance.revenue, finance.net_profit)}` },
          { label: 'Refunds', value: fmtGhs(finance.refunds) },
        ]} />
        <Block title="Operational P&L (orders & expenses)">
          <DataTable headers={['Line', 'Amount']} rows={[
            ['Revenue', fmtGhs(finance.revenue)],
            ['Total expenses', fmtGhs(finance.total_expenses)],
            ['Net profit', fmtGhs(finance.net_profit)],
          ]} />
        </Block>
        <Block title="Expenses by category">
          <DataTable headers={['Category', 'Amount']} rows={(finance.expenses_by_category || []).map((c: any) => [cap(c.category), fmtGhs(c.total)])} />
        </Block>
        {gl.available && (
          <Block title={`GL-based statement (${fmtNum(gl.entry_count)} journal entries)`}>
            <DataTable headers={['Line', 'Amount']} rows={[
              ['Revenue', fmtGhs(gl.revenue)],
              ['COGS', fmtGhs(gl.cogs)],
              ['Gross profit', fmtGhs(gl.gross_profit)],
              ['Total expenses', fmtGhs(gl.total_expenses)],
              ['Net profit', fmtGhs(gl.net_profit)],
            ]} />
          </Block>
        )}
      </Section>

      {/* ── 5. Procurement ── */}
      <Section n={5} title="Procurement">
        <Kpis items={[
          { label: 'Purchase orders', value: fmtNum(procurement.total_pos) },
          { label: 'Completed', value: fmtNum(procurement.completed_pos) },
          { label: 'Pending delivery', value: fmtNum(procurement.pending_delivery) },
          { label: 'Total spend', value: fmtGhs(procurement.total_spend) },
        ]} />
        <Block title="Spend by supplier">
          <DataTable headers={['Supplier', 'Spend']} rows={(procurement.by_supplier || []).map((s: any) => [s.supplier || '—', fmtGhs(s.total)])} />
        </Block>
        <Block title="Recent purchase orders">
          <DataTable headers={['PO #', 'Supplier', 'Amount', 'Status', 'Date']} rows={(procurement.recent_pos || []).map((p: any) => [p.po_number, p.supplier_name, fmtGhs(p.total_cost), cap(p.status), fmtDate(p.createdAt)])} />
        </Block>
      </Section>

      {/* ── 6. Human resources ── */}
      <Section n={6} title="Human Resources">
        <Kpis items={[
          { label: 'Employees', value: fmtNum(hr.total_employees) },
          { label: 'Active', value: fmtNum(hr.active) },
          { label: 'On leave', value: fmtNum(hr.on_leave) },
          { label: 'Payroll (approved)', value: fmtGhs(hr.payroll_total), sub: `${fmtNum(hr.payroll_runs)} runs` },
        ]} />
        <Block title="Headcount by department">
          <DataTable headers={['Department', 'Employees']} rows={(hr.by_department || []).map((d: any) => [d.department || 'Unassigned', fmtNum(d.count)])} />
        </Block>
      </Section>

      {/* ── 7. Customers & pipeline ── */}
      <Section n={7} title="Customers & Pipeline">
        <Kpis items={[
          { label: 'Customers', value: fmtNum(crm.total_customers) },
          { label: 'Active leads', value: fmtNum(crm.active_leads) },
          { label: 'Won leads', value: fmtNum(crm.won_leads) },
          { label: 'Pipeline value', value: fmtGhs(crm.pipeline_value) },
        ]} />
        <Block title="Lead pipeline by stage">
          <DataTable headers={['Stage', 'Leads']} rows={(crm.by_stage || []).map((s: any) => [cap(s.stage), fmtNum(s.count)])} />
        </Block>
        <Block title="Top customers by revenue">
          <DataTable headers={['Customer', 'Email', 'Orders', 'Revenue']} rows={(crm.top_customers || []).map((c: any) => [c.name, c.email || '—', fmtNum(c.order_count), fmtGhs(c.revenue)])} />
        </Block>
      </Section>

      <footer className="mt-8 pt-4 border-t border-gray-200 text-[11px] text-gray-400">
        {tenant?.business_name || 'GEMS'} · Detailed Business Report · {periodLabel} · {branchLabel}
      </footer>
    </div>
  );
}
