'use client';

export type Interval = 'monthly' | 'annual';

/** Monthly / Annual switch shared by the home pricing section and /products. Annual is nine months for the price of twelve (25% off). */
export function IntervalToggle({ value, onChange }: { value: Interval; onChange: (next: Interval) => void }) {
  const item = (id: Interval, label: string, hint?: string) => (
    <button
      type="button"
      role="radio"
      aria-checked={value === id}
      onClick={() => onChange(id)}
      className={`min-h-10 rounded-full px-4 text-sm transition-colors ${
        value === id ? 'bg-[#E3836C] text-white' : 'text-[#5C534A] dark:text-[#C5B9AE] hover:text-[#C45A42]'
      }`}
    >
      {label}
      {hint && <span className="ml-1.5 text-[11px] opacity-90">{hint}</span>}
    </button>
  );
  return (
    <div role="radiogroup" aria-label="Billing period" className="inline-flex items-center gap-1 rounded-full border border-[#4A4238]/15 dark:border-[#504740] p-1">
      {item('monthly', 'Monthly')}
      {item('annual', 'Annual', 'Save 25%')}
    </div>
  );
}
