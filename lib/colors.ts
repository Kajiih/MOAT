export interface ColorOption {
  bg: string;
  text: string;
}

export const TIER_COLORS: ColorOption[] = [
  { bg: 'bg-red-500', text: 'text-red-500' },
  { bg: 'bg-orange-500', text: 'text-orange-500' },
  { bg: 'bg-amber-400', text: 'text-amber-400' },
  { bg: 'bg-yellow-300', text: 'text-yellow-300' },
  { bg: 'bg-lime-400', text: 'text-lime-400' },
  { bg: 'bg-green-500', text: 'text-green-500' },
  { bg: 'bg-teal-400', text: 'text-teal-400' },
  { bg: 'bg-cyan-400', text: 'text-cyan-400' },
  { bg: 'bg-blue-500', text: 'text-blue-400' },
  { bg: 'bg-indigo-500', text: 'text-indigo-400' },
  { bg: 'bg-purple-500', text: 'text-purple-400' },
  { bg: 'bg-pink-500', text: 'text-pink-400' },
  { bg: 'bg-rose-500', text: 'text-rose-500' },
  { bg: 'bg-neutral-500', text: 'text-neutral-400' },
  { bg: 'bg-slate-700', text: 'text-slate-400' },
];

export const getTextColor = (bgClass: string): string => {
  const color = TIER_COLORS.find(c => c.bg === bgClass);
  return color ? color.text : bgClass.replace('bg-', 'text-');
};
