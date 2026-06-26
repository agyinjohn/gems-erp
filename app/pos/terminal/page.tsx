'use client';

import PosShell from '@/components/pos/PosShell';
import PosTerminal from '@/components/pos/PosTerminal';

export default function POSTerminalPage() {
  return (
    <PosShell>
      <PosTerminal standalone />
    </PosShell>
  );
}
