'use client';
import { useEffect, useState } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

interface Props {
  businessName?: string;
  tenantSlug: string;
}

export default function InstallPrompt({ businessName, tenantSlug }: Props) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [show, setShow] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [installed, setInstalled] = useState(false);

  const dismissKey = `gems_pwa_dismissed_${tenantSlug}`;

  useEffect(() => {
    // Already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
      return;
    }
    // Already dismissed recently (7 days)
    const dismissed = localStorage.getItem(dismissKey);
    if (dismissed && Date.now() - parseInt(dismissed) < 7 * 24 * 60 * 60 * 1000) return;

    // iOS detection — no beforeinstallprompt, show manual instructions
    const ua = navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua) && !(window as any).MSStream;
    if (ios) {
      setIsIos(true);
      setTimeout(() => setShow(true), 3000);
      return;
    }

    // Android / Chrome — capture beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => setShow(true), 3000);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => { setShow(false); setInstalled(true); });
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [dismissKey]);

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setShow(false);
    setDeferredPrompt(null);
  };

  const dismiss = () => {
    setShow(false);
    localStorage.setItem(dismissKey, String(Date.now()));
  };

  if (!show || installed) return null;

  const name = businessName ? `${businessName} Store` : 'GEMS Store';

  return (
    <div className="fixed bottom-20 lg:bottom-6 left-4 right-4 z-50 max-w-sm mx-auto animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-[#0D3B6E] to-[#1A5294] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5 text-gray-900" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-tight">{name}</p>
              <p className="text-white/60 text-[10px]">Install app</p>
            </div>
          </div>
          <button onClick={dismiss} className="text-white/50 hover:text-white p-1 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 py-3">
          {isIos ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-700 font-medium">Add to your Home Screen</p>
              <ol className="text-xs text-gray-500 space-y-1.5 list-none">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#0D3B6E] text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                  Tap the <strong className="text-gray-700">Share</strong> button in Safari
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#0D3B6E] text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                  Scroll down and tap <strong className="text-gray-700">Add to Home Screen</strong>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#0D3B6E] text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                  Tap <strong className="text-gray-700">Add</strong> to confirm
                </li>
              </ol>
              <button onClick={dismiss} className="w-full mt-1 text-xs text-gray-400 hover:text-gray-600 py-1">
                Maybe later
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Install this store on your device for a faster, app-like experience — works offline too.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={install}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#0D3B6E] hover:bg-[#1A5294] text-white text-sm font-bold py-2.5 rounded-xl transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Install
                </button>
                <button
                  onClick={dismiss}
                  className="px-4 border border-gray-200 text-gray-500 hover:bg-gray-50 text-sm font-medium rounded-xl transition-colors"
                >
                  Not now
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
