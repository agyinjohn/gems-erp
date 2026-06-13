import { Suspense } from 'react';
import StorefrontRedirect from './StorefrontRedirect';

export default function StorefrontPage() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh flex items-center justify-center bg-gray-50 text-sm text-gray-500">
        Opening store…
      </div>
    }>
      <StorefrontRedirect />
    </Suspense>
  );
}
