export type ProductMode = 'full' | 'pos' | 'storefront' | 'accounting';

export const PRODUCT_MODE = (process.env.NEXT_PUBLIC_PRODUCT_MODE || 'full').toLowerCase() as ProductMode;

export const PRODUCT_LABELS: Record<ProductMode, string> = {
  full: 'GEMS ERP',
  pos: 'GEMS POS',
  storefront: 'GEMS Store',
  accounting: 'GEMS Accounting',
};

/** Default landing route after login per deployment mode */
export const MODE_HOME: Record<ProductMode, string> = {
  full: '/dashboard',
  pos: '/pos',
  storefront: '/store-settings',
  accounting: '/accounting/overview',
};

/** Merchant app routes allowed in each product bundle (null = all) */
export const MODE_NAV: Record<ProductMode, string[] | null> = {
  full: null,
  pos: ['/pos', '/inventory', '/orders', '/payment-logs', '/users', '/branches', '/billing', '/dashboard', '/ess', '/reports'],
  storefront: ['/store-settings', '/catalog', '/orders', '/users', '/branches', '/billing', '/dashboard', '/ess', '/api-docs'],
  accounting: ['/accounting', '/payment-logs', '/approvals', '/reports', '/users', '/billing', '/dashboard', '/ess'],
};

const PUBLIC_APP_PATHS = [
  '/',
  '/login',
  '/register',
  '/roadmap',
  '/changelog',
  '/pricing',
  '/platform',
  '/store',
  '/api-docs',
];

export function isPublicAppPath(pathname: string): boolean {
  return PUBLIC_APP_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export function isNavAllowed(href: string, mode: ProductMode = PRODUCT_MODE): boolean {
  if (mode === 'full') return true;
  const allowed = MODE_NAV[mode] || [];
  return allowed.some((p) => href === p || href.startsWith(`${p}/`));
}

export function isAppPathAllowed(pathname: string, mode: ProductMode = PRODUCT_MODE): boolean {
  if (mode === 'full') return true;
  if (isPublicAppPath(pathname)) return true;
  if (pathname.startsWith('/platform')) return true;
  const allowed = MODE_NAV[mode] || [];
  return allowed.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function getLoginRedirect(role: string, mode: ProductMode = PRODUCT_MODE): string {
  if (mode !== 'full') return MODE_HOME[mode] || '/dashboard';
  const roleRedirects: Record<string, string> = {
    platform_admin: '/platform',
    employee: '/ess',
    sales_staff: '/pos',
    warehouse_staff: '/inventory',
    accountant: '/accounting/overview',
  };
  return roleRedirects[role] ?? MODE_HOME[mode] ?? '/dashboard';
}
