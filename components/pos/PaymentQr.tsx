'use client';
import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

export default function PaymentQr({ value, size = 220 }: { value: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;
    QRCode.toCanvas(canvasRef.current, value, { width: size, margin: 2 }).catch(() => {});
  }, [value, size]);

  return <canvas ref={canvasRef} className="rounded-lg border border-gray-100" aria-label="Payment QR code" />;
}
