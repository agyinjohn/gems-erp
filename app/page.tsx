// 'use client';
// import Link from 'next/link';
// import { useState, useEffect, useRef } from 'react';
// import {
//   Package, ShoppingCart, Users, Calculator, Truck, BarChart2,
//   CheckCircle, ArrowRight, Menu, X, Store, Building2,
//   Star, Zap, Shield, Globe, UserCheck,
// } from 'lucide-react';

// const NAV_LINKS = [
//   { label: 'Features',    href: '#features' },
//   { label: 'How it works', href: '#how-it-works' },
//   { label: 'Pricing',     href: '#pricing' },
//   { label: 'Contact',     href: '#contact' },
// ];

// const FEATURES = [
//   {
//     icon: Package,
//     title: 'Stocks & Inventory',
//     tagline: 'Always know what you have',
//     desc: 'Track stock levels in real time across all branches. Set reorder alerts, manage products with barcode scanning, and print labels instantly.',
//     color: 'bg-blue-50 text-blue-600',
//     accent: '#2563eb',
//     stat: { value: '99%', label: 'Stock accuracy' },
//     bullets: ['Real-time stock levels', 'Low stock alerts', 'Barcode scanning & label printing', 'Multi-branch stock view'],
//     preview: 'inventory',
//   },
//   {
//     icon: ShoppingCart,
//     title: 'Sales & eCommerce',
//     tagline: 'Sell everywhere, manage from one place',
//     desc: 'Process walk-in sales via POS, manage online orders from your branded storefront, and track every transaction in real time.',
//     color: 'bg-purple-50 text-purple-600',
//     accent: '#9333ea',
//     stat: { value: '3x', label: 'Faster checkout' },
//     bullets: ['Built-in POS terminal', 'Branded online storefront', 'Order tracking & fulfilment', 'Paystack payment integration'],
//     preview: 'sales',
//   },
//   {
//     icon: Calculator,
//     title: 'Accounting & Finance',
//     tagline: 'Full double-entry bookkeeping',
//     desc: 'Track expenses, post journal entries, generate P&L and balance sheet reports. Everything your accountant needs, built in.',
//     color: 'bg-yellow-50 text-yellow-600',
//     accent: '#d97706',
//     stat: { value: '100%', label: 'Audit ready' },
//     bullets: ['Double-entry bookkeeping', 'Expense tracking', 'P&L & balance sheet', 'Bank reconciliation'],
//     preview: 'accounting',
//   },
//   {
//     icon: Truck,
//     title: 'Procurement',
//     tagline: 'Streamline your supply chain',
//     desc: 'Create purchase orders, manage suppliers, receive goods and keep your supply chain running smoothly with full approval workflows.',
//     color: 'bg-cyan-50 text-cyan-600',
//     accent: '#0891b2',
//     stat: { value: '40%', label: 'Less manual work' },
//     bullets: ['Purchase order management', 'Supplier database', 'Goods receiving', 'Approval workflows'],
//     preview: 'procurement',
//   },
//   {
//     icon: Users,
//     title: 'HR & Payroll',
//     tagline: 'Your people, perfectly managed',
//     desc: 'Manage employees, track attendance, handle leave requests and run payroll — all in one place with full audit trails.',
//     color: 'bg-pink-50 text-pink-600',
//     accent: '#db2777',
//     stat: { value: '80%', label: 'Less HR admin' },
//     bullets: ['Employee management', 'Attendance tracking', 'Leave management', 'Payroll processing'],
//     preview: 'hr',
//   },
//   {
//     icon: UserCheck,
//     title: 'CRM',
//     tagline: 'Never lose a lead again',
//     desc: 'Track customers, manage leads through your sales pipeline and log every interaction. Turn prospects into loyal customers.',
//     color: 'bg-orange-50 text-orange-600',
//     accent: '#ea580c',
//     stat: { value: '2x', label: 'More conversions' },
//     bullets: ['Customer database', 'Lead pipeline', 'Interaction history', 'Follow-up reminders'],
//     preview: 'crm',
//   },
// ];

// const MORE_MODULES = ['Multi-Branch Management', 'Public Storefront', 'Payment Integration', 'Audit Logs', 'Role-Based Access', 'Real-Time Reports'];

// const STEPS = [
//   { step: '01', title: 'Sign Up',  desc: 'Create your business account in under 2 minutes. No credit card required for the 14-day trial.' },
//   { step: '02', title: 'Set Up',   desc: 'Add your products, staff and branches. Import existing data or start fresh with our guided setup.' },
//   { step: '03', title: 'Go Live',  desc: 'Your storefront is live, your POS is ready and your team can start working immediately.' },
// ];

// const PLANS = [
//   {
//     key: 'starter', label: 'Starter', price: 29, color: 'border-gray-200', badge: 'bg-blue-100 text-blue-700',
//     features: ['1 Branch', '5 Users', 'Inventory & POS', 'Online Storefront', 'Sales & Orders', 'Basic Reports'],
//   },
//   {
//     key: 'pro', label: 'Pro', price: 79, popular: true, color: 'border-[#0D3B6E]', badge: 'bg-purple-100 text-purple-700',
//     features: ['5 Branches', '20 Users', 'All Starter features', 'HR & Payroll', 'Procurement', 'Advanced Reports', 'Priority Support'],
//   },
//   {
//     key: 'enterprise', label: 'Enterprise', price: 199, color: 'border-gray-200', badge: 'bg-orange-100 text-orange-700',
//     features: ['Unlimited Branches', 'Unlimited Users', 'All Pro features', 'Dedicated Support', 'Custom Onboarding', 'SLA Guarantee'],
//   },
// ];

// const TESTIMONIALS = [
//   { name: 'James Okafor',   role: 'Owner, Okafor Electronics', text: 'GEMS transformed how we run our 3 branches. Inventory is always accurate and our staff love the POS.', avatar: 'J' },
//   { name: 'Sarah Mitchell', role: 'Manager, Chic Boutique',     text: 'The online storefront alone was worth it. We went from zero online sales to 40% of our revenue in 2 months.', avatar: 'S' },
//   { name: 'David Chen',     role: 'CFO, ProTools Ltd',          text: 'Finally an ERP that just works. The Paystack integration, real-time reports and role-based access made all the difference.', avatar: 'D' },
// ];

// function ContactForm() {
//   const [form, setForm] = useState({ name: '', email: '', phone: '', message: '', interest: 'demo' });
//   const [status, setStatus] = useState<'idle'|'sending'|'sent'|'error'>('idle');
//   const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

//   const handleSubmit = (e: React.FormEvent) => {
//     e.preventDefault();
//     const text = encodeURIComponent(
//       `Hi GEMS Team!\n\nName: ${form.name}\nEmail: ${form.email}\nPhone: ${form.phone}\nInterest: ${form.interest === 'demo' ? 'Schedule a Demo' : 'General Enquiry'}\n\nMessage:\n${form.message}`
//     );
//     window.open(`https://wa.me/233241550366?text=${text}`, '_blank');
//     setStatus('sent');
//     setForm({ name: '', email: '', phone: '', message: '', interest: 'demo' });
//     setTimeout(() => setStatus('idle'), 4000);
//   };

//   return (
//     <form onSubmit={handleSubmit} className="bg-gray-50 rounded-2xl p-8 space-y-5 border border-gray-100">
//       <h3 className="font-bold text-gray-900 text-lg">Send us a message</h3>
//       <div className="grid sm:grid-cols-2 gap-4">
//         <div>
//           <label className="block text-xs font-medium text-gray-500 mb-1.5">Full Name *</label>
//           <input required value={form.name} onChange={e => set('name', e.target.value)}
//             className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
//             placeholder="John Mensah" />
//         </div>
//         <div>
//           <label className="block text-xs font-medium text-gray-500 mb-1.5">Email *</label>
//           <input required type="email" value={form.email} onChange={e => set('email', e.target.value)}
//             className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
//             placeholder="you@company.com" />
//         </div>
//       </div>
//       <div className="grid sm:grid-cols-2 gap-4">
//         <div>
//           <label className="block text-xs font-medium text-gray-500 mb-1.5">Phone / WhatsApp</label>
//           <input value={form.phone} onChange={e => set('phone', e.target.value)}
//             className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
//             placeholder="+233 XX XXX XXXX" />
//         </div>
//         <div>
//           <label className="block text-xs font-medium text-gray-500 mb-1.5">I want to…</label>
//           <select value={form.interest} onChange={e => set('interest', e.target.value)}
//             className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
//             <option value="demo">Schedule a Demo</option>
//             <option value="pricing">Ask about Pricing</option>
//             <option value="support">Get Support</option>
//             <option value="other">Other</option>
//           </select>
//         </div>
//       </div>
//       <div>
//         <label className="block text-xs font-medium text-gray-500 mb-1.5">Message</label>
//         <textarea rows={4} value={form.message} onChange={e => set('message', e.target.value)}
//           className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none"
//           placeholder="Tell us about your business and what you're looking for…" />
//       </div>
//       <button type="submit"
//         className="w-full bg-[#0D3B6E] hover:bg-[#1A5294] text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
//         <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.855L.057 23.428a.75.75 0 00.916.916l5.573-1.471A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.693 9.693 0 01-4.953-1.358l-.355-.211-3.683.972.986-3.595-.231-.371A9.694 9.694 0 012.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/></svg>
//         {status === 'sending' ? 'Sending…' : 'Send via WhatsApp'}
//       </button>
//       {status === 'sent' && <p className="text-center text-sm text-green-600 font-medium">✓ Opening WhatsApp… we'll reply shortly!</p>}
//     </form>
//   );
// }

// export default function LandingPage() {
//   const [menuOpen, setMenuOpen] = useState(false);
//   const [activeFeature, setActiveFeature] = useState(0);
//   const [heroVisible, setHeroVisible] = useState(false);
//   const heroRef = useRef<HTMLDivElement>(null);

//   useEffect(() => {
//     const t = setTimeout(() => setHeroVisible(true), 100);
//     return () => clearTimeout(t);
//   }, []);

//   const useCounter = (target: number, duration = 1500, start = heroVisible) => {
//     const [val, setVal] = useState(0);
//     useEffect(() => {
//       if (!start) return;
//       let startTime: number;
//       const step = (ts: number) => {
//         if (!startTime) startTime = ts;
//         const progress = Math.min((ts - startTime) / duration, 1);
//         setVal(Math.floor(progress * target));
//         if (progress < 1) requestAnimationFrame(step);
//       };
//       requestAnimationFrame(step);
//     }, [start, target, duration]);
//     return val;
//   };

//   const revenue   = useCounter(124);
//   const orders    = useCounter(1284);
//   const products  = useCounter(342);
//   const customers = useCounter(891);

//   return (
//     <div className="min-h-screen bg-white font-sans">

//       {/* NAVBAR */}
//       <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-[0_1px_12px_rgba(0,0,0,0.06)]">
//         <div className="max-w-7xl mx-auto px-6 h-[68px] flex items-center justify-between gap-8">
//           <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
//             <div className="w-11 h-11 bg-[#0D3B6E] rounded-xl flex items-center justify-center shadow-md shadow-blue-200">
//               <Package className="w-6 h-6 text-white" />
//             </div>
//             <div>
//               <div className="font-extrabold text-2xl tracking-tight text-[#0D3B6E] leading-tight">GEMS</div>
//               <div className="text-xs text-gray-400 font-medium leading-tight">GTHINK Enterprise Management System</div>
//             </div>
//           </Link>
//           <div className="hidden md:flex items-center gap-1 flex-1 justify-center">
//             {NAV_LINKS.map(l => (
//               <a key={l.label} href={l.href}
//                 className="relative text-sm font-medium text-gray-500 hover:text-[#0D3B6E] px-4 py-2 rounded-lg hover:bg-blue-50 transition-all group">
//                 {l.label}
//                 <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-0 group-hover:w-4 h-0.5 bg-[#0D3B6E] rounded-full transition-all duration-200" />
//               </a>
//             ))}
//           </div>
//           <div className="hidden md:flex items-center gap-2 flex-shrink-0">
//             <Link href="/login" className="text-sm font-semibold text-gray-600 hover:text-[#0D3B6E] hover:bg-gray-100 px-4 py-2 rounded-lg transition-all">Log in</Link>
//             <Link href="/register" className="inline-flex items-center gap-1.5 bg-[#0D3B6E] hover:bg-[#1A5294] text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors shadow-md shadow-blue-200">
//               Get Started Free <ArrowRight className="w-3.5 h-3.5" />
//             </Link>
//           </div>
//           <button className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors" onClick={() => setMenuOpen(!menuOpen)}>
//             {menuOpen ? <X className="w-5 h-5 text-gray-700" /> : <Menu className="w-5 h-5 text-gray-700" />}
//           </button>
//         </div>
//         {menuOpen && (
//           <div className="md:hidden border-t border-gray-100 bg-white px-5 pt-3 pb-5">
//             <div className="space-y-0.5 mb-4">
//               {NAV_LINKS.map(l => (
//                 <a key={l.label} href={l.href} onClick={() => setMenuOpen(false)}
//                   className="flex items-center justify-between text-sm font-medium text-gray-700 hover:text-[#0D3B6E] hover:bg-blue-50 px-3 py-2.5 rounded-xl transition-colors">
//                   {l.label}<ArrowRight className="w-3.5 h-3.5 text-gray-300" />
//                 </a>
//               ))}
//             </div>
//             <div className="flex flex-col gap-2 pt-3 border-t border-gray-100">
//               <Link href="/login" onClick={() => setMenuOpen(false)} className="text-center text-sm font-semibold text-gray-700 border border-gray-200 hover:border-[#0D3B6E]/40 hover:bg-blue-50 py-2.5 rounded-xl transition-all">Log in</Link>
//               <Link href="/register" onClick={() => setMenuOpen(false)} className="text-center bg-[#0D3B6E] hover:bg-[#1A5294] text-white text-sm font-bold py-2.5 rounded-xl transition-colors shadow-md shadow-blue-200">Get Started Free →</Link>
//             </div>
//           </div>
//         )}
//       </nav>

//       {/* HERO */}
//       <section className="bg-gradient-to-br from-[#0D3B6E] via-[#1A5294] to-[#0D3B6E] text-white py-20 px-6 overflow-hidden relative">
//         <div className="absolute inset-0 overflow-hidden pointer-events-none">
//           <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/5 rounded-full" />
//           <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-yellow-400/10 rounded-full" />
//         </div>
//         <div className="max-w-7xl mx-auto relative z-10">
//           <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
//             <div ref={heroRef} className="flex flex-col">
//               <div style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'translateY(0)' : 'translateY(24px)', transition: 'opacity 0.6s ease, transform 0.6s ease' }}>
//                 <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
//                   <Zap className="w-3.5 h-3.5 text-yellow-400" /> Smart Workplace — Your Business. One System.
//                 </div>
//               </div>
//               <div style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'translateY(0)' : 'translateY(24px)', transition: 'opacity 0.6s ease, transform 0.6s ease', transitionDelay: '150ms' }}>
//                 <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight mb-6">
//                   Manage Your Entire Business<br /><span className="text-yellow-400">From One Place.</span>
//                 </h1>
//               </div>
//               <div style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'translateY(0)' : 'translateY(24px)', transition: 'opacity 0.6s ease, transform 0.6s ease', transitionDelay: '300ms' }}>
//                 <p className="text-lg text-blue-200 mb-8 leading-relaxed max-w-lg">
//                   All-in-one platform for Stocks, Inventory, Sales, Procurement, Finance, HR, and CRM — all connected, all in real time.
//                 </p>
//               </div>
//               <div style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'translateY(0)' : 'translateY(24px)', transition: 'opacity 0.6s ease, transform 0.6s ease', transitionDelay: '450ms' }}>
//                 <div className="flex flex-col sm:flex-row gap-3 mb-8">
//                   <Link href="/register" className="bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-extrabold px-7 py-3.5 rounded-xl text-base transition-colors flex items-center justify-center gap-2 shadow-lg">
//                     Start Free Trial <ArrowRight className="w-4 h-4" />
//                   </Link>
//                   <Link href="/store/gems-store" className="bg-white/10 hover:bg-white/20 border border-white/30 text-white font-bold px-7 py-3.5 rounded-xl text-base transition-colors flex items-center justify-center gap-2">
//                     <Store className="w-4 h-4" /> View Demo Store
//                   </Link>
//                 </div>
//                 <p className="text-blue-300 text-sm">14-day free trial · Not charged until day 14 · Cancel anytime</p>
//               </div>
//               <div style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'translateY(0)' : 'translateY(24px)', transition: 'opacity 0.6s ease, transform 0.6s ease', transitionDelay: '600ms' }}>
//                 <div className="flex items-center gap-4 mt-8 pt-8 border-t border-white/10">
//                   <div className="flex -space-x-2">
//                     {['K','A','Y','M','E'].map((l, i) => (
//                       <div key={i} className={`w-8 h-8 rounded-full border-2 border-[#0D3B6E] flex items-center justify-center text-xs font-bold text-white ${['bg-blue-500','bg-purple-500','bg-orange-400','bg-green-500','bg-pink-500'][i]}`}>{l}</div>
//                     ))}
//                   </div>
//                   <div>
//                     <div className="flex gap-0.5 mb-0.5">{[...Array(5)].map((_,i) => <Star key={i} className="w-3 h-3 text-yellow-400 fill-yellow-400" />)}</div>
//                     <p className="text-blue-200 text-xs">Trusted by <span className="font-bold text-white">500+</span> businesses</p>
//                   </div>
//                 </div>
//               </div>
//             </div>

//             {/* Hero mockup */}
//             <div className="hidden lg:block" style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'translateX(0)' : 'translateX(40px)', transition: 'opacity 0.8s ease, transform 0.8s ease', transitionDelay: '300ms' }}>
//               <div className="relative">
//                 <div className="absolute -inset-4 bg-blue-400/20 rounded-3xl blur-2xl" />
//                 <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden">
//                   <div className="bg-gray-100 px-4 py-2.5 flex items-center gap-3 border-b border-gray-200">
//                     <div className="flex gap-1.5">
//                       <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
//                       <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
//                       <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
//                     </div>
//                     <div className="flex-1 bg-white rounded-md h-5 flex items-center px-3">
//                       <span className="text-[10px] text-gray-400 font-mono">app.gems-erp.com/dashboard</span>
//                     </div>
//                   </div>
//                   <div className="bg-gray-50 p-4">
//                     <div className="grid grid-cols-4 gap-2 mb-3">
//                       {[
//                         { label: 'Revenue',   value: `GHS ${revenue}k`,          change: '+12%', color: 'text-green-600',  bar: 'bg-green-400',  pct: '72%' },
//                         { label: 'Orders',    value: orders.toLocaleString(),     change: '+8%',  color: 'text-blue-600',   bar: 'bg-blue-400',   pct: '65%' },
//                         { label: 'Products',  value: products.toString(),         change: '+3%',  color: 'text-purple-600', bar: 'bg-purple-400', pct: '48%' },
//                         { label: 'Customers', value: customers.toLocaleString(),  change: '+18%', color: 'text-orange-600', bar: 'bg-orange-400', pct: '80%' },
//                       ].map((k, i) => (
//                         <div key={k.label} className="bg-white rounded-xl p-2.5 border border-gray-100 shadow-sm"
//                           style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'translateY(0)' : 'translateY(12px)', transition: 'opacity 0.5s ease, transform 0.5s ease', transitionDelay: `${500 + i * 100}ms` }}>
//                           <div className="flex items-center justify-between mb-1">
//                             <span className="text-[9px] text-gray-400">{k.label}</span>
//                             <span className="text-[8px] font-bold text-green-600 bg-green-50 px-1 py-0.5 rounded-full">{k.change}</span>
//                           </div>
//                           <div className={`text-sm font-extrabold ${k.color}`}>{k.value}</div>
//                           <div className="mt-1.5 h-1 bg-gray-100 rounded-full overflow-hidden">
//                             <div className={`h-1 rounded-full ${k.bar}`} style={{ width: heroVisible ? k.pct : '0%', transition: 'width 1.2s ease', transitionDelay: `${700 + i * 100}ms` }} />
//                           </div>
//                         </div>
//                       ))}
//                     </div>
//                     <div className="grid grid-cols-3 gap-2">
//                       <div className="col-span-2 bg-white rounded-xl p-3 border border-gray-100 shadow-sm" style={{ opacity: heroVisible ? 1 : 0, transition: 'opacity 0.6s ease', transitionDelay: '900ms' }}>
//                         <div className="text-[10px] font-bold text-gray-700 mb-2">Revenue Trend</div>
//                         <svg viewBox="0 0 280 65" className="w-full" preserveAspectRatio="none">
//                           <defs>
//                             <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
//                               <stop offset="0%" stopColor="#0D3B6E" stopOpacity="0.2" />
//                               <stop offset="100%" stopColor="#0D3B6E" stopOpacity="0" />
//                             </linearGradient>
//                           </defs>
//                           <path d="M0,52 C35,46 70,34 105,28 C140,22 175,36 210,22 C245,8 262,14 280,8 L280,65 L0,65 Z" fill="url(#rg)" />
//                           <path d="M0,52 C35,46 70,34 105,28 C140,22 175,36 210,22 C245,8 262,14 280,8" fill="none" stroke="#0D3B6E" strokeWidth="1.5" strokeLinecap="round"
//                             strokeDasharray="400" strokeDashoffset={heroVisible ? '0' : '400'} style={{ transition: 'stroke-dashoffset 1.4s ease', transitionDelay: '1000ms' }} />
//                         </svg>
//                       </div>
//                       <div className="flex flex-col gap-2">
//                         <div className="bg-white rounded-xl p-2.5 border border-gray-100 shadow-sm flex-1" style={{ opacity: heroVisible ? 1 : 0, transition: 'opacity 0.6s ease', transitionDelay: '1100ms' }}>
//                           <div className="text-[10px] font-bold text-gray-700 mb-1.5">Recent Orders</div>
//                           <div className="space-y-1.5">
//                             {[['Kofi M.','GHS 420','bg-green-400'],['Abena A.','GHS 185','bg-yellow-400'],['Yaw D.','GHS 930','bg-green-400']].map(([n,a,c]) => (
//                               <div key={n} className="flex items-center justify-between">
//                                 <div className="flex items-center gap-1"><div className={`w-1.5 h-1.5 rounded-full ${c}`} /><span className="text-[9px] text-gray-600">{n}</span></div>
//                                 <span className="text-[9px] font-bold text-gray-700">{a}</span>
//                               </div>
//                             ))}
//                           </div>
//                         </div>
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </section>

//       {/* STATS */}
//       <section className="bg-white border-b border-gray-100 py-14 px-6">
//         <div className="max-w-5xl mx-auto">
//           <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
//             {[
//               { value: '500+', label: 'Businesses', icon: Building2, color: 'bg-blue-50 text-blue-600' },
//               { value: '9',    label: 'Modules',    icon: Package,   color: 'bg-purple-50 text-purple-600' },
//               { value: '99.9%',label: 'Uptime',     icon: Zap,       color: 'bg-yellow-50 text-yellow-600' },
//               { value: '24/7', label: 'Support',    icon: Shield,    color: 'bg-green-50 text-green-600' },
//             ].map(s => {
//               const Icon = s.icon;
//               return (
//                 <div key={s.label} className="flex items-center gap-4 p-5 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all">
//                   <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${s.color}`}><Icon className="w-5 h-5" /></div>
//                   <div>
//                     <div className="text-2xl font-extrabold text-gray-900">{s.value}</div>
//                     <div className="text-sm text-gray-400">{s.label}</div>
//                   </div>
//                 </div>
//               );
//             })}
//           </div>
//         </div>
//       </section>

//       {/* FEATURES */}
//       <section id="features" className="py-24 px-6 bg-white">
//         <div className="max-w-7xl mx-auto">
//           <div className="text-center mb-14">
//             <span className="inline-block text-xs font-bold uppercase tracking-widest text-[#0D3B6E] bg-blue-50 px-3 py-1.5 rounded-full mb-4">Everything you need</span>
//             <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">One System. Every Module.</h2>
//             <p className="text-gray-500 text-lg max-w-2xl mx-auto">GEMS gives you Inventory, Sales, Procurement, Finance, HR and CRM — all connected, all in real time.</p>
//           </div>
//           <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">
//             <div className="lg:col-span-2 flex flex-col gap-2">
//               {FEATURES.map((f, i) => {
//                 const Icon = f.icon;
//                 const isActive = activeFeature === i;
//                 return (
//                   <button key={f.title} onClick={() => setActiveFeature(i)}
//                     className="w-full text-left px-4 py-3.5 rounded-xl border transition-all duration-200"
//                     style={{ background: isActive ? `linear-gradient(135deg, ${f.accent}12, ${f.accent}06)` : '#f9fafb', borderColor: isActive ? f.accent + '50' : '#e5e7eb' }}>
//                     <div className="flex items-center gap-3">
//                       <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: isActive ? f.accent : f.accent + '20' }}>
//                         <Icon className="w-4 h-4 text-white" />
//                       </div>
//                       <div className="flex-1 min-w-0">
//                         <div className={`font-bold text-sm ${isActive ? 'text-gray-900' : 'text-gray-600'}`}>{f.title}</div>
//                         <div className={`text-xs truncate mt-0.5 ${isActive ? 'text-gray-500' : 'text-gray-400'}`}>{f.tagline}</div>
//                       </div>
//                     </div>
//                   </button>
//                 );
//               })}
//             </div>
//             <div className="lg:col-span-3">
//               {FEATURES.map((f, i) => {
//                 const Icon = f.icon;
//                 if (activeFeature !== i) return null;
//                 return (
//                   <div key={f.title} className="rounded-2xl overflow-hidden"
//                     style={{ background: `linear-gradient(145deg, ${f.accent}08 0%, #f8faff 60%, #ffffff 100%)`, border: `1px solid ${f.accent}25` }}>
//                     <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: `1px solid ${f.accent}20` }}>
//                       <div className="flex items-center gap-3">
//                         <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: f.accent + '25' }}>
//                           <Icon className="w-5 h-5" style={{ color: f.accent }} />
//                         </div>
//                         <div>
//                           <h3 className="font-extrabold text-gray-900">{f.title}</h3>
//                           <p className="text-xs text-gray-400 mt-0.5">{f.tagline}</p>
//                         </div>
//                       </div>
//                       <div className="text-right">
//                         <div className="text-2xl font-extrabold" style={{ color: f.accent }}>{f.stat.value}</div>
//                         <div className="text-[10px] text-gray-500">{f.stat.label}</div>
//                       </div>
//                     </div>
//                     <div className="px-6 py-5">
//                       <p className="text-gray-500 text-sm leading-relaxed mb-5">{f.desc}</p>
//                       <div className="grid grid-cols-2 gap-2 mb-5">
//                         {f.bullets.map(b => (
//                           <div key={b} className="flex items-center gap-2">
//                             <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: f.accent }} />
//                             <span className="text-xs text-gray-600">{b}</span>
//                           </div>
//                         ))}
//                       </div>
//                       <Link href="/register" className="inline-flex items-center gap-2 mt-2 text-sm font-bold transition-all hover:gap-3" style={{ color: f.accent }}>
//                         Get started with {f.title} <ArrowRight className="w-4 h-4" />
//                       </Link>
//                     </div>
//                   </div>
//                 );
//               })}
//             </div>
//           </div>
//           <div className="flex flex-wrap items-center justify-center gap-2 mt-12">
//             <span className="text-sm text-gray-400 mr-1">Also includes:</span>
//             {MORE_MODULES.map(m => (
//               <span key={m} className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 border border-gray-200 px-3 py-1.5 rounded-full transition-colors">
//                 <CheckCircle className="w-3 h-3 text-green-500" /> {m}
//               </span>
//             ))}
//           </div>
//         </div>
//       </section>

//       {/* HOW IT WORKS */}
//       <section id="how-it-works" className="bg-gray-50 py-24 px-6">
//         <div className="max-w-5xl mx-auto">
//           <div className="text-center mb-14">
//             <span className="inline-block text-xs font-bold uppercase tracking-widest text-[#0D3B6E] bg-blue-50 px-3 py-1.5 rounded-full mb-4">Simple setup</span>
//             <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">Up and running in minutes</h2>
//             <p className="text-gray-500 text-lg">No IT team needed. No complex setup. Just sign up and go.</p>
//           </div>
//           <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
//             <div className="hidden md:block absolute top-8 left-[calc(16.67%+16px)] right-[calc(16.67%+16px)] h-0.5 bg-gray-200" />
//             {STEPS.map(s => (
//               <div key={s.step} className="relative text-center">
//                 <div className="relative z-10 inline-flex w-16 h-16 rounded-2xl bg-[#0D3B6E] text-white items-center justify-center text-xl font-extrabold mb-5 shadow-lg shadow-blue-200">{s.step}</div>
//                 <h3 className="font-bold text-gray-900 text-lg mb-2">{s.title}</h3>
//                 <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
//               </div>
//             ))}
//           </div>
//         </div>
//       </section>

//       {/* PRICING */}
//       <section id="pricing" className="py-24 px-6">
//         <div className="max-w-5xl mx-auto">
//           <div className="text-center mb-14">
//             <span className="inline-block text-xs font-bold uppercase tracking-widest text-[#0D3B6E] bg-blue-50 px-3 py-1.5 rounded-full mb-4">Pricing</span>
//             <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">Simple, transparent pricing</h2>
//             <p className="text-gray-500 text-lg">Start free for 14 days. Not charged until day 14. Cancel anytime.</p>
//           </div>
//           <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
//             {PLANS.map(p => (
//               <div key={p.key} className={`relative bg-white rounded-2xl border-2 p-8 flex flex-col ${p.popular ? 'border-[#0D3B6E] shadow-2xl shadow-blue-100' : 'border-gray-200'}`}>
//                 {p.popular && <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#0D3B6E] text-white text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap">Most Popular</div>}
//                 <span className={`text-xs font-bold px-3 py-1 rounded-full inline-block mb-4 w-fit ${p.badge}`}>{p.label}</span>
//                 <div className="text-4xl font-extrabold text-gray-900 mb-1">${p.price}<span className="text-base font-normal text-gray-400">/mo</span></div>
//                 <p className="text-xs text-gray-400 mb-6">per month, billed monthly</p>
//                 <ul className="space-y-3 flex-1 mb-8">
//                   {p.features.map(f => (
//                     <li key={f} className="flex items-center gap-2.5 text-sm text-gray-600">
//                       <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /> {f}
//                     </li>
//                   ))}
//                 </ul>
//                 <Link href="/register" className={`w-full text-center font-bold py-3 rounded-xl text-sm transition-colors ${p.popular ? 'bg-[#0D3B6E] hover:bg-[#1A5294] text-white shadow-lg shadow-blue-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'}`}>
//                   Start free trial
//                 </Link>
//               </div>
//             ))}
//           </div>
//           <p className="text-center text-sm text-gray-400 mt-8">All plans include a 14-day free trial. No credit card charged until day 14.</p>
//         </div>
//       </section>

//       {/* TESTIMONIALS */}
//       <section className="bg-gray-50 py-24 px-6">
//         <div className="max-w-5xl mx-auto">
//           <div className="text-center mb-14">
//             <span className="inline-block text-xs font-bold uppercase tracking-widest text-[#0D3B6E] bg-blue-50 px-3 py-1.5 rounded-full mb-4">Testimonials</span>
//             <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">Trusted by businesses worldwide</h2>
//           </div>
//           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//             {TESTIMONIALS.map((t, i) => (
//               <div key={t.name} className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-md transition-shadow flex flex-col">
//                 <div className="flex gap-1 mb-4">{[...Array(5)].map((_,j) => <Star key={j} className="w-4 h-4 text-yellow-400 fill-yellow-400" />)}</div>
//                 <p className="text-gray-600 text-sm leading-relaxed mb-6 flex-1">&ldquo;{t.text}&rdquo;</p>
//                 <div className="flex items-center gap-3 pt-4 border-t border-gray-50">
//                   <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm ${i === 0 ? 'bg-gradient-to-br from-blue-500 to-blue-700' : i === 1 ? 'bg-gradient-to-br from-purple-500 to-purple-700' : 'bg-gradient-to-br from-orange-400 to-orange-600'}`}>{t.avatar}</div>
//                   <div>
//                     <div className="font-semibold text-gray-900 text-sm">{t.name}</div>
//                     <div className="text-xs text-gray-400">{t.role}</div>
//                   </div>
//                 </div>
//               </div>
//             ))}
//           </div>
//         </div>
//       </section>

//       {/* CTA BANNER */}
//       <section className="relative bg-gradient-to-br from-[#0D3B6E] via-[#1A5294] to-[#0D3B6E] py-24 px-6 text-white overflow-hidden">
//         <div className="max-w-3xl mx-auto text-center relative z-10">
//           <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">Ready to run your business smarter?</h2>
//           <p className="text-blue-200 text-lg mb-10 max-w-xl mx-auto">Join hundreds of businesses already using GEMS to manage their entire operations from one smart workplace.</p>
//           <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
//             <Link href="/register" className="bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-extrabold px-8 py-4 rounded-xl text-base transition-colors flex items-center justify-center gap-2 shadow-lg">
//               Start Free Trial <ArrowRight className="w-4 h-4" />
//             </Link>
//             <Link href="/login" className="bg-white/10 hover:bg-white/20 border border-white/30 text-white font-bold px-8 py-4 rounded-xl text-base transition-colors flex items-center justify-center">
//               Log In to Dashboard
//             </Link>
//           </div>
//           <p className="text-blue-300 text-xs mt-6">14-day free trial · Not charged until day 14 · Cancel anytime</p>
//         </div>
//       </section>

//       {/* CONTACT */}
//       <section id="contact" className="py-24 px-6 bg-white">
//         <div className="max-w-6xl mx-auto">
//           <div className="text-center mb-14">
//             <span className="inline-block bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest mb-4">Contact Us</span>
//             <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">Get in touch or schedule a demo</h2>
//             <p className="text-gray-500 text-lg max-w-xl mx-auto">Have questions? Want to see GEMS in action? Reach out and our team will get back to you within 24 hours.</p>
//           </div>
//           <div className="grid lg:grid-cols-2 gap-12 items-start">
//             <div className="space-y-8">
//               {[
//                 { label: 'Email us',  value: 'hello@gthink.com',   href: 'mailto:hello@gthink.com' },
//                 { label: 'WhatsApp', value: '+233 24 155 0366',    href: 'https://wa.me/233241550366' },
//                 { label: 'Location', value: 'Accra, Ghana',        href: null },
//               ].map(({ label, value, href }) => (
//                 <div key={label} className="flex items-start gap-4">
//                   <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
//                     <Globe className="w-5 h-5" />
//                   </div>
//                   <div>
//                     <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">{label}</p>
//                     {href ? <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="text-gray-900 font-semibold hover:text-blue-600 transition-colors">{value}</a>
//                       : <p className="text-gray-900 font-semibold">{value}</p>}
//                   </div>
//                 </div>
//               ))}
//               <div className="bg-gradient-to-br from-[#0D3B6E] to-[#1A5294] rounded-2xl p-6 text-white">
//                 <h3 className="font-bold text-lg mb-2">Book a free demo</h3>
//                 <p className="text-blue-200 text-sm mb-4">See GEMS live in 20 minutes. We'll walk you through every module tailored to your business.</p>
//                 <a href="https://wa.me/233241550366?text=Hi%20GEMS%20Team%2C%20I%27d%20like%20to%20book%20a%20free%20demo." target="_blank" rel="noopener noreferrer"
//                   className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">
//                   Chat on WhatsApp
//                 </a>
//               </div>
//             </div>
//             <ContactForm />
//           </div>
//         </div>
//       </section>

//       {/* FOOTER */}
//       <footer className="bg-gray-900 text-white">
//         <div className="bg-gray-800 border-b border-gray-700">
//           <div className="max-w-7xl mx-auto px-6 py-5 grid grid-cols-2 md:grid-cols-4 gap-6">
//             {[
//               { icon: Shield,    title: 'Enterprise Security', sub: 'SOC 2 compliant, 256-bit SSL' },
//               { icon: Zap,       title: '99.9% Uptime',        sub: 'Guaranteed SLA for all plans' },
//               { icon: Globe,     title: 'Works Everywhere',    sub: 'Multi-currency, multi-branch' },
//               { icon: BarChart2, title: 'Real-Time Data',      sub: 'Live dashboards & reports' },
//             ].map(b => {
//               const Icon = b.icon;
//               return (
//                 <div key={b.title} className="flex items-center gap-3">
//                   <div className="w-9 h-9 rounded-lg bg-yellow-400/10 flex items-center justify-center text-yellow-400 flex-shrink-0"><Icon className="w-5 h-5" /></div>
//                   <div>
//                     <div className="text-sm font-semibold text-white">{b.title}</div>
//                     <div className="text-xs text-gray-400 mt-0.5">{b.sub}</div>
//                   </div>
//                 </div>
//               );
//             })}
//           </div>
//         </div>

//         <div className="max-w-7xl mx-auto px-6 py-14">
//           <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
//             <div className="md:col-span-4">
//               <div className="flex items-center gap-3 mb-4">
//                 <div className="w-10 h-10 bg-[#0D3B6E] rounded-xl flex items-center justify-center"><Package className="w-5 h-5 text-white" /></div>
//                 <div>
//                   <div className="font-extrabold text-xl text-white">GEMS</div>
//                   <div className="text-xs text-gray-400">GTHINK Enterprise Management System</div>
//                 </div>
//               </div>
//               <p className="text-gray-400 text-sm leading-relaxed mb-6">The all-in-one business management platform for growing companies. Inventory, Sales, Finance, HR, Procurement and CRM — all connected in real time.</p>
//             </div>
//             <div className="md:col-span-2">
//               <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-5 pb-3 border-b border-gray-700">Product</h4>
//               <ul className="space-y-3">
//                 {[{ label: 'Features', href: '#features' },{ label: 'Pricing', href: '#pricing' },{ label: 'How it works', href: '#how-it-works' },{ label: 'Demo Store', href: '/store/gems-store' }].map(l => (
//                   <li key={l.label}><a href={l.href} className="text-gray-400 hover:text-yellow-400 text-sm transition-colors">{l.label}</a></li>
//                 ))}
//               </ul>
//             </div>
//             <div className="md:col-span-2">
//               <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-5 pb-3 border-b border-gray-700">Company</h4>
//               <ul className="space-y-3">
//                 {['About Us','Blog','Careers','Contact'].map(l => (
//                   <li key={l}><a href="#" className="text-gray-400 hover:text-yellow-400 text-sm transition-colors">{l}</a></li>
//                 ))}
//               </ul>
//             </div>
//             <div className="md:col-span-4">
//               <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-5 pb-3 border-b border-gray-700">Legal</h4>
//               <ul className="space-y-3">
//                 {['Privacy Policy','Terms of Service','Cookie Policy','GDPR'].map(l => (
//                   <li key={l}><a href="#" className="text-gray-400 hover:text-yellow-400 text-sm transition-colors">{l}</a></li>
//                 ))}
//               </ul>
//             </div>
//           </div>
//         </div>

//         {/* Bottom bar */}
//         <div className="border-t border-gray-800 bg-gray-950">
//           <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
//             <p className="text-gray-500 text-xs">Copyright &copy; 2026 GTHINK Company Limited &mdash; All rights reserved</p>
//             <p className="text-gray-500 text-xs">GEMS &mdash; GTHINK Enterprise Management System</p>
//           </div>
//         </div>
//       </footer>

//       {/* WhatsApp FAB */}
//       <a href="https://wa.me/233241550366?text=Hi%20GEMS%20Team%2C%20I%27d%20like%20to%20schedule%20a%20demo." target="_blank" rel="noopener noreferrer"
//         className="fixed bottom-6 right-6 z-50 flex items-center gap-3 group" aria-label="Chat on WhatsApp">
//         <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
//           Chat with us · Schedule a demo
//         </span>
//         <div className="relative flex items-center justify-center w-14 h-14 rounded-full shadow-lg shadow-green-400/40 bg-[#25D366] hover:bg-[#20bd5a] transition-colors">
//           <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-30" />
//           <svg viewBox="0 0 24 24" fill="white" className="w-7 h-7 relative z-10">
//             <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
//             <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.855L.057 23.428a.75.75 0 00.916.916l5.573-1.471A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.693 9.693 0 01-4.953-1.358l-.355-.211-3.683.972.986-3.595-.231-.371A9.694 9.694 0 012.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
//           </svg>
//         </div>
//       </a>

//     </div>
//   );
// }
'use client';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import {
  Package, ShoppingCart, Users, Calculator, Truck, BarChart2,
  CheckCircle, ArrowRight, Menu, X, Store, Building2,
  Star, Zap, Shield, Globe, UserCheck, Phone,
} from 'lucide-react';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Contact', href: '#contact' },
];

const FEATURES = [
  {
    icon: Package,
    title: 'Stocks & Inventory',
    tagline: 'Always know what you have',
    desc: 'Track stock levels in real time across all branches. Set reorder alerts, manage products with barcode scanning, and print labels instantly.',
    color: 'bg-blue-50 text-blue-600',
    accent: '#2563eb',
    stat: { value: '99%', label: 'Stock accuracy' },
    bullets: ['Real-time stock levels', 'Low stock alerts', 'Barcode scanning & label printing', 'Multi-branch stock view'],
    preview: 'inventory',
  },
  {
    icon: ShoppingCart,
    title: 'Sales & eCommerce',
    tagline: 'Sell everywhere, manage from one place',
    desc: 'Process walk-in sales via POS, manage online orders from your branded storefront, and track every transaction in real time.',
    color: 'bg-purple-50 text-purple-600',
    accent: '#9333ea',
    stat: { value: '3x', label: 'Faster checkout' },
    bullets: ['Built-in POS terminal', 'Branded online storefront', 'Order tracking & fulfilment', 'Paystack payment integration'],
    preview: 'sales',
  },
  {
    icon: Calculator,
    title: 'Accounting & Finance',
    tagline: 'Full double-entry bookkeeping',
    desc: 'Track expenses, post journal entries, generate P&L and balance sheet reports. Everything your accountant needs, built in.',
    color: 'bg-yellow-50 text-yellow-600',
    accent: '#d97706',
    stat: { value: '100%', label: 'Audit ready' },
    bullets: ['Double-entry bookkeeping', 'Expense tracking', 'P&L & balance sheet', 'Bank reconciliation'],
    preview: 'accounting',
  },
  {
    icon: Truck,
    title: 'Procurement',
    tagline: 'Streamline your supply chain',
    desc: 'Create purchase orders, manage suppliers, receive goods and keep your supply chain running smoothly with full approval workflows.',
    color: 'bg-cyan-50 text-cyan-600',
    accent: '#0891b2',
    stat: { value: '40%', label: 'Less manual work' },
    bullets: ['Purchase order management', 'Supplier database', 'Goods receiving', 'Approval workflows'],
    preview: 'procurement',
  },
  {
    icon: Users,
    title: 'HR & Payroll',
    tagline: 'Your people, perfectly managed',
    desc: 'Manage employees, track attendance, handle leave requests and run payroll — all in one place with full audit trails.',
    color: 'bg-pink-50 text-pink-600',
    accent: '#db2777',
    stat: { value: '80%', label: 'Less HR admin' },
    bullets: ['Employee management', 'Attendance tracking', 'Leave management', 'Payroll processing'],
    preview: 'hr',
  },
  {
    icon: UserCheck,
    title: 'CRM',
    tagline: 'Never lose a lead again',
    desc: 'Track customers, manage leads through your sales pipeline and log every interaction. Turn prospects into loyal customers.',
    color: 'bg-orange-50 text-orange-600',
    accent: '#ea580c',
    stat: { value: '2x', label: 'More conversions' },
    bullets: ['Customer database', 'Lead pipeline', 'Interaction history', 'Follow-up reminders'],
    preview: 'crm',
  },
];

const MORE_MODULES = ['Multi-Branch Management', 'Public Storefront', 'Payment Integration', 'Audit Logs', 'Role-Based Access', 'Real-Time Reports'];

const STEPS = [
  { step: '01', title: 'Sign Up', desc: 'Create your business account in under 2 minutes. No credit card required for the 14-day trial.' },
  { step: '02', title: 'Set Up', desc: 'Add your products, staff and branches. Import existing data or start fresh with our guided setup.' },
  { step: '03', title: 'Go Live', desc: 'Your storefront is live, your POS is ready and your team can start working immediately.' },
];

const PLANS = [
  {
    key: 'starter',
    label: 'Starter',
    price: 29,
    color: 'border-gray-200',
    badge: 'bg-blue-100 text-blue-700',
    features: ['1 Branch', '5 Users', 'Inventory & POS', 'Online Storefront', 'Sales & Orders', 'Basic Reports'],
  },
  {
    key: 'pro',
    label: 'Pro',
    price: 79,
    popular: true,
    color: 'border-[#0D3B6E]',
    badge: 'bg-purple-100 text-purple-700',
    features: ['5 Branches', '20 Users', 'All Starter features', 'HR & Payroll', 'Procurement', 'Advanced Reports', 'Priority Support'],
  },
  {
    key: 'enterprise',
    label: 'Enterprise',
    price: 199,
    color: 'border-gray-200',
    badge: 'bg-orange-100 text-orange-700',
    features: ['Unlimited Branches', 'Unlimited Users', 'All Pro features', 'Dedicated Support', 'Custom Onboarding', 'SLA Guarantee'],
  },
];

const TESTIMONIALS = [
  { name: 'James Okafor', role: 'Owner, Okafor Electronics', text: 'GEMS transformed how we run our 3 branches. Inventory is always accurate and our staff love the POS.', avatar: 'J' },
  { name: 'Sarah Mitchell', role: 'Manager, Chic Boutique', text: 'The online storefront alone was worth it. We went from zero online sales to 40% of our revenue in 2 months.', avatar: 'S' },
  { name: 'David Chen', role: 'CFO, ProTools Ltd', text: 'Finally an ERP that just works. The Paystack integration, real-time reports and role-based access made all the difference.', avatar: 'D' },
];

function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '', interest: 'demo' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = encodeURIComponent(
      `Hi GEMS Team!\n\nName: ${form.name}\nEmail: ${form.email}\nPhone: ${form.phone}\nInterest: ${form.interest === 'demo' ? 'Schedule a Demo' : 'General Enquiry'}\n\nMessage:\n${form.message}`
    );
    window.open(`https://wa.me/233241550366?text=${text}`, '_blank');
    setStatus('sent');
    setForm({ name: '', email: '', phone: '', message: '', interest: 'demo' });
    setTimeout(() => setStatus('idle'), 4000);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 rounded-2xl p-8 space-y-5 border border-gray-100">
      <h3 className="font-bold text-gray-900 text-lg">Send us a message</h3>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Full Name *</label>
          <input required value={form.name} onChange={e => set('name', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            placeholder="John Mensah" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Email *</label>
          <input required type="email" value={form.email} onChange={e => set('email', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            placeholder="you@company.com" />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Phone / WhatsApp</label>
          <input value={form.phone} onChange={e => set('phone', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            placeholder="+233 XX XXX XXXX" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">I want to…</label>
          <select value={form.interest} onChange={e => set('interest', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            <option value="demo">Schedule a Demo</option>
            <option value="pricing">Ask about Pricing</option>
            <option value="support">Get Support</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Message</label>
        <textarea rows={4} value={form.message} onChange={e => set('message', e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none"
          placeholder="Tell us about your business and what you're looking for…" />
      </div>

      <button type="submit"
        className="w-full bg-[#0D3B6E] hover:bg-[#1A5294] text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
        {status === 'sending' ? 'Sending…' : (
          <>
            <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.855L.057 23.428a.75.75 0 00.916.916l5.573-1.471A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.693 9.693 0 01-4.953-1.358l-.355-.211-3.683.972.986-3.595-.231-.371A9.694 9.694 0 012.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z" /></svg>
            Send via WhatsApp
          </>
        )}
      </button>

      {status === 'sent' && (
        <p className="text-center text-sm text-green-600 font-medium">✓ Opening WhatsApp… we'll reply shortly!</p>
      )}
    </form>
  );
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const [heroVisible, setHeroVisible] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  // Trigger hero animations on mount
  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  // Animated counter hook
  const useCounter = (target: number, duration = 1500, start = heroVisible) => {
    const [val, setVal] = useState(0);
    useEffect(() => {
      if (!start) return;
      let startTime: number;
      const step = (ts: number) => {
        if (!startTime) startTime = ts;
        const progress = Math.min((ts - startTime) / duration, 1);
        setVal(Math.floor(progress * target));
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, [start, target, duration]);
    return val;
  };

  const revenue = useCounter(124);
  const orders = useCounter(1284);
  const products = useCounter(342);
  const customers = useCounter(891);

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── NAVBAR ── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-[0_1px_12px_rgba(0,0,0,0.06)]">
        <div className="max-w-7xl mx-auto px-6 h-[68px] flex items-center justify-between gap-8">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-11 h-11 bg-[#0D3B6E] rounded-xl flex items-center justify-center shadow-md shadow-blue-200">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="font-extrabold text-2xl tracking-tight text-[#0D3B6E] leading-tight">GEMS</div>
              <div className="text-xs text-gray-400 font-medium leading-tight">GTHINK Enterprise Management System</div>
            </div>
          </Link>

          {/* Desktop nav links — centred */}
          <div className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {NAV_LINKS.map(l => (
              <a
                key={l.label}
                href={l.href}
                className="relative text-sm font-medium text-gray-500 hover:text-[#0D3B6E] px-4 py-2 rounded-lg hover:bg-blue-50 transition-all group"
              >
                {l.label}
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-0 group-hover:w-4 h-0.5 bg-[#0D3B6E] rounded-full transition-all duration-200" />
              </a>
            ))}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-2 flex-shrink-0">
            <Link
              href="/login"
              className="text-sm font-semibold text-gray-600 hover:text-[#0D3B6E] hover:bg-gray-100 px-4 py-2 rounded-lg transition-all"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 bg-[#0D3B6E] hover:bg-[#1A5294] text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors shadow-md shadow-blue-200"
            >
              Get Started Free <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="w-5 h-5 text-gray-700" /> : <Menu className="w-5 h-5 text-gray-700" />}
          </button>
        </div>

        {/* Mobile drawer */}
        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-5 pt-3 pb-5">
            <div className="space-y-0.5 mb-4">
              {NAV_LINKS.map(l => (
                <a
                  key={l.label}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-between text-sm font-medium text-gray-700 hover:text-[#0D3B6E] hover:bg-blue-50 px-3 py-2.5 rounded-xl transition-colors"
                >
                  {l.label}
                  <ArrowRight className="w-3.5 h-3.5 text-gray-300" />
                </a>
              ))}
            </div>
            <div className="flex flex-col gap-2 pt-3 border-t border-gray-100">
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="text-center text-sm font-semibold text-gray-700 border border-gray-200 hover:border-[#0D3B6E]/40 hover:bg-blue-50 py-2.5 rounded-xl transition-all"
              >
                Log in
              </Link>
              <Link
                href="/register"
                onClick={() => setMenuOpen(false)}
                className="text-center bg-[#0D3B6E] hover:bg-[#1A5294] text-white text-sm font-bold py-2.5 rounded-xl transition-colors shadow-md shadow-blue-200"
              >
                Get Started Free →
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="bg-gradient-to-br from-[#0D3B6E] via-[#1A5294] to-[#0D3B6E] text-white py-20 px-6 overflow-hidden relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/5 rounded-full" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-yellow-400/10 rounded-full" />
          <div className="absolute top-1/2 left-1/4 w-72 h-72 bg-white/3 rounded-full -translate-y-1/2" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            {/* Left — text */}
            <div ref={heroRef} className="flex flex-col">
              <div style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'translateY(0)' : 'translateY(24px)', transition: 'opacity 0.6s ease, transform 0.6s ease', transitionDelay: '0ms' }}>
                <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
                  <Zap className="w-3.5 h-3.5 text-yellow-400" />
                  Smart Workplace — Your Business. One System.
                </div>
              </div>
              <div style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'translateY(0)' : 'translateY(24px)', transition: 'opacity 0.6s ease, transform 0.6s ease', transitionDelay: '150ms' }}>
                <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight mb-6">
                  Manage Your Entire Business<br />
                  <span className="text-yellow-400">From One Place.</span>
                </h1>
              </div>
              <div style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'translateY(0)' : 'translateY(24px)', transition: 'opacity 0.6s ease, transform 0.6s ease', transitionDelay: '300ms' }}>
                <p className="text-lg text-blue-200 mb-8 leading-relaxed max-w-lg">
                  All-in-one platform for Stocks, Inventory, Sales, Procurement, Finance, HR, and CRM — all connected, all in real time.
                </p>
              </div>
              <div style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'translateY(0)' : 'translateY(24px)', transition: 'opacity 0.6s ease, transform 0.6s ease', transitionDelay: '450ms' }}>
                <div className="flex flex-col sm:flex-row gap-3 mb-8">
                  <Link href="/register" className="bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-extrabold px-7 py-3.5 rounded-xl text-base transition-colors flex items-center justify-center gap-2 shadow-lg">
                    Start Free Trial <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link href="/store/gems-store" className="bg-white/10 hover:bg-white/20 border border-white/30 text-white font-bold px-7 py-3.5 rounded-xl text-base transition-colors flex items-center justify-center gap-2">
                    <Store className="w-4 h-4" /> View Demo Store
                  </Link>
                </div>
                <p className="text-blue-300 text-sm">14-day free trial · Not charged until day 14 · Cancel anytime</p>
              </div>
              <div style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'translateY(0)' : 'translateY(24px)', transition: 'opacity 0.6s ease, transform 0.6s ease', transitionDelay: '600ms' }}>
                <div className="flex items-center gap-4 mt-8 pt-8 border-t border-white/10">
                  <div className="flex -space-x-2">
                    {['K', 'A', 'Y', 'M', 'E'].map((l, i) => (
                      <div key={i} className={`w-8 h-8 rounded-full border-2 border-[#0D3B6E] flex items-center justify-center text-xs font-bold text-white ${['bg-blue-500', 'bg-purple-500', 'bg-orange-400', 'bg-green-500', 'bg-pink-500'][i]
                        }`}>{l}</div>
                    ))}
                  </div>
                  <div>
                    <div className="flex gap-0.5 mb-0.5">
                      {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 text-yellow-400 fill-yellow-400" />)}
                    </div>
                    <p className="text-blue-200 text-xs">Trusted by <span className="font-bold text-white">500+</span> businesses</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right — dashboard mockup */}
            <div className="hidden lg:block" style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'translateX(0)' : 'translateX(40px)', transition: 'opacity 0.8s ease, transform 0.8s ease', transitionDelay: '300ms' }}>
              <div className="relative">
                <div className="absolute -inset-4 bg-blue-400/20 rounded-3xl blur-2xl" />
                <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden">

                  {/* Browser chrome */}
                  <div className="bg-gray-100 px-4 py-2.5 flex items-center gap-3 border-b border-gray-200">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                    </div>
                    <div className="flex-1 bg-white rounded-md h-5 flex items-center px-3">
                      <span className="text-[10px] text-gray-400 font-mono">app.gems-erp.com/dashboard</span>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4">
                    {/* KPI row — animated counters */}
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      {[
                        { label: 'Revenue', value: `GHS ${revenue}k`, change: '+12%', color: 'text-green-600', bar: 'bg-green-400', pct: '72%' },
                        { label: 'Orders', value: orders.toLocaleString(), change: '+8%', color: 'text-blue-600', bar: 'bg-blue-400', pct: '65%' },
                        { label: 'Products', value: products.toString(), change: '+3%', color: 'text-purple-600', bar: 'bg-purple-400', pct: '48%' },
                        { label: 'Customers', value: customers.toLocaleString(), change: '+18%', color: 'text-orange-600', bar: 'bg-orange-400', pct: '80%' },
                      ].map((k, i) => (
                        <div key={k.label} className="bg-white rounded-xl p-2.5 border border-gray-100 shadow-sm"
                          style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'translateY(0)' : 'translateY(12px)', transition: 'opacity 0.5s ease, transform 0.5s ease', transitionDelay: `${500 + i * 100}ms` }}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[9px] text-gray-400">{k.label}</span>
                            <span className="text-[8px] font-bold text-green-600 bg-green-50 px-1 py-0.5 rounded-full">{k.change}</span>
                          </div>
                          <div className={`text-sm font-extrabold ${k.color}`}>{k.value}</div>
                          <div className="mt-1.5 h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-1 rounded-full ${k.bar}`}
                              style={{ width: heroVisible ? k.pct : '0%', transition: 'width 1.2s ease', transitionDelay: `${700 + i * 100}ms` }} />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Charts row */}
                    <div className="grid grid-cols-3 gap-2">
                      {/* Area chart */}
                      <div className="col-span-2 bg-white rounded-xl p-3 border border-gray-100 shadow-sm"
                        style={{ opacity: heroVisible ? 1 : 0, transition: 'opacity 0.6s ease', transitionDelay: '900ms' }}>
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <div className="text-[10px] font-bold text-gray-700">Revenue Trend</div>
                            <div className="text-[9px] text-gray-400">Last 8 months</div>
                          </div>
                          <div className="flex items-center gap-2 text-[9px] text-gray-400">
                            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#0D3B6E] inline-block" />Revenue</span>
                            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block" />Orders</span>
                          </div>
                        </div>
                        <svg viewBox="0 0 280 65" className="w-full" preserveAspectRatio="none">
                          {[16, 32, 48].map(y => <line key={y} x1="0" y1={y} x2="280" y2={y} stroke="#f3f4f6" strokeWidth="1" />)}
                          <defs>
                            <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#0D3B6E" stopOpacity="0.2" />
                              <stop offset="100%" stopColor="#0D3B6E" stopOpacity="0" />
                            </linearGradient>
                            <linearGradient id="og" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#facc15" stopOpacity="0.2" />
                              <stop offset="100%" stopColor="#facc15" stopOpacity="0" />
                            </linearGradient>
                          </defs>
                          {/* Animated area fill */}
                          <path d="M0,52 C35,46 70,34 105,28 C140,22 175,36 210,22 C245,8 262,14 280,8 L280,65 L0,65 Z" fill="url(#rg)"
                            style={{ opacity: heroVisible ? 1 : 0, transition: 'opacity 0.8s ease', transitionDelay: '1000ms' }} />
                          {/* Animated line draw */}
                          <path d="M0,52 C35,46 70,34 105,28 C140,22 175,36 210,22 C245,8 262,14 280,8"
                            fill="none" stroke="#0D3B6E" strokeWidth="1.5" strokeLinecap="round"
                            strokeDasharray="400" strokeDashoffset={heroVisible ? '0' : '400'}
                            style={{ transition: 'stroke-dashoffset 1.4s ease', transitionDelay: '1000ms' }} />
                          <path d="M0,58 C35,54 70,50 105,46 C140,42 175,48 210,42 C245,36 262,38 280,32 L280,65 L0,65 Z" fill="url(#og)"
                            style={{ opacity: heroVisible ? 1 : 0, transition: 'opacity 0.8s ease', transitionDelay: '1200ms' }} />
                          <path d="M0,58 C35,54 70,50 105,46 C140,42 175,48 210,42 C245,36 262,38 280,32"
                            fill="none" stroke="#facc15" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 2"
                            strokeDashoffset={heroVisible ? '0' : '400'}
                            style={{ transition: 'stroke-dashoffset 1.4s ease', transitionDelay: '1200ms' }} />
                          {[[0, 52], [105, 28], [210, 22], [280, 8]].map(([x, y], i) => (
                            <circle key={i} cx={x} cy={y} r="2.5" fill="#0D3B6E" stroke="white" strokeWidth="1"
                              style={{ opacity: heroVisible ? 1 : 0, transition: 'opacity 0.3s ease', transitionDelay: `${1300 + i * 100}ms` }} />
                          ))}
                        </svg>
                        <div className="flex justify-between mt-1">
                          {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'].map(m => (
                            <span key={m} className="text-[8px] text-gray-300">{m}</span>
                          ))}
                        </div>
                      </div>

                      {/* Right column */}
                      <div className="flex flex-col gap-2">
                        {/* Donut */}
                        <div className="bg-white rounded-xl p-2.5 border border-gray-100 shadow-sm flex-1"
                          style={{ opacity: heroVisible ? 1 : 0, transition: 'opacity 0.6s ease', transitionDelay: '1100ms' }}>
                          <div className="text-[10px] font-bold text-gray-700 mb-1.5">Stock Status</div>
                          <div className="flex items-center gap-2">
                            <svg viewBox="0 0 36 36" className="w-12 h-12 flex-shrink-0 -rotate-90">
                              <circle cx="18" cy="18" r="14" fill="none" stroke="#f3f4f6" strokeWidth="5" />
                              <circle cx="18" cy="18" r="14" fill="none" stroke="#22c55e" strokeWidth="5"
                                strokeDasharray={heroVisible ? '52 36' : '0 88'} strokeLinecap="round"
                                style={{ transition: 'stroke-dasharray 1s ease', transitionDelay: '1200ms' }} />
                              <circle cx="18" cy="18" r="14" fill="none" stroke="#facc15" strokeWidth="5"
                                strokeDasharray={heroVisible ? '20 68' : '0 88'} strokeDashoffset="-52" strokeLinecap="round"
                                style={{ transition: 'stroke-dasharray 1s ease', transitionDelay: '1350ms' }} />
                              <circle cx="18" cy="18" r="14" fill="none" stroke="#ef4444" strokeWidth="5"
                                strokeDasharray={heroVisible ? '16 72' : '0 88'} strokeDashoffset="-72" strokeLinecap="round"
                                style={{ transition: 'stroke-dasharray 1s ease', transitionDelay: '1500ms' }} />
                            </svg>
                            <div className="space-y-1">
                              {[['bg-green-500', 'In Stock', '60%'], ['bg-yellow-400', 'Low', '23%'], ['bg-red-400', 'Out', '17%']].map(([c, l, v], i) => (
                                <div key={l} className="flex items-center gap-1">
                                  <span className={`w-1.5 h-1.5 rounded-full ${c}`} />
                                  <span className="text-[9px] text-gray-500">{l}</span>
                                  <span className="text-[9px] font-bold text-gray-700 ml-auto">{v}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Recent orders */}
                        <div className="bg-white rounded-xl p-2.5 border border-gray-100 shadow-sm flex-1"
                          style={{ opacity: heroVisible ? 1 : 0, transition: 'opacity 0.6s ease', transitionDelay: '1300ms' }}>
                          <div className="text-[10px] font-bold text-gray-700 mb-1.5">Recent Orders</div>
                          <div className="space-y-1.5">
                            {[['Kofi M.', 'GHS 420', 'bg-green-400'], ['Abena A.', 'GHS 185', 'bg-yellow-400'], ['Yaw D.', 'GHS 930', 'bg-green-400']].map(([n, a, c], i) => (
                              <div key={n} className="flex items-center justify-between"
                                style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'translateX(0)' : 'translateX(8px)', transition: 'opacity 0.4s ease, transform 0.4s ease', transitionDelay: `${1400 + i * 100}ms` }}>
                                <div className="flex items-center gap-1">
                                  <div className={`w-1.5 h-1.5 rounded-full ${c}`} />
                                  <span className="text-[9px] text-gray-600">{n}</span>
                                </div>
                                <span className="text-[9px] font-bold text-gray-700">{a}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="bg-white border-b border-gray-100 py-14 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {[
              { value: '500+', label: 'Businesses', icon: Building2, color: 'bg-blue-50 text-blue-600' },
              { value: '9', label: 'Modules', icon: Package, color: 'bg-purple-50 text-purple-600' },
              { value: '99.9%', label: 'Uptime', icon: Zap, color: 'bg-yellow-50 text-yellow-600' },
              { value: '24/7', label: 'Support', icon: Shield, color: 'bg-green-50 text-green-600' },
            ].map(s => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="flex items-center gap-4 p-5 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${s.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-2xl font-extrabold text-gray-900">{s.value}</div>
                    <div className="text-sm text-gray-400">{s.label}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">

          <div className="text-center mb-14">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-[#0D3B6E] bg-blue-50 px-3 py-1.5 rounded-full mb-4">Everything you need</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">One System. Every Module.</h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">GEMS gives you Inventory, Sales, Procurement, Finance, HR and CRM — all connected, all in real time.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">

            {/* Left — tabs */}
            <div className="lg:col-span-2 flex flex-col gap-2">
              {FEATURES.map((f, i) => {
                const Icon = f.icon;
                const isActive = activeFeature === i;
                return (
                  <button key={f.title} onClick={() => setActiveFeature(i)}
                    className="w-full text-left px-4 py-3.5 rounded-xl border transition-all duration-200"
                    style={{
                      background: isActive ? `linear-gradient(135deg, ${f.accent}12, ${f.accent}06)` : '#f9fafb',
                      borderColor: isActive ? f.accent + '50' : '#e5e7eb',
                      boxShadow: isActive ? `0 0 16px ${f.accent}18` : 'none',
                    }}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: isActive ? f.accent : f.accent + '20' }}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`font-bold text-sm ${isActive ? 'text-gray-900' : 'text-gray-600'}`}>{f.title}</div>
                        <div className={`text-xs truncate mt-0.5 ${isActive ? 'text-gray-500' : 'text-gray-400'}`}>{f.tagline}</div>
                      </div>
                      <div className="w-1 h-6 rounded-full flex-shrink-0 transition-all"
                        style={{ backgroundColor: isActive ? f.accent : 'transparent' }} />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right — detail panel */}
            <div className="lg:col-span-3">
              {FEATURES.map((f, i) => {
                const Icon = f.icon;
                if (activeFeature !== i) return null;
                const PATHS: Record<string, { area: string, line: string, dots: number[][] }> = {
                  inventory: { area: 'M0,50 C40,44 80,30 120,24 C160,18 200,32 240,18 C270,8 300,10 320,5 L320,72 L0,72 Z', line: 'M0,50 C40,44 80,30 120,24 C160,18 200,32 240,18 C270,8 300,10 320,5', dots: [[0, 50], [120, 24], [240, 18], [320, 5]] },
                  sales: { area: 'M0,56 C40,48 80,38 120,30 C160,22 200,36 240,22 C270,10 300,14 320,7 L320,72 L0,72 Z', line: 'M0,56 C40,48 80,38 120,30 C160,22 200,36 240,22 C270,10 300,14 320,7', dots: [[0, 56], [120, 30], [240, 22], [320, 7]] },
                  accounting: { area: 'M0,44 C40,40 80,34 120,28 C160,22 200,28 240,20 C270,14 300,16 320,10 L320,72 L0,72 Z', line: 'M0,44 C40,40 80,34 120,28 C160,22 200,28 240,20 C270,14 300,16 320,10', dots: [[0, 44], [120, 28], [240, 20], [320, 10]] },
                  procurement: { area: 'M0,52 C40,48 80,42 120,36 C160,30 200,36 240,28 C270,20 300,22 320,14 L320,72 L0,72 Z', line: 'M0,52 C40,48 80,42 120,36 C160,30 200,36 240,28 C270,20 300,22 320,14', dots: [[0, 52], [120, 36], [240, 28], [320, 14]] },
                  hr: { area: 'M0,50 C40,46 80,40 120,34 C160,28 200,34 240,24 C270,16 300,18 320,12 L320,72 L0,72 Z', line: 'M0,50 C40,46 80,40 120,34 C160,28 200,34 240,24 C270,16 300,18 320,12', dots: [[0, 50], [120, 34], [240, 24], [320, 12]] },
                  crm: { area: 'M0,58 C40,52 80,44 120,36 C160,28 200,40 240,26 C270,14 300,16 320,8 L320,72 L0,72 Z', line: 'M0,58 C40,52 80,44 120,36 C160,28 200,40 240,26 C270,14 300,16 320,8', dots: [[0, 58], [120, 36], [240, 26], [320, 8]] },
                };
                const STATS: Record<string, { l: string, v: string }[]> = {
                  inventory: [{ l: 'Products', v: '342' }, { l: 'Low Stock', v: '18' }, { l: 'Turnover', v: '94%' }],
                  sales: [{ l: 'Orders', v: '1,284' }, { l: 'Revenue', v: 'GHS 124k' }, { l: 'Avg Order', v: 'GHS 97' }],
                  accounting: [{ l: 'Expenses', v: 'GHS 42k' }, { l: 'Net Profit', v: 'GHS 82k' }, { l: 'Entries', v: '156' }],
                  procurement: [{ l: 'POs', v: '48' }, { l: 'Suppliers', v: '12' }, { l: 'On Time', v: '91%' }],
                  hr: [{ l: 'Employees', v: '24' }, { l: 'On Leave', v: '2' }, { l: 'Attendance', v: '97%' }],
                  crm: [{ l: 'Customers', v: '891' }, { l: 'Leads', v: '64' }, { l: 'Won', v: '38%' }],
                };
                const p = PATHS[f.preview];
                const s = STATS[f.preview];
                return (
                  <div key={f.title} className="rounded-2xl overflow-hidden"
                    style={{ background: `linear-gradient(145deg, ${f.accent}08 0%, #f8faff 60%, #ffffff 100%)`, border: `1px solid ${f.accent}25` }}>

                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: `1px solid ${f.accent}20` }}>
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: f.accent + '25', border: `1px solid ${f.accent}40` }}>
                          <Icon className="w-5 h-5" style={{ color: f.accent }} />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-gray-900">{f.title}</h3>
                          <p className="text-xs text-gray-400 mt-0.5">{f.tagline}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-extrabold" style={{ color: f.accent }}>{f.stat.value}</div>
                        <div className="text-[10px] text-gray-500">{f.stat.label}</div>
                      </div>
                    </div>

                    <div className="px-6 py-5">

                      {/* Description */}
                      <p className="text-gray-500 text-sm leading-relaxed mb-5">{f.desc}</p>

                      {/* Bullets */}
                      <div className="grid grid-cols-2 gap-2 mb-5">
                        {f.bullets.map((b, bi) => (
                          <div key={b} className="flex items-center gap-2"
                            style={{ opacity: 1, transform: 'translateX(0)', transition: `opacity 0.4s ease ${bi * 0.07}s, transform 0.4s ease ${bi * 0.07}s` }}>
                            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: f.accent }} />
                            <span className="text-xs text-gray-600">{b}</span>
                          </div>
                        ))}
                      </div>

                      {/* Chart */}
                      <div className="rounded-xl p-4" style={{ background: '#f8faff', border: `1px solid ${f.accent}20` }}>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">6-Month Trend</span>
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: f.accent, display: 'inline-block' }} />
                            <span className="text-[10px] text-gray-400">Performance</span>
                          </div>
                        </div>

                        <svg viewBox="0 0 320 72" className="w-full" preserveAspectRatio="none">
                          {[18, 36, 54].map(y => <line key={y} x1="0" y1={y} x2="320" y2={y} stroke="#e5e7eb" strokeWidth="1" />)}
                          <defs>
                            <linearGradient id={`g${i}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={f.accent} stopOpacity="0.5" />
                              <stop offset="100%" stopColor={f.accent} stopOpacity="0.02" />
                            </linearGradient>
                          </defs>
                          <path d={p.area} fill={`url(#g${i})`}
                            style={{ opacity: 1, transition: 'opacity 0.5s ease 0.1s' }} />
                          <path d={p.line} fill="none" stroke={f.accent} strokeWidth="2" strokeLinecap="round"
                            strokeDasharray="500" strokeDashoffset={activeFeature === i ? '0' : '500'}
                            style={{ transition: 'stroke-dashoffset 1.2s ease 0.1s' }} />
                          {p.dots.map(([x, y], pi) => (
                            <circle key={pi} cx={x} cy={y} r="3.5"
                              fill="#f8faff" stroke={f.accent} strokeWidth="2"
                              style={{ opacity: activeFeature === i ? 1 : 0, transition: `opacity 0.3s ease ${0.8 + pi * 0.12}s` }} />
                          ))}
                        </svg>

                        <div className="flex justify-between mt-1">
                          {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map(m => (
                            <span key={m} className="text-[9px] text-gray-400">{m}</span>
                          ))}
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-3 mt-4 pt-4" style={{ borderTop: `1px solid #e5e7eb` }}>
                          {s.map(({ l, v }, si) => (
                            <div key={l}
                              style={{ opacity: activeFeature === i ? 1 : 0, transform: activeFeature === i ? 'translateY(0)' : 'translateY(8px)', transition: `opacity 0.4s ease ${0.4 + si * 0.1}s, transform 0.4s ease ${0.4 + si * 0.1}s` }}>
                              <div className="text-base font-extrabold" style={{ color: f.accent }}>{v}</div>
                              <div className="text-[10px] text-gray-400">{l}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <Link href="/register"
                        className="inline-flex items-center gap-2 mt-5 text-sm font-bold transition-all hover:gap-3"
                        style={{ color: f.accent }}>
                        Get started with {f.title} <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* More modules */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-12">
            <span className="text-sm text-gray-400 mr-1">Also includes:</span>
            {MORE_MODULES.map(m => (
              <span key={m} className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 border border-gray-200 px-3 py-1.5 rounded-full transition-colors">
                <CheckCircle className="w-3 h-3 text-green-500" /> {m}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="bg-gray-50 py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-[#0D3B6E] bg-blue-50 px-3 py-1.5 rounded-full mb-4">Simple setup</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">Up and running in minutes</h2>
            <p className="text-gray-500 text-lg">No IT team needed. No complex setup. Just sign up and go.</p>
          </div>
          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Connector line — sits behind the step numbers */}
            <div className="hidden md:block absolute top-8 left-[calc(16.67%+16px)] right-[calc(16.67%+16px)] h-0.5 bg-gray-200" />
            {STEPS.map((s, i) => (
              <div key={s.step} className="relative text-center">
                <div className="relative z-10 inline-flex w-16 h-16 rounded-2xl bg-[#0D3B6E] text-white items-center justify-center text-xl font-extrabold mb-5 shadow-lg shadow-blue-200">
                  {s.step}
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-[#0D3B6E] bg-blue-50 px-3 py-1.5 rounded-full mb-4">Pricing</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">Simple, transparent pricing</h2>
            <p className="text-gray-500 text-lg">Start free for 14 days. Not charged until day 14. Cancel anytime.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {PLANS.map(p => (
              <div key={p.key} className={`relative bg-white rounded-2xl border-2 p-8 flex flex-col ${p.popular ? 'border-[#0D3B6E] shadow-2xl shadow-blue-100' : 'border-gray-200'
                }`}>
                {p.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#0D3B6E] text-white text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap">
                    Most Popular
                  </div>
                )}
                <span className={`text-xs font-bold px-3 py-1 rounded-full inline-block mb-4 w-fit ${p.badge}`}>{p.label}</span>
                <div className="text-4xl font-extrabold text-gray-900 mb-1">
                  ${p.price}<span className="text-base font-normal text-gray-400">/mo</span>
                </div>
                <p className="text-xs text-gray-400 mb-6">per month, billed monthly</p>
                <ul className="space-y-3 flex-1 mb-8">
                  {p.features.map(f => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`w-full text-center font-bold py-3 rounded-xl text-sm transition-colors ${p.popular
                    ? 'bg-[#0D3B6E] hover:bg-[#1A5294] text-white shadow-lg shadow-blue-200'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                    }`}
                >
                  Start free trial
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-gray-400 mt-8">All plans include a 14-day free trial. No credit card charged until day 14.</p>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="bg-gray-50 py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-[#0D3B6E] bg-blue-50 px-3 py-1.5 rounded-full mb-4">Testimonials</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">Trusted by businesses worldwide</h2>
            <p className="text-gray-500 text-lg">See what our customers say about running their business on GEMS.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div key={t.name} className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-md transition-shadow flex flex-col">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />)}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-6 flex-1">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-3 pt-4 border-t border-gray-50">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm ${i === 0 ? 'bg-gradient-to-br from-blue-500 to-blue-700' :
                    i === 1 ? 'bg-gradient-to-br from-purple-500 to-purple-700' :
                      'bg-gradient-to-br from-orange-400 to-orange-600'
                    }`}>
                    {t.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{t.name}</div>
                    <div className="text-xs text-gray-400">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="relative bg-gradient-to-br from-[#0D3B6E] via-[#1A5294] to-[#0D3B6E] py-24 px-6 text-white overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/5 rounded-full" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-yellow-400/10 rounded-full" />
        </div>
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">Ready to run your business smarter?</h2>
          <p className="text-blue-200 text-lg mb-10 max-w-xl mx-auto">Join hundreds of businesses already using GEMS to manage their entire operations from one smart workplace.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
            <a href="tel:+233241550366" className="bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-extrabold px-8 py-4 rounded-xl text-base transition-colors flex items-center justify-center gap-2 shadow-lg">
              <Phone className="w-4 h-4" /> Call Us Now
            </a>
            <Link href="/login" className="bg-white/10 hover:bg-white/20 border border-white/30 text-white font-bold px-8 py-4 rounded-xl text-base transition-colors flex items-center justify-center">
              Log In to Dashboard
            </Link>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6">
            {[
              { icon: Shield, text: 'Secure & reliable' },
              { icon: Globe, text: 'Paystack payments' },
              { icon: Zap, text: 'Setup in minutes' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2 text-blue-200 text-sm">
                <Icon className="w-4 h-4 text-yellow-400" /> {text}
              </div>
            ))}
          </div>
          <p className="text-blue-300 text-xs mt-6">14-day free trial · Not charged until day 14 · Cancel anytime</p>
        </div>
      </section>

      {/* ── CONTACT ── */}
      <section id="contact" className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">

          {/* Heading */}
          <div className="text-center mb-14">
            <span className="inline-block bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest mb-4">Contact Us</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">Get in touch or schedule a demo</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">Have questions? Want to see GEMS in action? Reach out and our team will get back to you within 24 hours.</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-start">

            {/* Left — contact info */}
            <div className="space-y-8">
              {[
                {
                  icon: (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  ),
                  label: 'Email us',
                  value: 'hello@gthink.com',
                  href: 'mailto:hello@gthink.com',
                },
                {
                  icon: (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.855L.057 23.428a.75.75 0 00.916.916l5.573-1.471A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.693 9.693 0 01-4.953-1.358l-.355-.211-3.683.972.986-3.595-.231-.371A9.694 9.694 0 012.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z" /></svg>
                  ),
                  label: 'WhatsApp',
                  value: '+233 24 155 0366',
                  href: 'https://wa.me/233241550366?text=Hi%20GEMS%20Team%2C%20I%27d%20like%20to%20schedule%20a%20demo.',
                },
                {
                  icon: (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  ),
                  label: 'Location',
                  value: 'Accra, Ghana',
                  href: null,
                },
              ].map(({ icon, label, value, href }) => (
                <div key={label} className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                    {icon}
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">{label}</p>
                    {href ? (
                      <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="text-gray-900 font-semibold hover:text-blue-600 transition-colors">{value}</a>
                    ) : (
                      <p className="text-gray-900 font-semibold">{value}</p>
                    )}
                  </div>
                </div>
              ))}

              {/* Schedule demo CTA */}
              <div className="bg-gradient-to-br from-[#0D3B6E] to-[#1A5294] rounded-2xl p-6 text-white">
                <h3 className="font-bold text-lg mb-2">Book a free demo</h3>
                <p className="text-blue-200 text-sm mb-4">See GEMS live in 20 minutes. We'll walk you through every module tailored to your business.</p>
                <a
                  href="https://wa.me/233241550366?text=Hi%20GEMS%20Team%2C%20I%27d%20like%20to%20book%20a%20free%20demo."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors"
                >
                  <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.855L.057 23.428a.75.75 0 00.916.916l5.573-1.471A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.693 9.693 0 01-4.953-1.358l-.355-.211-3.683.972.986-3.595-.231-.371A9.694 9.694 0 012.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z" /></svg>
                  Chat on WhatsApp
                </a>
              </div>
            </div>

            {/* Right — contact form */}
            <ContactForm />

          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-gray-900 text-white">

        {/* Trust bar */}
        <div className="bg-gray-800 border-b border-gray-700">
          <div className="max-w-7xl mx-auto px-6 py-5 grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Shield, title: 'Enterprise Security', sub: 'SOC 2 compliant, 256-bit SSL' },
              { icon: Zap, title: '99.9% Uptime', sub: 'Guaranteed SLA for all plans' },
              { icon: Globe, title: 'Works Everywhere', sub: 'Multi-currency, multi-branch' },
              { icon: BarChart2, title: 'Real-Time Data', sub: 'Live dashboards & reports' },
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
              <div className="flex items-center gap-3 mb-4">
                <img src="/ag.png" alt="GEMS Logo" className="h-24 w-auto object-contain" />
              </div>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                The all-in-one business management platform for growing companies. Inventory, Sales, Finance, HR, Procurement and CRM — all connected in real time.
              </p>

              {/* Newsletter */}
              <p className="text-xs font-semibold text-gray-300 uppercase tracking-wide mb-2">Get product updates</p>
              <div className="flex mb-6">
                <input
                  type="email"
                  placeholder="your@company.com"
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-l-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 transition-colors"
                />
                <button className="bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold text-xs px-4 rounded-r-lg transition-colors flex-shrink-0">
                  Subscribe
                </button>
              </div>

              {/* Social */}
              <div className="flex gap-2">
                {[
                  { label: 'LinkedIn', path: 'M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z M4 6a2 2 0 100-4 2 2 0 000 4z' },
                  { label: 'Twitter', path: 'M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z' },
                  { label: 'Facebook', path: 'M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z' },
                  { label: 'YouTube', path: 'M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 00-1.95 1.96A29 29 0 001 12a29 29 0 00.46 5.58A2.78 2.78 0 003.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.95A29 29 0 0023 12a29 29 0 00-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z' },
                ].map(s => (
                  <button key={s.label} aria-label={s.label}
                    className="w-9 h-9 rounded-lg bg-gray-800 hover:bg-yellow-400 text-gray-400 hover:text-gray-900 border border-gray-700 hover:border-yellow-400 flex items-center justify-center transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                      <path d={s.path} />
                    </svg>
                  </button>
                ))}
              </div>
            </div>

            {/* Product */}
            <div className="md:col-span-2">
              <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-5 pb-3 border-b border-gray-700">Product</h4>
              <ul className="space-y-3">
                {[
                  { label: 'Features', href: '#features' },
                  { label: 'Pricing', href: '#pricing' },
                  { label: 'How it works', href: '#how-it-works' },
                  { label: 'Demo Store', href: '/store/gems-store' },
                  { label: 'Changelog', href: '#' },
                  { label: 'Roadmap', href: '#' },
                ].map(l => (
                  <li key={l.label}>
                    <a href={l.href} className="text-gray-400 hover:text-yellow-400 text-sm transition-colors">{l.label}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div className="md:col-span-2">
              <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-5 pb-3 border-b border-gray-700">Company</h4>
              <ul className="space-y-3">
                {['About Us', 'Blog', 'Careers', 'Press', 'Partners', 'Contact'].map(l => (
                  <li key={l}>
                    <a href="#" className="text-gray-400 hover:text-yellow-400 text-sm transition-colors">{l}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support + Legal */}
            <div className="md:col-span-4">
              <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-5 pb-3 border-b border-gray-700">Support</h4>
              <ul className="space-y-3 mb-8">
                {[
                  { icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', text: 'support@gems-erp.com' },
                  { icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z', text: '+1 (800) GEMS-ERP' },
                  { icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', text: 'Mon – Fri, 9am – 6pm UTC' },
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-400 flex-shrink-0">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                      </svg>
                    </div>
                    <span className="text-gray-400 text-sm">{item.text}</span>
                  </li>
                ))}
              </ul>

              <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-4 pb-3 border-b border-gray-700">Legal</h4>
              <ul className="space-y-3">
                {['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'GDPR'].map(l => (
                  <li key={l}>
                    <a href="#" className="text-gray-400 hover:text-yellow-400 text-sm transition-colors">{l}</a>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-800 bg-gray-950">
          <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-gray-500 text-xs">Copyright &copy; 2026 GTHINK Company Limited &mdash; All rights reserved</p>
            <p className="text-gray-500 text-xs">GEMS &mdash; GTHINK Enterprise Management System</p>
          </div>
        </div>

      </footer>

      {/* WhatsApp Floating Action Button */}
      <a
        href="https://wa.me/233241550366?text=Hi%20GEMS%20Team%2C%20I%27d%20like%20to%20schedule%20a%20demo."
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-3 group"
        aria-label="Chat on WhatsApp"
      >
        {/* Tooltip */}
        <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
          Chat with us · Schedule a demo
        </span>
        {/* Button */}
        <div className="relative flex items-center justify-center w-14 h-14 rounded-full shadow-lg shadow-green-400/40 bg-[#25D366] hover:bg-[#20bd5a] transition-colors">
          {/* Pulse ring */}
          <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-30" />
          <svg viewBox="0 0 24 24" fill="white" className="w-7 h-7 relative z-10">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.855L.057 23.428a.75.75 0 00.916.916l5.573-1.471A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.693 9.693 0 01-4.953-1.358l-.355-.211-3.683.972.986-3.595-.231-.371A9.694 9.694 0 012.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z" />
          </svg>
        </div>
      </a>

    </div>
  );
}