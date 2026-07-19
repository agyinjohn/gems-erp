'use client';
import { Building2, ChevronDown } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export default function BranchSelector() {
  const { isOrgLevel, branches, activeBranchId, setActiveBranch } = useAuth();

  // Branch-level users are pinned server-side — no selector needed
  if (!isOrgLevel || branches.length < 2) return null;

  const active = branches.find(b => b.id === activeBranchId);

  return (
    <div className="relative inline-flex items-center">
      <Building2 className="w-4 h-4 text-gray-400 absolute left-3 pointer-events-none" />
      <select
        value={activeBranchId}
        onChange={e => setActiveBranch(e.target.value)}
        className="pl-9 pr-8 py-2 text-sm font-medium bg-white border border-gray-200 rounded-xl text-gray-700 hover:border-[#0D3B6E]/40 focus:outline-none focus:ring-2 focus:ring-[#0D3B6E]/20 focus:border-[#0D3B6E]/50 appearance-none cursor-pointer transition-colors"
      >
        <option value="">All Branches</option>
        {branches.map(b => (
          <option key={b.id} value={b.id}>{b.name}</option>
        ))}
      </select>
      <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 pointer-events-none" />
    </div>
  );
}
