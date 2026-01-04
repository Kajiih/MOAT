interface FilterButtonProps {
  label: string;
  isSelected: boolean;
  onClick: () => void;
  variant: 'primary' | 'secondary';
}

export function FilterButton({ label, isSelected, onClick, variant }: FilterButtonProps) {
  const activeClass = variant === 'primary'
    ? 'bg-red-600 border-red-500 text-white font-medium'
    : 'bg-blue-600 border-blue-500 text-white font-medium';

  const inactiveClass = variant === 'primary'
    ? 'bg-black border-neutral-700 text-neutral-400 hover:border-neutral-500'
    : 'bg-neutral-900 border-neutral-700 text-neutral-500 hover:border-neutral-500 hover:text-neutral-300';

  return (
    <button
        onClick={onClick}
        className={`px-2 py-1 rounded text-[10px] border transition-all ${
            isSelected ? activeClass : inactiveClass
        }`}
    >
        {label}
    </button>
  );
}
