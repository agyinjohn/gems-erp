export const CATEGORY_GRADIENTS: Record<string, string> = {
  Electronics: 'from-sky-100 via-blue-50 to-indigo-50',
  Furniture: 'from-amber-100 via-orange-50 to-yellow-50',
  'Office Supplies': 'from-emerald-100 via-green-50 to-teal-50',
  'Tools & Equipment': 'from-orange-100 via-amber-50 to-red-50',
  Clothing: 'from-pink-100 via-rose-50 to-fuchsia-50',
  'Food & Beverage': 'from-lime-100 via-green-50 to-emerald-50',
};

export const CATEGORY_ICON_COLORS: Record<string, string> = {
  Electronics: 'text-sky-300',
  Furniture: 'text-amber-300',
  'Office Supplies': 'text-emerald-300',
  'Tools & Equipment': 'text-orange-300',
  Clothing: 'text-pink-300',
  'Food & Beverage': 'text-lime-300',
};

export function categoryGradient(name?: string) {
  return CATEGORY_GRADIENTS[name || ''] || 'from-slate-100 via-gray-50 to-zinc-50';
}

export function categoryIconColor(name?: string) {
  return CATEGORY_ICON_COLORS[name || ''] || 'text-slate-300';
}

export function formatGhs(amount: number) {
  return `GH₵ ${amount.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
