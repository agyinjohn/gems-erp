import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addDays, fromDay, localDay } from './shared';

interface Props { value: string; onChange: (day: string) => void }

/** Monday–Sunday of the selected week, with arrows to move a week at a time. */
export default function WeekStrip({ value, onChange }: Props) {
  const d = fromDay(value);
  const monday = addDays(value, -((d.getDay() + 6) % 7));
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const today = localDay();

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <button type="button" onClick={() => onChange(addDays(value, -7))} className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10" aria-label="Previous week">
        <ChevronLeft className="w-4 h-4" />
      </button>
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5 flex-1">
        {days.map(day => {
          const dt = fromDay(day);
          const selected = day === value;
          const isToday = day === today;
          return (
            <button
              key={day}
              type="button"
              onClick={() => onChange(day)}
              aria-pressed={selected}
              className={`flex flex-col items-center rounded-xl py-1.5 sm:py-2 transition-colors ${
                selected ? 'bg-white text-[#0D3B6E] shadow-sm' : 'text-white/80 hover:bg-white/10'
              }`}
            >
              <span className={`text-[10px] uppercase tracking-wide font-semibold ${selected ? 'text-[#0D3B6E]/60' : 'text-white/50'}`}>
                {dt.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 3)}
              </span>
              <span className="text-sm sm:text-base font-bold leading-tight">{dt.getDate()}</span>
              <span className={`w-1 h-1 rounded-full mt-0.5 ${isToday ? (selected ? 'bg-[#0D3B6E]' : 'bg-white') : 'bg-transparent'}`} />
            </button>
          );
        })}
      </div>
      <button type="button" onClick={() => onChange(addDays(value, 7))} className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10" aria-label="Next week">
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
