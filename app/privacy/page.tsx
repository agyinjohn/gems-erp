import Link from 'next/link';
import { Package, Shield, Eye, Lock, Trash2, Bell, Globe, UserCheck, RefreshCw, Mail, Phone } from 'lucide-react';
import SiteFooter from '@/components/SiteFooter';

export const metadata = { title: 'Privacy Policy — GEMS by GTHINK' };

const SECTIONS = [
  {
    id: 'information-we-collect',
    icon: Eye,
    title: 'Information We Collect',
    color: 'bg-blue-50 text-blue-600',
    content: `We collect information you provide directly to us when you register for an account, use our services, or contact us for support. This includes:`,
    bullets: [
      'Full name, email address and phone number',
      'Business name, address and industry',
      'Payment and billing information (processed securely via Paystack)',
      'Usage data such as log files, device information and browser type',
      'How you interact with our platform and features',
    ],
  },
  {
    id: 'how-we-use',
    icon: RefreshCw,
    title: 'How We Use Your Information',
    color: 'bg-purple-50 text-purple-600',
    content: `We use the information we collect to:`,
    bullets: [
      'Provide, maintain and improve our services',
      'Process transactions and send related information',
      'Send technical notices, updates and support messages',
      'Respond to your comments, questions and requests',
      'Send marketing communications (you can opt out at any time)',
      'Monitor and analyse usage trends to improve your experience',
    ],
  },
  {
    id: 'information-sharing',
    icon: Globe,
    title: 'Information Sharing',
    color: 'bg-green-50 text-green-600',
    content: `We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:`,
    bullets: [
      'With trusted service providers who assist in operating our platform, under strict confidentiality agreements',
      'With Paystack for secure payment processing',
      'When required by law, regulation or legal process',
      'To protect the rights, property or safety of GTHINK, our users or the public',
    ],
  },
  {
    id: 'data-security',
    icon: Lock,
    title: 'Data Security',
    color: 'bg-yellow-50 text-yellow-600',
    content: `We take the security of your data seriously and implement industry-standard measures including:`,
    bullets: [
      '256-bit SSL encryption for all data in transit',
      'Secure, access-controlled data centres',
      'Regular security audits and vulnerability assessments',
      'Role-based access control within the platform',
      'Two-factor authentication support',
    ],
    note: 'No method of transmission over the internet is 100% secure. While we strive to protect your data, we cannot guarantee absolute security.',
  },
  {
    id: 'data-retention',
    icon: Trash2,
    title: 'Data Retention',
    color: 'bg-red-50 text-red-500',
    content: `We retain your personal information for as long as your account is active or as needed to provide our services. Specifically:`,
    bullets: [
      'Account data is retained for the duration of your subscription',
      'Transaction records are retained for 7 years for legal and accounting purposes',
      'Upon account deletion, personal data is removed within 30 days',
      'You may request deletion of your data at any time by contacting us',
    ],
  },
  {
    id: 'cookies',
    icon: Shield,
    title: 'Cookies',
    color: 'bg-orange-50 text-orange-600',
    content: `We use cookies and similar tracking technologies to enhance your experience on our platform. These include:`,
    bullets: [
      'Essential cookies required for authentication and security',
      'Performance cookies to understand how our platform is used',
      'Functional cookies to remember your preferences',
    ],
    note: 'You can control cookies through your browser settings. See our Cookie Policy for full details.',
    link: { label: 'View Cookie Policy', href: '/cookies' },
  },
  {
    id: 'third-party',
    icon: Globe,
    title: 'Third-Party Services',
    color: 'bg-cyan-50 text-cyan-600',
    content: `Our platform integrates with the following third-party services, each with their own privacy policies:`,
    bullets: [
      'Paystack — for secure card and mobile money payment processing',
      'Google Analytics — for anonymous usage analytics',
      'Email service providers — for transactional and marketing emails',
    ],
    note: 'We are not responsible for the privacy practices of third-party services. We encourage you to review their policies.',
  },
  {
    id: 'your-rights',
    icon: UserCheck,
    title: 'Your Rights',
    color: 'bg-pink-50 text-pink-600',
    content: `You have the following rights regarding your personal data:`,
    bullets: [
      'Right to access — request a copy of the data we hold about you',
      'Right to rectification — correct any inaccurate or incomplete data',
      'Right to erasure — request deletion of your personal data',
      'Right to restriction — limit how we process your data',
      'Right to portability — receive your data in a portable format',
      'Right to object — opt out of marketing communications at any time',
    ],
    note: 'To exercise any of these rights, contact us at gthinkcompanylimited@gmail.com.',
  },
  {
    id: 'changes',
    icon: Bell,
    title: 'Changes to This Policy',
    color: 'bg-indigo-50 text-indigo-600',
    content: `We may update this Privacy Policy from time to time. When we do:`,
    bullets: [
      'We will post the updated policy on this page with a new effective date',
      'We will notify you via email for significant changes',
      'Your continued use of our services after changes constitutes acceptance',
    ],
  },
];

export default function PrivacyPage() {
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
            <h1 className="text-4xl sm:text-5xl font-extrabold mb-3">Privacy Policy</h1>
            <p className="text-blue-200 text-sm">Effective: January 1, 2025 · Last updated: June 1, 2025</p>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <Link href="/terms" className="text-xs font-semibold text-blue-200 hover:text-white border border-white/20 hover:border-white/40 px-4 py-2 rounded-lg transition-all">Terms of Service</Link>
            <Link href="/cookies" className="text-xs font-semibold text-blue-200 hover:text-white border border-white/20 hover:border-white/40 px-4 py-2 rounded-lg transition-all">Cookie Policy</Link>
          </div>
        </div>
      </section>

      {/* Highlight cards */}
      <section className="max-w-5xl mx-auto px-6 -mt-6 mb-10">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: Lock,      label: 'Data Encrypted',    sub: '256-bit SSL' },
            { icon: Shield,    label: 'Never Sold',         sub: 'Your data is yours' },
            { icon: Trash2,    label: 'Right to Delete',    sub: 'Anytime, on request' },
            { icon: UserCheck, label: "You're in Control",  sub: 'Full data rights' },
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
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
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
          </aside>

          {/* Main content */}
          <div className="lg:col-span-9 space-y-6">

            {/* Intro */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <p className="text-gray-500 leading-relaxed text-sm">
                <span className="font-semibold text-gray-900">GTHINK Company Limited</span> ("we", "our", or "us") operates the GEMS platform. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our services. By using GEMS, you agree to the collection and use of information in accordance with this policy.
              </p>
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
                      <h2 className="text-base font-extrabold text-gray-900 leading-tight">{s.title}</h2>
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
                  {s.link && (
                    <Link href={s.link.href} className="inline-flex items-center gap-1 text-xs font-bold text-[#0D3B6E] hover:underline mt-3">
                      {s.link.label} →
                    </Link>
                  )}
                </div>
              );
            })}

            {/* Contact card */}
            <div className="bg-gradient-to-br from-[#0D3B6E] to-[#1A5294] rounded-2xl p-6 text-white">
              <h3 className="font-extrabold text-lg mb-2">Questions about this policy?</h3>
              <p className="text-blue-200 text-sm mb-5">Our team is happy to help clarify anything in this Privacy Policy.</p>
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
