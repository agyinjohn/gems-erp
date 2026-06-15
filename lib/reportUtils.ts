export type ReportTab = 'overview' | 'sales' | 'inventory' | 'finance' | 'procurement' | 'hr' | 'crm';

export type DatePreset = 'this_month' | 'last_30' | 'ytd' | 'all';



export function formatDate(d: Date): string {

  return d.toISOString().split('T')[0];

}



export function getPresetRange(preset: DatePreset): { from: string; to: string } {

  const now = new Date();

  const to = formatDate(now);

  if (preset === 'all') return { from: '', to: '' };

  if (preset === 'last_30') {

    const from = new Date(now);

    from.setDate(from.getDate() - 29);

    return { from: formatDate(from), to };

  }

  if (preset === 'ytd') {

    return { from: formatDate(new Date(now.getFullYear(), 0, 1)), to };

  }

  return { from: formatDate(new Date(now.getFullYear(), now.getMonth(), 1)), to };

}



export function formatPeriodLabel(from: string, to: string): string {

  if (!from && !to) return 'All time';

  if (from && to) return `${from} → ${to}`;

  if (from) return `From ${from}`;

  return `Until ${to}`;

}



export const fmtGhs = (n: unknown) => `GH₵ ${parseFloat(String(n ?? 0)).toFixed(2)}`;



export function exportCsv(filename: string, rows: string[][]) {

  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');

  const a = document.createElement('a');

  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));

  a.download = filename;

  a.click();

  URL.revokeObjectURL(a.href);

}



export function printReport(title: string, contentId: string) {

  const el = document.getElementById(contentId);

  if (!el) return;

  const win = window.open('', '_blank', 'width=900,height=700');

  if (!win) return;

  win.document.write(`<html><head><title>${title}</title><style>

    body{font-family:Arial,sans-serif;font-size:13px;padding:32px;color:#111;}

    table{width:100%;border-collapse:collapse;margin:12px 0;}

    th,td{padding:8px 12px;text-align:left;border-bottom:1px solid #eee;}

    th{background:#f5f5f5;font-weight:600;}

    .text-right{text-align:right;}

    .grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:20px;}

    .card{border:1px solid #eee;border-radius:8px;padding:12px;}

    h1{font-size:20px;margin-bottom:4px;} .meta{color:#666;font-size:12px;margin-bottom:20px;}

    h2{font-size:16px;margin:24px 0 8px;border-bottom:1px solid #eee;padding-bottom:4px;}

    section{page-break-inside:avoid;margin-bottom:24px;}

  </style></head><body><h1>${title}</h1><div class="meta">Generated ${new Date().toLocaleString()}</div>${el.innerHTML}</body></html>`);

  win.document.close();

  win.focus();

  setTimeout(() => { win.print(); win.close(); }, 400);

}



function sectionHeader(title: string): string[][] {

  return [[], [title], ['Metric', 'Value']];

}



export function buildFullExportRows(data: {

  overview: any; sales: any; inventory: any; finance: any;

  procurement: any; hr: any; crm: any;

}, period: string): string[][] {

  const { overview, sales, inventory, finance, procurement, hr, crm } = data;

  const rows: string[][] = [

    ['GEMS Business Report'],

    ['Period', period],

    ['Generated', new Date().toLocaleString()],

  ];



  rows.push(...sectionHeader('Executive Summary'));

  rows.push(

    ['Revenue', String(overview.revenue ?? 0)],

    ['Orders', String(overview.orders ?? 0)],

    ['Net profit', String(overview.net_profit ?? 0)],

    ['Expenses', String(overview.expenses ?? 0)],

    ['Refunds', String(overview.refunds ?? 0)],

    ['Avg order value', String(overview.avg_order_value ?? 0)],

  );



  rows.push(...sectionHeader('Sales Trend'));

  rows.push(['Period', 'Revenue', 'Orders']);

  (sales.monthly || []).forEach((m: any) => rows.push([m.label, String(m.revenue), String(m.orders)]));



  rows.push(...sectionHeader('Top Products'));

  rows.push(['Product', 'Units', 'Revenue']);

  (sales.top_products || []).forEach((p: any) => rows.push([p.name, String(p.units_sold), String(p.revenue)]));



  rows.push(...sectionHeader('Branch Comparison'));

  rows.push(['Branch', 'Orders', 'Revenue']);

  (sales.by_branch || []).forEach((b: any) => rows.push([b.branch, String(b.orders), String(b.revenue)]));



  rows.push(...sectionHeader('Tax & Promotions'));

  rows.push(

    ['Subtotal', String(sales.subtotal ?? 0)],

    ['Tax collected', String(sales.tax_total ?? 0)],

    ['Discounts', String(sales.discount_total ?? 0)],

  );

  rows.push(['Coupon', 'Orders', 'Discount', 'Revenue']);

  (sales.by_coupon || []).forEach((c: any) => rows.push([c.code, String(c.orders), String(c.discount), String(c.revenue)]));



  rows.push(...sectionHeader('Finance'));

  rows.push(

    ['Revenue', String(finance.revenue ?? 0)],

    ['Expenses', String(finance.total_expenses ?? 0)],

    ['Net profit', String(finance.net_profit ?? 0)],

  );

  rows.push(['Category', 'Amount']);

  (finance.expenses_by_category || []).forEach((c: any) => rows.push([c.category, String(c.total)]));



  if (finance.gl_summary?.available) {

    rows.push(...sectionHeader('GL Summary'));

    rows.push(

      ['GL revenue', String(finance.gl_summary.revenue ?? 0)],

      ['COGS', String(finance.gl_summary.cogs ?? 0)],

      ['Gross profit', String(finance.gl_summary.gross_profit ?? 0)],

      ['GL net profit', String(finance.gl_summary.net_profit ?? 0)],

    );

  }



  rows.push(...sectionHeader('Inventory'));

  rows.push(

    ['Total products', String(inventory.total_products ?? 0)],

    ['Stock value', String(inventory.total_value ?? 0)],

    ['Low stock', String(inventory.low_stock_count ?? 0)],

    ['Out of stock', String(inventory.out_of_stock ?? 0)],

  );

  rows.push(['Movement type', 'Transactions', 'Units']);

  (inventory.movements_by_type || []).forEach((m: any) => rows.push([m.type, String(m.count), String(m.qty)]));



  rows.push(...sectionHeader('Procurement'));

  rows.push(

    ['Total POs', String(procurement.total_pos ?? 0)],

    ['Spend', String(procurement.total_spend ?? 0)],

  );

  rows.push(['Supplier', 'Spend']);

  (procurement.by_supplier || []).forEach((s: any) => rows.push([s.supplier, String(s.total)]));



  rows.push(...sectionHeader('HR'));

  rows.push(

    ['Employees', String(hr.total_employees ?? 0)],

    ['Active', String(hr.active ?? 0)],

    ['Payroll total', String(hr.payroll_total ?? 0)],

  );



  rows.push(...sectionHeader('CRM'));

  rows.push(

    ['Customers', String(crm.total_customers ?? 0)],

    ['Pipeline value', String(crm.pipeline_value ?? 0)],

    ['Active leads', String(crm.active_leads ?? 0)],

  );

  rows.push(['Customer', 'Orders', 'Revenue']);

  (crm.top_customers || []).forEach((c: any) => rows.push([c.name, String(c.order_count), String(c.revenue)]));



  return rows;

}



/** @deprecated use buildFullExportRows */

export function buildExportRows(tab: ReportTab, data: any, period: string): string[][] {

  return buildFullExportRows({ overview: tab === 'overview' ? data : {}, sales: tab === 'sales' ? data : {}, inventory: tab === 'inventory' ? data : {}, finance: tab === 'finance' ? data : {}, procurement: tab === 'procurement' ? data : {}, hr: tab === 'hr' ? data : {}, crm: tab === 'crm' ? data : {} }, period);

}

