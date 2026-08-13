'use client';

import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import SmsPanel from '@/components/messaging/SmsPanel';
import EmailPanel from '@/components/messaging/EmailPanel';
import { MessageSquare, Mail } from 'lucide-react';

/**
 * How the business reaches a customer.
 *
 * Two channels, one page, because nobody sets out to "use the SMS page" — they
 * set out to tell a customer their order is ready and then pick how it goes.
 * The same events drive both, and the wording for each is edited side by side.
 *
 * They are not the same underneath and the page does not pretend otherwise. A
 * text spends prepaid credits and is rationed by the segment. An email costs
 * nothing but only works once the business has pointed us at a mailbox of its
 * own, because mail sent from someone else's address is mail that lands in spam.
 */

type Channel = 'sms' | 'email';

export default function MessagingPage() {
  const [channel, setChannel] = useState<Channel>('sms');

  return (
    <AppLayout
      title="Messaging"
      subtitle="How customers hear from you — by text and by email"
      allowedRoles={['platform_admin', 'business_owner', 'branch_manager']}
    >
      <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 mb-5 w-fit">
        {([['sms', 'SMS', MessageSquare], ['email', 'Email', Mail]] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => setChannel(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              channel === key ? 'bg-[#0D3B6E] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {channel === 'sms' ? <SmsPanel /> : <EmailPanel />}
    </AppLayout>
  );
}
