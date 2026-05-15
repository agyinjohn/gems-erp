import { Shield, Zap, Globe, BarChart2 } from 'lucide-react';

export default function SiteFooter() {
  return (
    <footer className="bg-gray-900 text-white">

      {/* Trust bar */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Shield,    title: 'Enterprise Security', sub: 'SOC 2 compliant, 256-bit SSL' },
            { icon: Zap,       title: '99.9% Uptime',        sub: 'Guaranteed SLA for all plans' },
            { icon: Globe,     title: 'Works Everywhere',    sub: 'Multi-currency, multi-branch' },
            { icon: BarChart2, title: 'Real-Time Data',      sub: 'Live dashboards & reports' },
          ].map(b => {
            const Icon = b.icon;
            return (
              <div key={b.title} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-yellow-400/10 flex items-center justify-center text-yellow-400 flex-shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{b.title}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{b.sub}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main columns */}
      <div className="max-w-7xl mx-auto px-6 py-14">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">

          {/* Brand */}
          <div className="md:col-span-4">
            <img src="/ag.png" alt="GEMS Logo" className="h-20 w-auto object-contain mb-4" />
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              The all-in-one business management platform for growing companies in Africa. Stocks, Sales, Finance, HR, Procurement and CRM — all connected in real time.
            </p>
            <p className="text-xs font-semibold text-gray-300 uppercase tracking-wide mb-2">Get product updates</p>
            <div className="flex mb-6">
              <input type="email" placeholder="your@company.com"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-l-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 transition-colors" />
              <button className="bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold text-xs px-4 rounded-r-lg transition-colors flex-shrink-0">
                Subscribe
              </button>
            </div>
            <div className="flex gap-2">
              {[
                { label: 'Facebook',  href: 'https://www.facebook.com/share/1DkjiyTDzC/',   path: 'M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z' },
                { label: 'Instagram', href: 'https://www.instagram.com/gthink_company_ltd', path: 'M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37zm1.5-4.87h.01M6.5 19.5h11a3 3 0 003-3v-11a3 3 0 00-3-3h-11a3 3 0 00-3 3v11a3 3 0 003 3z' },
                { label: 'WhatsApp',  href: 'https://wa.me/233241550366',                   path: 'M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z' },
              ].map(s => (
                <a key={s.label} href={s.href} target="_blank" rel="noreferrer" aria-label={s.label}
                  className="w-9 h-9 rounded-lg bg-gray-800 hover:bg-yellow-400 text-gray-400 hover:text-gray-900 border border-gray-700 hover:border-yellow-400 flex items-center justify-center transition-all">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d={s.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Platform */}
          <div className="md:col-span-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-5 pb-3 border-b border-gray-700">Platform</h4>
            <ul className="space-y-3">
              {[
                { label: 'Features',     href: '/#features' },
                { label: 'How it Works', href: '/#how-it-works' },
                { label: 'Pricing',      href: '/#pricing' },
                { label: 'Demo Store',   href: '/store/gems-store' },
                { label: 'Get Started',  href: '/register' },
              ].map(l => (
                <li key={l.label}>
                  <a href={l.href} className="text-gray-400 hover:text-yellow-400 text-sm transition-colors">{l.label}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Modules */}
          <div className="md:col-span-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-5 pb-3 border-b border-gray-700">Modules</h4>
            <ul className="space-y-3">
              {[
                'Stocks & Inventory',
                'Sales & eCommerce',
                'Accounting & Finance',
                'Procurement',
                'HR & Payroll',
                'CRM',
                'Payment System',
                'POS Terminal',
              ].map(m => (
                <li key={m}>
                  <a href="/#features" className="text-gray-400 hover:text-yellow-400 text-sm transition-colors">{m}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Support + Legal */}
          <div className="md:col-span-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-5 pb-3 border-b border-gray-700">Support</h4>
            <ul className="space-y-3 mb-8">
              {[
                { icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', text: 'gthinkcompanylimited@gmail.com', href: 'mailto:gthinkcompanylimited@gmail.com' },
                { icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z', text: '+233 241 550 366 · +233 256 791 600', href: 'tel:+233241550366' },
                { icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', text: 'Mon – Fri, 8am – 6pm GMT', href: null },
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-400 flex-shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                    </svg>
                  </div>
                  {item.href
                    ? <a href={item.href} className="text-gray-400 hover:text-yellow-400 text-sm transition-colors">{item.text}</a>
                    : <span className="text-gray-400 text-sm">{item.text}</span>
                  }
                </li>
              ))}
            </ul>

            <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-5 pb-3 border-b border-gray-700">Legal</h4>
            <ul className="space-y-3">
              {[
                { label: 'Privacy Policy',   href: '/privacy' },
                { label: 'Terms of Service', href: '/terms' },
                { label: 'Cookie Policy',    href: '/cookies' },
              ].map(l => (
                <li key={l.label}>
                  <a href={l.href} className="text-gray-400 hover:text-yellow-400 text-sm transition-colors">{l.label}</a>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gray-800 bg-gray-950">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-gray-500 text-xs">© 2026 GTHINK Company Limited. All rights reserved.</p>
          <p className="text-gray-500 text-xs">GEMS — GTHINK Enterprise Management System</p>
        </div>
      </div>

    </footer>
  );
}
