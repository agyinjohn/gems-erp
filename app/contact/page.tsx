'use client';
import Link from 'next/link';
import { Package, Phone, Mail, MessageCircle, MessageSquare, MapPin, Clock } from 'lucide-react';
import { useState } from 'react';

const CHANNELS = [
  { type: 'email',     icon: Mail,          label: 'Email',    color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { type: 'sms',       icon: MessageCircle, label: 'SMS',      color: 'text-green-600 bg-green-50 border-green-200' },
  { type: 'whatsapp',  icon: MessageSquare, label: 'WhatsApp', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
] as const;

type Channel = 'email' | 'sms' | 'whatsapp';

export default function ContactPage() {
  const [channel, setChannel] = useState<Channel>('email');
  const [form, setForm] = useState({ name: '', contact: '', subject: '', message: '' });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSend = () => {
    if (!form.name || !form.contact || !form.message) return;
    if (channel === 'email') {
      window.location.href = `mailto:gthinkcompanylimited@gmail.com?subject=${encodeURIComponent(form.subject || 'Contact from ' + form.name)}&body=${encodeURIComponent(form.message)}`;
    } else if (channel === 'whatsapp') {
      window.open(`https://wa.me/233241550366?text=${encodeURIComponent(form.message)}`, '_blank');
    } else {
      window.location.href = `sms:+233241550366?body=${encodeURIComponent(form.message)}`;
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans">

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

      <section className="bg-gradient-to-br from-[#0D3B6E] via-[#1A5294] to-[#0D3B6E] text-white py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <span className="inline-block text-xs font-bold uppercase tracking-widest bg-white/10 border border-white/20 px-3 py-1.5 rounded-full mb-6">Contact Us</span>
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-4">Get in Touch</h1>
          <p className="text-blue-200 text-lg">Have a question or want to schedule a demo? We typically respond within a few hours.</p>
        </div>
      </section>

      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-12 items-start">

          {/* Info */}
          <div className="space-y-4">
            {[
              { icon: Phone,         label: 'Call Us',  value: '+233 241 550 366', sub: '+233 256 791 600 · +233 303 957 042', href: 'tel:+233241550366',                          color: 'bg-blue-50 text-blue-600' },
              { icon: MessageCircle, label: 'SMS',      value: '+233 241 550 366', sub: 'Text us anytime',                     href: 'sms:+233241550366',                           color: 'bg-green-50 text-green-600' },
              { icon: MessageSquare, label: 'WhatsApp', value: '+233 241 550 366', sub: 'Quick responses guaranteed',          href: 'https://wa.me/233241550366',                  color: 'bg-emerald-50 text-emerald-600' },
              { icon: Mail,          label: 'Email',    value: 'gthinkcompanylimited@gmail.com', sub: 'We reply within 24 hours', href: 'mailto:gthinkcompanylimited@gmail.com',   color: 'bg-purple-50 text-purple-600' },
              { icon: MapPin,        label: 'Location', value: 'Accra, Ghana',     sub: 'West Africa',                        href: null,                                          color: 'bg-orange-50 text-orange-600' },
              { icon: Clock,         label: 'Hours',    value: 'Mon – Fri, 8am – 6pm GMT', sub: 'Weekend support via WhatsApp', href: null,                                        color: 'bg-gray-50 text-gray-600' },
            ].map(({ icon: Icon, label, value, sub, href, color }) => (
              <div key={label} className="flex items-center gap-4 bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-sm transition-shadow">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-0.5">{label}</div>
                  {href
                    ? <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer" className="font-semibold text-gray-900 hover:text-[#0D3B6E] transition-colors">{value}</a>
                    : <div className="font-semibold text-gray-900">{value}</div>
                  }
                  <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Form */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-5">Send us a message</h3>

            <div className="grid grid-cols-3 gap-2 mb-5">
              {CHANNELS.map(({ type, icon: Icon, label, color }) => (
                <button key={type} type="button" onClick={() => setChannel(type)}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${channel === type ? color + ' border-current' : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}>
                  <Icon className="w-4 h-4" /> {label}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Name *</label>
                  <input className="form-input" placeholder="Your name" value={form.name} onChange={e => set('name', e.target.value)} />
                </div>
                <div>
                  <label className="form-label">{channel === 'email' ? 'Email *' : 'Phone *'}</label>
                  <input className="form-input" placeholder={channel === 'email' ? 'you@company.com' : '+233 XX XXX XXXX'} value={form.contact} onChange={e => set('contact', e.target.value)} />
                </div>
              </div>
              {channel === 'email' && (
                <div>
                  <label className="form-label">Subject</label>
                  <input className="form-input" placeholder="e.g. Question about pricing" value={form.subject} onChange={e => set('subject', e.target.value)} />
                </div>
              )}
              <div>
                <label className="form-label">Message *</label>
                <textarea className="form-input" rows={4}
                  placeholder={channel === 'sms' ? 'Keep it short — 160 characters max' : 'Write your message here…'}
                  value={form.message} onChange={e => set('message', e.target.value)} />
                {channel === 'sms' && (
                  <p className={`text-xs mt-1 text-right ${form.message.length > 160 ? 'text-red-500' : 'text-gray-400'}`}>{form.message.length}/160</p>
                )}
              </div>
              <button onClick={handleSend}
                className="w-full bg-[#0D3B6E] hover:bg-[#1A5294] text-white font-bold h-12 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-200">
                {channel === 'email' ? <Mail className="w-4 h-4" /> : channel === 'sms' ? <MessageCircle className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                Send via {channel === 'email' ? 'Email' : channel === 'sms' ? 'SMS' : 'WhatsApp'}
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="bg-gray-900 text-center py-4">
        <p className="text-gray-500 text-xs">Copyright © 2026 GTHINK Company Limited — All rights reserved</p>
      </div>
    </div>
  );
}
