interface Props { value: number; total: number; size?: number }

/** Share of the day's work done, as a ring with the count in the middle. */
export default function ProgressRing({ value, total, size = 88 }: Props) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = total ? value / total : 0;
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-white/15" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
          className="text-white transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
        <span className="text-xl font-extrabold leading-none">{Math.round(pct * 100)}%</span>
        <span className="text-[10px] text-white/60 mt-1">{value}/{total} done</span>
      </div>
    </div>
  );
}
