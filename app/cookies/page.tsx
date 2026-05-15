import Link from 'next/link';
import { Package, Shield, Settings, BarChart2, Sliders, Globe, RefreshCw, Mail, Phone, Cookie } from 'lucide-react';
import SiteFooter from '@/components/SiteFooter';

export const metadata = { title: 'Cookie Policy — GEMS by GTHINK' };

const SECTIONS = [
  {
    id: 'what-are-cookies',
    icon: Cookie,
    title: 'What Are Cookies?',
    color: 'bg-yellow-50 text-yellow-600',
    content: `Cookies are small text files that are placed on your device when you visit a website or use a web application. They are widely used to make websites work more efficiently, remember your preferences, and provide information to site owners.`,
    bullets: [
      'Cookies are stored locally on your browser or device',
      'They help us recognise you when you return to the platform',
      'They enable features like staying logged in between sessions',
      'They help us understand how our platform is being used',
    ],
  },
  {
    id: 'essential-cookies',
    icon: Shield,
    title: 'Essential Cookies',
    color: 'bg-blue-50 text-blue-600',
    content: `Essential cookies are required for the GEMS platform to function correctly. Without these cookies, core features such as authentication and security cannot operate.`,
    bullets: [
      'Session cookies to keep you logged in securely',
      'Security tokens to protect against cross-site request forgery (CSRF)',
      'Load balancing cookies to ensure platform stability',
      'Preference cookies to remember your language and region settings',
    ],
    note: 'Essential cookies cannot be disabled as they are strictly necessary for the platform to function.',
    canDisable: false,
  },
  {
    id: 'performance-cookies',
    icon: BarChart2,
    title: 'Performance Cookies',
    color: 'bg-purple-50 text-purple-600',
    content: `Performance cookies help us understand how visitors interact with our platform by collecting anonymous usage data. This information is used to improve the performance and user experience of GEMS.`,
    bullets: [
      'Page load times and performance metrics',
      'Which features are used most frequently',
      'Error tracking and crash reporting',
      'Navigation patterns across the platform',
    ],
    note: 'All data collected by performance cookies is aggregated and anonymous — it cannot be used to identify you personally.',
    canDisable: true,
  },
  {
    id: 'functional-cookies',
    icon: Settings,
    title: 'Functional Cookies',
    color: 'bg-green-50 text-green-600',
    content: `Functional cookies allow the platform to remember choices you make and provide enhanced, personalised features. These cookies improve your experience but are not strictly necessary.`,
    bullets: [
      'Remembering your dashboard layout and preferences',
      'Storing your selected date formats and currency display',
      'Remembering your notification preferences',
      'Keeping your sidebar collapsed or expanded state',
    ],
    canDisable: true,
  },
  {
    id: 'analytics-cookies',
    icon: Sliders,
    title: 'Analytics Cookies',
    color: 'bg-orange-50 text-orange-600',
    content: `Analytics cookies allow us to measure and analyse how our platform is used so we can improve it over time. Data collected is aggregated and does not identify individual users.`,
    bullets: [
      'Number of visitors and sessions on the platform',
      'Which modules and pages are most visited',
      'User journey and flow through the platform',
      'Bounce rates and session durations',
    ],
    note: 'We use analytics data solely to improve GEMS. We do not share this data with advertising networks.',
    canDisable: true,
  },
  {
    id: 'third-party-cookies',
    icon: Globe,
    title: 'Third-Party Cookies',
    color: 'bg-cyan-50 text-cyan-600',
    content: `Some features of our platform use third-party services that may set their own cookies. We do not control these cookies and recommend reviewing the privacy policies of these third parties.`,
    bullets: [
      'Paystack — sets cookies during the payment checkout process',
      'Google Analytics — sets cookies for anonymous usage tracking',
      'Intercom or support tools — may set cookies for live chat features',
    ],
    note: 'Third-party cookies are governed by the respective third-party privacy policies, not this Cookie Policy.',
  },
  {
    id: 'managing-cookies',
    icon: RefreshCw,
    title: 'Managing & Controlling Cookies',
    color: 'bg-pink-50 text-pink-600',
    content: `You have full control over cookies on your device. You can manage, restrict, or delete cookies at any time through your browser settings.`,
    bullets: [
      'Google Chrome — Settings → Privacy and Security → Cookies',
      'Mozilla Firefox — Settings → Privacy & Security → Cookies',
      'Safari — Preferences → Privacy → Manage Website Data',
      'Microsoft Edge — Settings → Cookies and Site Permissions',
    ],
    note: 'Disabling essential cookies may affect the functionality of the GEMS platform, including your ability to log in and use core features.',
  },
  {
    id: 'updates',
    icon: RefreshCw,
    title: 'Updates to This Policy',
    color: 'bg-indigo-50 text-indigo-600',
    content: `We may update this Cookie Policy from time to time to reflect changes in technology, legislation, or our data practices.`,
    bullets: [
      'Any changes will be posted on this page with an updated effective date',
      'Significant changes will be communicated via email or in-app notification',
      'Your continued use of the platform after changes constitutes acceptance',
    ],
  },
];

const COOKIE_SUMMARY = [
  { type: 'Essential',    purpose: 'Authentication & security',      canDisable: false },
  { type: 'Performance',  purpose: 'Anonymous usage analytics',       canDisable: true },
  { type: 'Functional',   purpose: 'Preferences & personalisation',   canDisable: true },
  { type: 'Analytics',    purpose: 'Platform improvement insights',   canDisable: true },
  { type: 'Third-Party',  purpose: 'Paystack, Google Analytics',      canDisable: true },
];

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-gray-50 font-sans">

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-[0_1px_12px_rgba(0,0,0,0.06)]">
        <div className="max-w-7xl mx-auto px-6 h-[68px] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-[#0D3B6E] rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-extrabold text-xl text-[#0D3B6E]">GEMS</div>
              <div className="text-[10px] text-gray-400">GTHINK Enterprise Management System</div>
            </div>
          </Link>
          <Link href="/" className="text-sm font-semibold text-[#0D3B6E] hover:underline">← Back to Home</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-[#0D3B6E] via-[#1A5294] to-[#0D3B6E] text-white py-16 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <span className="inline-block text-xs font-bold uppercase tracking-widest bg-white/10 border border-white/20 px-3 py-1.5 rounded-full mb-4">Legal</span>
            <h1 className="text-4xl sm:text-5xl font-extrabold mb-3">Cookie Policy</h1>
            <p className="text-blue-200 text-sm">Effective: January 1, 2025 · Last updated: June 1, 2025</p>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <Link href="/privacy" className="text-xs font-semibold text-blue-200 hover:text-white border border-white/20 hover:border-white/40 px-4 py-2 rounded-lg transition-all">Privacy Policy</Link>
            <Link href="/terms" className="text-xs font-semibold text-blue-200 hover:text-white border border-white/20 hover:border-white/40 px-4 py-2 rounded-lg transition-all">Terms of Service</Link>
          </div>
        </div>
      </section>

      {/* Highlight cards */}
      <section className="max-w-5xl mx-auto px-6 -mt-6 mb-10">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: Shield,    label: '1 Required Type',    sub: 'Essential cookies only' },
            { icon: Sliders,   label: '4 Optional Types',   sub: 'You can disable these' },
            { icon: Globe,     label: 'Third-Party',        sub: 'Paystack & Analytics' },
            { icon: Settings,  label: 'Full Control',       sub: 'Manage via browser' },
          ].map(({ icon: Icon, label, sub }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
              <div className="w-9 h-9 bg-[#0D3B6E]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-[#0D3B6E]" />
              </div>
              <div>
                <div className="text-sm font-bold text-gray-900">{label}</div>
                <div className="text-xs text-gray-400">{sub}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Content */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="grid lg:grid-cols-12 gap-8 items-start">

          {/* Sidebar TOC */}
          <aside className="hidden lg:block lg:col-span-3 sticky top-24">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Contents</p>
              <ul className="space-y-2">
                {SECTIONS.map((s, i) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`} className="flex items-center gap-2 text-xs text-gray-500 hover:text-[#0D3B6E] transition-colors py-1">
                      <span className="w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center text-[9px] font-bold text-gray-400 flex-shrink-0">{i + 1}</span>
                      {s.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Cookie types quick ref */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Cookie Types</p>
              <div className="space-y-2">
                {COOKIE_SUMMARY.map(({ type, canDisable }) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">{type}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${canDisable ? 'bg-yellow-50 text-yellow-600' : 'bg-green-50 text-green-600'}`}>
                      {canDisable ? 'Optional' : 'Required'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* Main content */}
          <div className="lg:col-span-9 space-y-6">

            {/* Intro */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <p className="text-gray-500 leading-relaxed text-sm">
                This Cookie Policy explains how <span className="font-semibold text-gray-900">GTHINK Company Limited</span> uses cookies and similar tracking technologies on the GEMS platform. By using GEMS, you consent to the use of cookies as described in this policy.
              </p>
            </div>

            {/* Cookie summary table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-base font-extrabold text-gray-900 mb-4">Cookie Summary</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-wide pb-3 pr-4">Type</th>
                      <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-wide pb-3 pr-4">Purpose</th>
                      <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-wide pb-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {COOKIE_SUMMARY.map(({ type, purpose, canDisable }) => (
                      <tr key={type}>
                        <td className="py-3 pr-4 font-semibold text-gray-900 text-sm">{type}</td>
                        <td className="py-3 pr-4 text-gray-500 text-sm">{purpose}</td>
                        <td className="py-3">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${canDisable ? 'bg-yellow-50 text-yellow-600' : 'bg-green-50 text-green-600'}`}>
                            {canDisable ? 'Optional' : 'Required'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sections */}
            {SECTIONS.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={s.id} id={s.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 scroll-mt-28">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Section {i + 1}</span>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-extrabold text-gray-900 leading-tight">{s.title}</h2>
                        {'canDisable' in s && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.canDisable ? 'bg-yellow-50 text-yellow-600' : 'bg-green-50 text-green-600'}`}>
                            {s.canDisable ? 'Optional' : 'Required'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-500 text-sm leading-relaxed mb-3">{s.content}</p>
                  <ul className="space-y-2 mb-3">
                    {s.bullets.map(b => (
                      <li key={b} className="flex items-start gap-2.5 text-sm text-gray-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0D3B6E] flex-shrink-0 mt-1.5" />
                        {b}
                      </li>
                    ))}
                  </ul>
                  {s.note && (
                    <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 mt-3">
                      <p className="text-xs text-gray-500 leading-relaxed">{s.note}</p>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Contact card */}
            <div className="bg-gradient-to-br from-[#0D3B6E] to-[#1A5294] rounded-2xl p-6 text-white">
              <h3 className="font-extrabold text-lg mb-2">Questions about cookies?</h3>
              <p className="text-blue-200 text-sm mb-5">Our team is happy to help clarify anything in this Cookie Policy.</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <a href="mailto:gthinkcompanylimited@gmail.com"
                  className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
                  <Mail className="w-4 h-4" /> gthinkcompanylimited@gmail.com
                </a>
                <a href="tel:+233241550366"
                  className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
                  <Phone className="w-4 h-4" /> +233 241 550 366
                </a>
              </div>
            </div>

          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
