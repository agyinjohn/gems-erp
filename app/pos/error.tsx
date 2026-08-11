'use client';

import { useEffect } from 'react';

export default function PosError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    if (error?.name === 'ChunkLoadError' || error?.message?.includes('Loading chunk')) {
      reset();
    }
  }, [error, reset]);

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <p className="text-gray-500 text-sm mb-4">Failed to load POS. Check your connection and reload.</p>
        <button onClick={reset} className="px-4 py-2 bg-[#0D3B6E] text-white text-sm font-semibold rounded-lg hover:bg-[#1A5294]">
          Retry
        </button>
      </div>
    </div>
  );
}
