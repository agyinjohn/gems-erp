import Link from 'next/link';
import { Package, ArrowRight } from 'lucide-react';

export const metadata = { title: 'Blog — GEMS by GTHINK' };

const POSTS = [
  {
    tag: 'Product',
    title: 'How GEMS Helps You Track Stock Across Multiple Branches',
    excerpt: 'Managing inventory across multiple locations is one of the biggest challenges for growing businesses. Here is how GEMS solves it in real time.',
    date: 'June 10, 2025',
    readTime: '4 min read',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    tag: 'Finance',
    title: 'Why Double-Entry Bookkeeping Matters for Your Business',
    excerpt: 'Most small businesses skip proper accounting until it is too late. GEMS brings full double-entry bookkeeping to businesses of every size.',
    date: 'May 28, 2025',
    readTime: '5 min read',
    color: 'bg-yellow-50 text-yellow-600',
  },
  {
    tag: 'Sales',
    title: 'Setting Up Your Online Storefront with GEMS in Under 10 Minutes',
    excerpt: 'Your branded storefront is just a few clicks away. We walk you through the entire setup process step by step.',
    date: 'May 14, 2025',
    readTime: '3 min read',
    color: 'bg-purple-50 text-purple-600',
  },
  {
    tag: 'HR',
    title: 'Payroll Processing Made Simple: A Guide for Ghanaian SMEs',
    excerpt: 'Running payroll manually is error-prone and time-consuming. See how GEMS automates the entire process while staying compliant.',
    date: 'April 30, 2025',
    readTime: '6 min read',
    color: 'bg-pink-50 text-pink-600',
  },
  {
    tag: 'Payments',
    title: 'Accepting Mobile Money Payments with Paystack on GEMS',
    excerpt: 'Ghana runs on mobile money. GEMS integrates Paystack so your customers can pay with MTN, Vodafone Cash, and AirtelTigo Money.',
    date: 'April 15, 2025',
    readTime: '4 min read',
    color: 'bg-green-50 text-green-600',
  },
  {
    tag: 'CRM',
    title: 'Turn Walk-In Customers into Loyal Repeat Buyers with CRM',
    excerpt: 'Your customer data is your most valuable asset. Learn how to use GEMS CRM to build lasting relationships and increase repeat sales.',
    date: 'March 28, 2025',
    readTime: '5 min read',
    color: 'bg-orange-50 text-orange-600',
  },
];

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-white font-sans">

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
      <section className="bg-gradient-to-br from-[#0D3B6E] via-[#1A5294] to-[#0D3B6E] text-white py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <span className="inline-block text-xs font-bold uppercase tracking-widest bg-white/10 border border-white/20 px-3 py-1.5 rounded-full mb-6">Blog</span>
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-4">Insights & Guides</h1>
          <p className="text-blue-200 text-lg">Tips, tutorials and business insights to help you get the most out of GEMS.</p>
        </div>
      </section>

      {/* Posts */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {POSTS.map(post => (
              <div key={post.title} className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-md transition-shadow flex flex-col">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full w-fit mb-4 ${post.color}`}>{post.tag}</span>
                <h3 className="font-bold text-gray-900 mb-3 leading-snug flex-1">{post.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-5">{post.excerpt}</p>
                <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                  <span className="text-xs text-gray-400">{post.date} · {post.readTime}</span>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#0D3B6E]">Read <ArrowRight className="w-3 h-3" /></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="bg-gray-900 text-center py-4">
        <p className="text-gray-500 text-xs">Copyright © 2026 GTHINK Company Limited — All rights reserved</p>
      </div>
    </div>
  );
}
