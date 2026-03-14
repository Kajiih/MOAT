/**
 * @file FilterButton.tsx
 * @description A reusable button component for toggling filters in search.
 */

interface FilterButtonProps {
  /** The text label to display on the button. */
  label: string;
  /** Whether the filter is currently active. */
  isSelected: boolean;
  /** Callback function when the button is clicked. */
  onClick: () => void;
  /** Visual style variant. */
  variant: 'primary' | 'secondary';
}

/**
 * Renders a stylized filter toggle button.
 * @param props - Component props.
 * @param props.label - The text label to display on the button.
 * @param props.isSelected - Whether the filter is currently active.
 * @param props.onClick - Callback function when the button is clicked.
 * @param props.variant - Visual style variant.
 * @returns The rendered FilterButton component.
 */
export function FilterButton({ label, isSelected, onClick, variant }: FilterButtonProps) {
  const activeClass =
    variant === 'primary'
      ? 'bg-destructive border-destructive text-white font-medium'
      : 'bg-primary border-primary text-white font-medium';

  const inactiveClass =
    variant === 'primary'
      ? 'bg-black border-border text-secondary hover:border-muted'
      : 'bg-surface border-border text-secondary hover:border-muted hover:text-foreground';

  return (
    <button
      onClick={onClick}
      className={`rounded-md border px-2 py-1 text-caption transition-all ${
        isSelected ? activeClass : inactiveClass
      }`}
    >
      {label}
    </button>
  );
}
