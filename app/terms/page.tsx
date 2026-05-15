import Link from 'next/link';
import { Package, FileText, ShieldCheck, CreditCard, Database, Scale, Server, XCircle, Globe, Bell, Mail, Phone, UserCheck, Lock } from 'lucide-react';
import SiteFooter from '@/components/SiteFooter';

export const metadata = { title: 'Terms of Service — GEMS by GTHINK' };

const SECTIONS = [
  {
    id: 'acceptance',
    icon: FileText,
    title: 'Acceptance of Terms',
    color: 'bg-blue-50 text-blue-600',
    content: `By accessing or using the GEMS platform, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this platform.`,
    bullets: [
      'These Terms apply to all users of the GEMS platform',
      'By registering an account, you confirm you have read and accepted these Terms',
      'If you are using GEMS on behalf of a business, you represent that you have authority to bind that business',
    ],
  },
  {
    id: 'use-of-platform',
    icon: ShieldCheck,
    title: 'Use of the Platform',
    color: 'bg-green-50 text-green-600',
    content: `GEMS is a business management platform provided by GTHINK Company Limited. You may use the platform only for lawful business purposes and in accordance with these Terms.`,
    bullets: [
      'You agree not to use the platform for any fraudulent, abusive, or illegal activity',
      'You must not attempt to gain unauthorised access to any part of the platform',
      'You must not interfere with or disrupt the integrity or performance of the platform',
      'You must not use the platform to transmit harmful, offensive, or unlawful content',
    ],
  },
  {
    id: 'account-registration',
    icon: UserCheck,
    title: 'Account Registration',
    color: 'bg-purple-50 text-purple-600',
    content: `To access certain features of the platform, you must register for an account. You are responsible for maintaining the security of your account.`,
    bullets: [
      'You agree to provide accurate, current, and complete information during registration',
      'You must keep your account information up to date at all times',
      'You are responsible for safeguarding your login credentials',
      'You must notify us immediately of any unauthorised use of your account',
      'All activity that occurs under your account is your responsibility',
    ],
  },
  {
    id: 'subscription-billing',
    icon: CreditCard,
    title: 'Subscription & Billing',
    color: 'bg-yellow-50 text-yellow-600',
    content: `GEMS offers a 14-day free trial. After the trial period, continued use requires a paid subscription.`,
    bullets: [
      '14-day free trial — no credit card charged until day 14',
      'Subscription fees are billed monthly and are non-refundable except as required by law',
      'We reserve the right to change pricing with 30 days written notice',
      'Failure to pay may result in suspension or termination of your account',
      'All prices are in Ghana Cedis (GH₵) unless otherwise stated',
    ],
    note: 'You may cancel your subscription at any time. Cancellation takes effect at the end of the current billing period.',
  },
  {
    id: 'intellectual-property',
    icon: Lock,
    title: 'Intellectual Property',
    color: 'bg-pink-50 text-pink-600',
    content: `The GEMS platform, including all content, features, and functionality, is owned by GTHINK Company Limited and is protected by copyright, trademark, and other intellectual property laws.`,
    bullets: [
      'You may not copy, modify, or distribute any part of the platform without written permission',
      'You may not create derivative works based on our platform or its content',
      'The GEMS name, logo, and brand assets are trademarks of GTHINK Company Limited',
      'Any feedback or suggestions you provide may be used by us without obligation to you',
    ],
  },
  {
    id: 'user-data',
    icon: Database,
    title: 'User Data',
    color: 'bg-cyan-50 text-cyan-600',
    content: `You retain full ownership of all data you input into the GEMS platform. We act only as a data processor on your behalf.`,
    bullets: [
      'You own all business data, customer records, and content you upload',
      'We are granted a limited licence to use your data solely to provide and improve our services',
      'We will never sell your data to third parties',
      'Upon account termination, your data is retained for 30 days before permanent deletion',
    ],
    link: { label: 'View our Privacy Policy', href: '/privacy' },
  },
  {
    id: 'limitation-of-liability',
    icon: Scale,
    title: 'Limitation of Liability',
    color: 'bg-orange-50 text-orange-600',
    content: `To the maximum extent permitted by law, GTHINK Company Limited shall not be liable for indirect or consequential damages.`,
    bullets: [
      'We are not liable for any indirect, incidental, special, or consequential damages',
      'We are not liable for loss of profits, data, or business opportunities',
      'Our total liability shall not exceed the amount you paid us in the 12 months preceding the claim',
      'These limitations apply regardless of the legal theory under which the claim arises',
    ],
    note: 'Some jurisdictions do not allow the exclusion of certain warranties or limitations of liability. In such cases, our liability is limited to the fullest extent permitted by law.',
  },
  {
    id: 'service-availability',
    icon: Server,
    title: 'Service Availability',
    color: 'bg-indigo-50 text-indigo-600',
    content: `We strive to maintain 99.9% uptime but do not guarantee uninterrupted access to the platform at all times.`,
    bullets: [
      'We may perform scheduled maintenance with advance notice',
      'We are not liable for downtime caused by circumstances beyond our reasonable control',
      'Force majeure events include natural disasters, internet outages, and third-party service failures',
      'We will communicate planned maintenance via email or in-app notification',
    ],
  },
  {
    id: 'termination',
    icon: XCircle,
    title: 'Termination',
    color: 'bg-red-50 text-red-500',
    content: `Either party may terminate the agreement at any time. We reserve the right to suspend or terminate accounts that violate these Terms.`,
    bullets: [
      'We may suspend or terminate your account immediately for violation of these Terms',
      'You may cancel your account at any time from your account settings',
      'Upon termination, your right to use the platform ceases immediately',
      'Your data will be retained for 30 days after termination before permanent deletion',
    ],
  },
  {
    id: 'governing-law',
    icon: Globe,
    title: 'Governing Law',
    color: 'bg-teal-50 text-teal-600',
    content: `These Terms shall be governed by and construed in accordance with the laws of the Republic of Ghana.`,
    bullets: [
      'Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the courts of Ghana',
      'We will attempt to resolve disputes amicably before pursuing legal action',
      'If any provision of these Terms is found to be unenforceable, the remaining provisions remain in full force',
    ],
  },
  {
    id: 'changes',
    icon: Bell,
    title: 'Changes to Terms',
    color: 'bg-gray-50 text-gray-600',
    content: `We reserve the right to modify these Terms at any time. We will notify you of significant changes.`,
    bullets: [
      'We will notify you of significant changes via email or a prominent notice on the platform',
      'Changes take effect 30 days after notification unless otherwise stated',
      'Your continued use of the platform after changes constitutes acceptance of the new Terms',
      'We recommend reviewing these Terms periodically',
    ],
  },
];

export default function TermsPage() {
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
            <h1 className="text-4xl sm:text-5xl font-extrabold mb-3">Terms of Service</h1>
            <p className="text-blue-200 text-sm">Effective: January 1, 2025 · Last updated: June 1, 2025</p>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <Link href="/privacy" className="text-xs font-semibold text-blue-200 hover:text-white border border-white/20 hover:border-white/40 px-4 py-2 rounded-lg transition-all">Privacy Policy</Link>
            <Link href="/cookies" className="text-xs font-semibold text-blue-200 hover:text-white border border-white/20 hover:border-white/40 px-4 py-2 rounded-lg transition-all">Cookie Policy</Link>
          </div>
        </div>
      </section>

      {/* Highlight cards */}
      <section className="max-w-5xl mx-auto px-6 -mt-6 mb-10">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: FileText,   label: '14-Day Free Trial',  sub: 'No card charged upfront' },
            { icon: Database,   label: 'You Own Your Data',  sub: 'Always, no exceptions' },
            { icon: Globe,      label: 'Ghana Law Applies',  sub: 'Republic of Ghana courts' },
            { icon: ShieldCheck,label: 'Fair & Transparent', sub: 'No hidden clauses' },
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
                Please read these Terms of Service carefully before using the GEMS platform operated by <span className="font-semibold text-gray-900">GTHINK Company Limited</span>. These terms govern your access to and use of our services. By using GEMS, you agree to be bound by these Terms.
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
              <h3 className="font-extrabold text-lg mb-2">Questions about these Terms?</h3>
              <p className="text-blue-200 text-sm mb-5">Our team is happy to clarify anything in these Terms of Service.</p>
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
