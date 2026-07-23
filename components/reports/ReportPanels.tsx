'use client';

import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, ComposedChart, Line, Area,
} from 'recharts';
import {
  TrendingUp, TrendingDown, ShoppingCart, DollarSign, AlertTriangle, Handshake,
  ExternalLink, Users, Package, Percent, Tag, Receipt,
} from 'lucide-react';
import { StatCard } from '@/components/ui';
import { fmtGhs } from '@/lib/reportUtils';
import {
  CHART_COLORS, CHART_TOOLTIP, ChangeBadge, ChartEmpty, ReportBlock, ReportSection,
  MetricGrid, MetricStrip, DataTable, StockHealthBars,
} from './shared';

const CHART_H = 280;
const CHART_H_SM = 240;

export interface ReportsBundle {
  overview: any;
  sales: any;
  inventory: any;
  finance: any;
  procurement: any;
  hr: any;
  crm: any;
}

interface Props {
  data: ReportsBundle;
  periodLabel: string;
  /** When provided, only sections whose id is listed are rendered (tabbed mode). */
  sections?: string[];
}

function pctMargin(revenue: number, profit: number) {
  if (!revenue) return '0%';
  return `${((profit / revenue) * 100).toFixed(1)}%`;
}

export default function ReportPanels({ data, periodLabel, sections }: Props) {
  const { overview, sales, inventory, finance, procurement, hr, crm } = data;
  const show = (id: string) => !sections || sections.includes(id);

  const paymentChart = (sales.by_payment || []).map((p: any) => ({
    name: p.method || 'Unknown',
    revenue: p.revenue,
    orders: p.orders,
  }));

  const topProductsChart = (sales.top_products || []).slice(0, 8).map((p: any) => ({
    name: p.name?.length > 22 ? `${p.name.slice(0, 22)}…` : p.name,
    revenue: p.revenue,
    units: p.units_sold,
  }));

  const healthyStock = Math.max(
    0,
    (inventory.total_products ?? 0) - (inventory.low_stock_count ?? 0) - (inventory.out_of_stock ?? 0),
  );

  const plData = [
    { name: 'Revenue', value: finance.revenue ?? overview.revenue ?? 0, fill: '#22c55e' },
    { name: 'Expenses', value: finance.total_expenses ?? overview.expenses ?? 0, fill: '#ef4444' },
    { name: 'Net profit', value: finance.net_profit ?? overview.net_profit ?? 0, fill: '#0D3B6E' },
  ];

  return (
    <>
      {/* Executive summary */}
      {show('summary') && (
      <ReportSection id="summary" title="Executive summary" subtitle={`Key metrics for ${periodLabel}`}>
        <MetricGrid>
          <div>
            <StatCard label="Revenue" value={fmtGhs(overview.revenue)} icon={<TrendingUp className="w-6 h-6 text-gray-500" />} color="bg-gray-50" />
            <ChangeBadge value={overview.revenue_change} />
          </div>
          <div>
            <StatCard label="Orders" value={String(overview.orders ?? 0)} icon={<ShoppingCart className="w-6 h-6 text-gray-500" />} color="bg-gray-50" />
            <ChangeBadge value={overview.orders_change} />
          </div>
          <StatCard
            label="Net profit"
            value={fmtGhs(overview.net_profit)}
            icon={<DollarSign className="w-6 h-6 text-gray-500" />}
            color="bg-gray-50"
            sub={`Margin ${pctMargin(overview.revenue, overview.net_profit)}`}
          />
          <StatCard label="Avg order" value={fmtGhs(overview.avg_order_value)} icon={<ShoppingCart className="w-6 h-6 text-gray-500" />} color="bg-gray-50" />
        </MetricGrid>
        <MetricGrid>
          <StatCard label="Expenses" value={fmtGhs(overview.expenses)} icon={<TrendingDown className="w-6 h-6 text-gray-500" />} color="bg-gray-50" />
          <StatCard label="Refunds" value={fmtGhs(overview.refunds)} icon={<TrendingDown className="w-6 h-6 text-gray-500" />} color="bg-gray-50" />
          <StatCard label="Pipeline" value={fmtGhs(overview.pipeline_value)} icon={<Handshake className="w-6 h-6 text-gray-500" />} color="bg-gray-50" sub={`${overview.pipeline_leads ?? 0} active leads`} />
          <StatCard label="Stock value" value={fmtGhs(inventory.total_value)} icon={<Package className="w-6 h-6 text-gray-500" />} color="bg-gray-50" sub={`${inventory.low_stock_count ?? 0} low · ${inventory.out_of_stock ?? 0} out`} />
        </MetricGrid>
      </ReportSection>
      )}

      {/* Sales performance */}
      {show('sales') && (
      <ReportSection id="sales" title="Sales performance" subtitle="Revenue trends, channels and product mix">
        <ReportBlock title="Revenue & order trend" subtitle="Monthly paid orders in selected period">
          {sales.monthly?.length ? (
            <ResponsiveContainer width="100%" height={CHART_H}>
              <ComposedChart data={sales.monthly}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1A6BB5" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#1A6BB5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip {...CHART_TOOLTIP} formatter={(v: any, name: any) => [name === 'orders' ? v : fmtGhs(v), name === 'orders' ? 'Orders' : 'Revenue']} />
                <Legend />
                <Area yAxisId="left" type="monotone" dataKey="revenue" name="Revenue" stroke="#1A6BB5" fill="url(#revGrad)" strokeWidth={2} />
                <Line yAxisId="right" type="monotone" dataKey="orders" name="Orders" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : <ChartEmpty />}
        </ReportBlock>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
          <ReportBlock title="Revenue by channel">
            {sales.by_source?.length ? (
              <ResponsiveContainer width="100%" height={CHART_H_SM}>
                <PieChart>
                  <Pie
                    data={sales.by_source}
                    dataKey="revenue"
                    nameKey="source"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                    label={({ name, percent }: any) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  >
                    {sales.by_source.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip {...CHART_TOOLTIP} formatter={(v: any) => fmtGhs(v)} />
                </PieChart>
              </ResponsiveContainer>
            ) : <ChartEmpty />}
          </ReportBlock>

          <ReportBlock title="Payment methods" subtitle="Revenue by payment type">
            {paymentChart.length ? (
              <ResponsiveContainer width="100%" height={CHART_H_SM}>
                <BarChart data={paymentChart} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} />
                  <Tooltip {...CHART_TOOLTIP} formatter={(v: any) => fmtGhs(v)} />
                  <Bar dataKey="revenue" fill="#0D3B6E" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <ChartEmpty />}
          </ReportBlock>
        </div>

        <ReportBlock title="Top products by revenue" subtitle="Best sellers in period">
          {topProductsChart.length ? (
            <ResponsiveContainer width="100%" height={Math.max(220, topProductsChart.length * 36)}>
              <BarChart data={topProductsChart} layout="vertical" margin={{ left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={130} />
                <Tooltip {...CHART_TOOLTIP} formatter={(v: any, name: any) => [name === 'units' ? v : fmtGhs(v), name === 'units' ? 'Units sold' : 'Revenue']} />
                <Bar dataKey="revenue" name="Revenue" fill="#1A6BB5" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <ChartEmpty />}
        </ReportBlock>

        {sales.by_branch?.length > 1 && (
          <ReportBlock title="Branch comparison" subtitle="Revenue across locations (all branches)">
            <ResponsiveContainer width="100%" height={CHART_H_SM}>
              <BarChart data={sales.by_branch}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="branch" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip {...CHART_TOOLTIP} formatter={(v: any, name: any) => [name === 'orders' ? v : fmtGhs(v), name === 'orders' ? 'Orders' : 'Revenue']} />
                <Legend />
                <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill="#0D3B6E" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="orders" name="Orders" fill="#60A5FA" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ReportBlock>
        )}
      </ReportSection>
      )}

      {/* Tax & promotions */}
      {show('tax-promo') && (
      <ReportSection id="tax-promo" title="Tax & promotions" subtitle="VAT collected, discounts and coupon performance">
        <MetricGrid>
          <StatCard label="Subtotal" value={fmtGhs(sales.subtotal)} icon={<Receipt className="w-6 h-6 text-gray-500" />} color="bg-gray-50" sub="Before tax" />
          <StatCard label="Tax collected" value={fmtGhs(sales.tax_total)} icon={<Receipt className="w-6 h-6 text-gray-500" />} color="bg-gray-50" />
          <StatCard label="Discounts" value={fmtGhs(sales.discount_total)} icon={<Tag className="w-6 h-6 text-gray-500" />} color="bg-gray-50" />
          <StatCard label="Coupon orders" value={String(overview.coupon_orders ?? 0)} icon={<Tag className="w-6 h-6 text-gray-500" />} color="bg-gray-50" sub={fmtGhs(overview.coupon_discount_total)} />
        </MetricGrid>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
          {sales.by_coupon?.length > 0 ? (
            <ReportBlock title="Coupon performance" subtitle="By redemption count">
              <ResponsiveContainer width="100%" height={CHART_H_SM}>
                <BarChart data={sales.by_coupon} layout="vertical" margin={{ left: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="code" type="category" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip {...CHART_TOOLTIP} formatter={(v: any, name: any) => [name === 'orders' ? v : fmtGhs(v), name === 'orders' ? 'Orders' : 'Discount given']} />
                  <Bar dataKey="orders" name="Orders" fill="#0D3B6E" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ReportBlock>
          ) : (
            <ReportBlock title="Coupon performance">
              <ChartEmpty message="No coupon redemptions in this period" />
            </ReportBlock>
          )}

          {sales.by_coupon?.length > 0 && (
            <ReportBlock title="Coupon detail">
              <DataTable
                headers={['Code', 'Orders', 'Discount', 'Revenue']}
                rows={sales.by_coupon.map((c: any) => [c.code, c.orders, fmtGhs(c.discount), fmtGhs(c.revenue)])}
              />
            </ReportBlock>
          )}
        </div>
      </ReportSection>
      )}

      {/* Financial health */}
      {show('finance') && (
      <ReportSection id="finance" title="Financial health" subtitle="Revenue, costs and profitability">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-[#0D3B6E]/15 bg-[#0D3B6E]/5 px-4 py-3">
          <p className="text-sm text-[#0D3B6E]">Operational P&amp;L from orders and expenses — use Accounting for GL statements.</p>
          <Link href="/accounting/overview" className="btn-secondary text-sm inline-flex items-center gap-1 shrink-0">
            Accounting <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6">
          <ReportBlock title="Profit & loss snapshot" className="xl:col-span-1">
            <ResponsiveContainer width="100%" height={CHART_H_SM}>
              <BarChart data={plData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip {...CHART_TOOLTIP} formatter={(v: any) => fmtGhs(v)} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {plData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs">
              <div className="text-gray-500">Procurement spend</div>
              <div className="text-right font-semibold tabular-nums">{fmtGhs(procurement.total_spend)}</div>
              <div className="text-gray-500">Payroll (period)</div>
              <div className="text-right font-semibold tabular-nums">{fmtGhs(hr.payroll_total)}</div>
            </div>
          </ReportBlock>

          <ReportBlock title="Expense breakdown" subtitle="By category" className="xl:col-span-2">
            {finance.expenses_by_category?.length ? (
              <ResponsiveContainer width="100%" height={CHART_H}>
                <PieChart>
                  <Pie
                    data={finance.expenses_by_category}
                    dataKey="total"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, percent }: any) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  >
                    {finance.expenses_by_category.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip {...CHART_TOOLTIP} formatter={(v: any) => fmtGhs(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <ChartEmpty message="No expenses recorded in this period" />}
          </ReportBlock>
        </div>

        <MetricGrid>
          <StatCard label="Gross revenue" value={fmtGhs(finance.revenue)} icon={<TrendingUp className="w-6 h-6 text-gray-500" />} color="bg-gray-50" />
          <StatCard label="Total expenses" value={fmtGhs(finance.total_expenses)} icon={<TrendingDown className="w-6 h-6 text-gray-500" />} color="bg-gray-50" />
          <StatCard label="Net profit" value={fmtGhs(finance.net_profit)} icon={<DollarSign className="w-6 h-6 text-gray-500" />} color="bg-gray-50" />
          <StatCard label="Profit margin" value={pctMargin(finance.revenue, finance.net_profit)} icon={<Percent className="w-6 h-6 text-gray-500" />} color="bg-gray-50" />
        </MetricGrid>

        {finance.gl_summary?.available && (
          <ReportBlock title="General ledger summary" subtitle={`From ${finance.gl_summary.entry_count} journal entries in period`}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Operational (orders + expenses)</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-600">Revenue</span><span className="font-semibold tabular-nums">{fmtGhs(finance.revenue)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Expenses</span><span className="font-semibold tabular-nums">{fmtGhs(finance.total_expenses)}</span></div>
                  <div className="flex justify-between border-t border-gray-100 pt-2"><span className="text-gray-800 font-medium">Net profit</span><span className="font-bold tabular-nums text-[#0D3B6E]">{fmtGhs(finance.net_profit)}</span></div>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">GL-based (posted journals)</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-600">Revenue</span><span className="font-semibold tabular-nums">{fmtGhs(finance.gl_summary.revenue)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">COGS</span><span className="font-semibold tabular-nums">{fmtGhs(finance.gl_summary.cogs)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Gross profit</span><span className="font-semibold tabular-nums">{fmtGhs(finance.gl_summary.gross_profit)}</span></div>
                  <div className="flex justify-between border-t border-gray-100 pt-2"><span className="text-gray-800 font-medium">Net profit</span><span className="font-bold tabular-nums text-[#0D3B6E]">{fmtGhs(finance.gl_summary.net_profit)}</span></div>
                </div>
              </div>
            </div>
            {finance.gl_summary.expenses_by_category?.length > 0 && (
              <div className="mt-5 pt-5 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 mb-3">Top GL expense accounts</p>
                <DataTable
                  headers={['Account', 'Amount']}
                  rows={finance.gl_summary.expenses_by_category.map((e: any) => [e.category, fmtGhs(e.total)])}
                />
              </div>
            )}
          </ReportBlock>
        )}
      </ReportSection>
      )}

      {/* Inventory */}
      {show('inventory') && (
      <ReportSection id="inventory" title="Inventory" subtitle="Stock levels and warehouse activity">
        <MetricGrid>
          <StatCard label="Products" value={String(inventory.total_products ?? 0)} icon={<Package className="w-6 h-6 text-gray-500" />} color="bg-gray-50" />
          <StatCard label="Stock value" value={fmtGhs(inventory.total_value)} icon={<DollarSign className="w-6 h-6 text-gray-500" />} color="bg-gray-50" />
          <StatCard label="Low stock" value={String(inventory.low_stock_count ?? 0)} icon={<AlertTriangle className="w-6 h-6 text-gray-500" />} color="bg-gray-50" />
          <StatCard label="Out of stock" value={String(inventory.out_of_stock ?? 0)} icon={<AlertTriangle className="w-6 h-6 text-gray-500" />} color="bg-gray-50" />
        </MetricGrid>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
          <ReportBlock title="Stock health">
            <StockHealthBars
              healthy={healthyStock}
              low={inventory.low_stock_count ?? 0}
              out={inventory.out_of_stock ?? 0}
              total={inventory.total_products ?? 0}
            />
          </ReportBlock>

          {inventory.by_category?.length > 0 && (
            <ReportBlock title="Inventory value by category">
              <ResponsiveContainer width="100%" height={CHART_H_SM}>
                <BarChart data={inventory.by_category}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="category" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip {...CHART_TOOLTIP} formatter={(v: any) => fmtGhs(v)} />
                  <Bar dataKey="value" fill="#0D3B6E" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ReportBlock>
          )}
        </div>

        {inventory.low_stock?.length > 0 && (
          <ReportBlock title="Low stock alert" subtitle="Items at or below threshold">
            <DataTable
              headers={['Product', 'SKU', 'Stock', 'Threshold']}
              rows={inventory.low_stock.map((p: any) => [p.name, p.sku, p.stock_qty, p.low_stock_threshold])}
            />
          </ReportBlock>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
          <ReportBlock title="Stock movement trend" subtitle={periodLabel}>
            {inventory.stock_trend?.length ? (
              <ResponsiveContainer width="100%" height={CHART_H_SM}>
                <BarChart data={inventory.stock_trend} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip {...CHART_TOOLTIP} />
                  <Legend />
                  <Bar dataKey="in" name="Stock in" fill="#22c55e" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="out" name="Stock out" fill="#ef4444" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <ChartEmpty message="No stock movements in this period" />}
          </ReportBlock>

          {inventory.movements_by_type?.length > 0 && (
            <ReportBlock title="Movements by type">
              <ResponsiveContainer width="100%" height={CHART_H_SM}>
                <BarChart data={inventory.movements_by_type}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="type" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip {...CHART_TOOLTIP} formatter={(v: any, name: any) => [v, name === 'qty' ? 'Units moved' : 'Transactions']} />
                  <Legend />
                  <Bar dataKey="count" name="Transactions" fill="#0D3B6E" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="qty" name="Units moved" fill="#60A5FA" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ReportBlock>
          )}
        </div>

        {inventory.top_moved_products?.length > 0 && (
          <ReportBlock title="Most moved products" subtitle="Highest unit movement in period">
            <ResponsiveContainer width="100%" height={Math.max(200, inventory.top_moved_products.length * 32)}>
              <BarChart data={inventory.top_moved_products} layout="vertical" margin={{ left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} />
                <Tooltip {...CHART_TOOLTIP} formatter={(v: any, name: any) => [v, name === 'qty' ? 'Units' : 'Moves']} />
                <Bar dataKey="qty" name="Units" fill="#1A6BB5" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ReportBlock>
        )}
      </ReportSection>
      )}

      {/* Procurement */}
      {show('procurement') && (
      <ReportSection id="procurement" title="Procurement" subtitle="Purchase orders and supplier spend">
        <MetricGrid>
          <StatCard label="Total POs" value={String(procurement.total_pos ?? 0)} icon={<ShoppingCart className="w-6 h-6 text-gray-500" />} color="bg-gray-50" />
          <StatCard label="Spend" value={fmtGhs(procurement.total_spend)} icon={<DollarSign className="w-6 h-6 text-gray-500" />} color="bg-gray-50" />
          <StatCard label="Pending delivery" value={String(procurement.pending_delivery ?? 0)} icon={<AlertTriangle className="w-6 h-6 text-gray-500" />} color="bg-gray-50" />
          <StatCard label="Completed" value={String(procurement.completed_pos ?? 0)} icon={<TrendingUp className="w-6 h-6 text-gray-500" />} color="bg-gray-50" />
        </MetricGrid>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
          {procurement.by_supplier?.length > 0 && (
            <ReportBlock title="Spend by supplier">
              <ResponsiveContainer width="100%" height={CHART_H_SM}>
                <BarChart data={procurement.by_supplier.slice(0, 8)} layout="vertical" margin={{ left: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis dataKey="supplier" type="category" tick={{ fontSize: 11 }} width={110} />
                  <Tooltip {...CHART_TOOLTIP} formatter={(v: any) => fmtGhs(v)} />
                  <Bar dataKey="total" fill="#0D3B6E" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ReportBlock>
          )}

          {procurement.recent_pos?.length > 0 && (
            <ReportBlock title="Recent purchase orders">
              <DataTable
                headers={['PO #', 'Supplier', 'Total', 'Status']}
                rows={procurement.recent_pos.map((p: any) => [p.po_number, p.supplier_name, fmtGhs(p.total_cost), p.status])}
              />
            </ReportBlock>
          )}
        </div>
      </ReportSection>
      )}

      {/* People & customers */}
      {show('people') && (
      <ReportSection id="people" title="People & customers" subtitle="Workforce, pipeline and buyer insights">
        <MetricGrid>
          <StatCard label="Employees" value={String(hr.total_employees ?? 0)} icon={<Users className="w-6 h-6 text-gray-500" />} color="bg-gray-50" sub={`${hr.active ?? 0} active`} />
          <StatCard label="On leave today" value={String(hr.on_leave ?? 0)} icon={<AlertTriangle className="w-6 h-6 text-gray-500" />} color="bg-gray-50" />
          <StatCard label="Customers" value={String(crm.total_customers ?? 0)} icon={<Handshake className="w-6 h-6 text-gray-500" />} color="bg-gray-50" />
          <StatCard label="Pipeline" value={fmtGhs(crm.pipeline_value)} icon={<DollarSign className="w-6 h-6 text-gray-500" />} color="bg-gray-50" sub={`${crm.active_leads ?? 0} active · ${crm.won_leads ?? 0} won`} />
        </MetricGrid>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
          {hr.by_department?.length > 0 && (
            <ReportBlock title="Headcount by department">
              <ResponsiveContainer width="100%" height={CHART_H_SM}>
                <BarChart data={hr.by_department} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="department" type="category" tick={{ fontSize: 11 }} width={110} />
                  <Tooltip {...CHART_TOOLTIP} />
                  <Bar dataKey="count" fill="#1A6BB5" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ReportBlock>
          )}

          {crm.by_stage?.length > 0 && (
            <ReportBlock title="Lead pipeline by stage">
              <ResponsiveContainer width="100%" height={CHART_H_SM}>
                <BarChart data={crm.by_stage}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip {...CHART_TOOLTIP} />
                  <Bar dataKey="count" fill="#0D3B6E" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ReportBlock>
          )}
        </div>

        {crm.top_customers?.length > 0 && (
          <ReportBlock title="Top buyers" subtitle="By revenue in period">
            <DataTable
              headers={['Customer', 'Orders', 'Revenue']}
              rows={crm.top_customers.map((c: any) => [
                `${c.name}${c.email ? ` (${c.email})` : ''}`,
                c.order_count,
                fmtGhs(c.revenue),
              ])}
            />
          </ReportBlock>
        )}
      </ReportSection>
      )}

      {/* POS operations */}
      {show('pos') && (sales.recent_shifts?.length > 0 || overview.pos_shifts_closed > 0) && (
        <ReportSection id="pos" title="POS operations" subtitle="Shift activity and cash handling">
          <ReportBlock title="Shift summary" subtitle={`${overview.pos_shifts_closed ?? 0} shifts closed in period`}>
            <MetricStrip
              items={[
                { label: 'Shifts closed', value: String(overview.pos_shifts_closed ?? 0) },
                { label: 'Cash variance', value: fmtGhs(overview.pos_cash_variance) },
                ...(sales.recent_shifts?.[0] ? [{
                  label: 'Latest shift',
                  value: sales.recent_shifts[0].shift_number,
                  sub: sales.recent_shifts[0].closed_at
                    ? new Date(sales.recent_shifts[0].closed_at).toLocaleDateString()
                    : undefined,
                }] : []),
                ...(sales.recent_shifts?.[0] ? [{
                  label: 'Latest sales',
                  value: fmtGhs(sales.recent_shifts[0].sales_total),
                  sub: `${sales.recent_shifts[0].sales_count ?? 0} transactions`,
                }] : []),
              ]}
            />
            {sales.recent_shifts?.length > 0 && (
              <div className="mt-5 pt-5 border-t border-gray-100">
                <DataTable
                  headers={['Shift', 'Closed', 'Sales', 'Variance']}
                  rows={sales.recent_shifts.map((s: any) => [
                    s.shift_number,
                    s.closed_at ? new Date(s.closed_at).toLocaleDateString() : '—',
                    `${fmtGhs(s.sales_total)} (${s.sales_count})`,
                    fmtGhs(s.cash_variance),
                  ])}
                />
              </div>
            )}
          </ReportBlock>
        </ReportSection>
      )}
    </>
  );
}
