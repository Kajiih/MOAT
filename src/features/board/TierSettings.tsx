/**
 * @file TierSettings.tsx
 * @description A settings popover for a tier row, allowing color selection and deletion.
 * @module TierSettings
 */

import { Settings, Trash2 } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

import { Popover } from '@/core/ui/Popover';
import { TIER_COLORS } from '@/core/utils/colors';

/**
 * Props for the TierSettings component.
 */
interface TierSettingsProps {
  /** The current color ID of the tier. */
  color: string;
  /** Callback fired when a new color is selected. */
  onUpdateColor: (colorId: string) => void;
  /** Callback fired to delete the tier. */
  onDelete: () => void;
  /** Whether the tier can be deleted in the current context. */
  canDelete: boolean;
  /** Whether the settings popover is currently open. */
  isOpen: boolean;
  /** Toggles the popover open/closed. */
  onToggle: () => void;
  /** Forces the popover to close. */
  onClose: () => void;
  /** Global dragging state. */
  isAnyDragging?: boolean;
}

/**
 * Renders a settings popover for a tier row, allowing color selection and deletion.
 * @param props - The props for the component.
 * @param props.color - The current color ID of the tier.
 * @param props.onUpdateColor - Callback fired when a new color is selected.
 * @param props.onDelete - Callback fired to delete the tier.
 * @param props.canDelete - Whether the tier can be deleted in the current context.
 * @param props.isOpen - Whether the settings popover is currently open.
 * @param props.onToggle - Toggles the popover open/closed.
 * @param props.onClose - Forces the popover to close.
 * @param props.isAnyDragging - Global dragging state.
 * @returns The rendered TierSettings component.
 */
export function TierSettings({
  color,
  onUpdateColor,
  onDelete,
  canDelete,
  isOpen,
  onToggle,
  onClose,
  isAnyDragging,
}: TierSettingsProps) {
  return (
    <Popover
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
        else onToggle();
      }}
      className="absolute right-1 bottom-1"
      contentClassName="bottom-0 right-0"
      trigger={
        <button
          className={twMerge(
            'flex rounded-md bg-black/20 p-1 text-black transition-opacity hover:bg-black/40',
            isAnyDragging
              ? 'pointer-events-none opacity-0'
              : 'opacity-0 group-hover/row:opacity-100',
            isOpen && 'bg-black/40 opacity-100',
          )}
          title="Tier Settings"
        >
          <Settings size={14} />
        </button>
      }
    >
      <div
        className="border-border bg-surface shadow-floating flex w-[280px] flex-col gap-3 rounded-lg border p-3"
        style={{ transform: 'translate(10px, 10px)' }}
      >
        <div className="border-border flex items-center justify-between border-b pb-2">
          <span className="text-secondary text-xs font-bold uppercase">Tier Settings</span>
          <button onClick={onClose} className="text-secondary hover:text-foreground">
            ✕
          </button>
        </div>

        {/* Colors */}
        <div>
          <div className="text-secondary mb-1 text-xs">Color</div>
          <div className="flex flex-wrap gap-1">
            {TIER_COLORS.map((c) => (
              <button
                key={c.id}
                title={c.label}
                data-testid="tier-color-dot"
                className={twMerge(
                  'h-6 w-6 rounded-full border border-transparent transition-transform hover:scale-110',
                  c.bg,
                  color === c.id && 'border-white ring-1 ring-white',
                )}
                onClick={() => onUpdateColor(c.id)}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1">
          {canDelete && (
            <button
              onClick={() => {
                if (confirm('Delete tier?')) onDelete();
              }}
              className="bg-destructive/30 text-destructive hover:bg-destructive/50 mt-1 flex items-center justify-center gap-2 rounded-md p-1 text-xs"
            >
              <Trash2 size={14} /> Delete Tier
            </button>
          )}
          <div className="text-caption text-muted mt-2 text-center">
            Tip: Drag the grip handle on the left to reorder
          </div>
        </div>
      </div>
    </Popover>
  );
}
