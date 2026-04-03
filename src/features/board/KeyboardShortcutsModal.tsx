/**
 * @file KeyboardShortcutsModal.tsx
 * @description A modal displaying the available keyboard shortcuts for the application.
 * @module KeyboardShortcutsModal
 */

import { Command, Keyboard, X } from 'lucide-react';

import { useEscapeKey } from '@/core/ui/useEscapeKey';

/**
 * Props for the KeyboardShortcutsModal component.
 */
interface KeyboardShortcutsModalProps {
  /** Whether the modal is currently open. */
  isOpen: boolean;
  /** Callback fired when the modal should be closed. */
  onClose: () => void;
}

/**
 * Renders an informational modal listing the application's global keyboard shortcuts.
 * @param props - The props for the component.
 * @param props.isOpen - Whether the modal is currently open.
 * @param props.onClose - Callback fired when the modal should be closed.
 * @returns The rendered KeyboardShortcutsModal component, or null if it's not open.
 */
export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  useEscapeKey(onClose, isOpen);

  if (!isOpen) return null;

  const shortcuts = [
    { label: 'Undo Action', keys: ['Ctrl/Cmd', 'Z'] },
    { label: 'Redo Action', keys: ['Ctrl/Cmd', 'Shift', 'Z'] },
    { label: 'Remove Item', keys: ['Hover', 'X'] },
    { label: 'View Details', keys: ['Hover', 'i'] },
    { label: 'Export Preview', keys: ['Shift', 'P'] },
    { label: 'Debug Panel', keys: ['Shift', 'D'] },
    { label: 'Toggle Shortcuts', keys: ['?'] },
  ];

  return (
    <div
      className="animate-in fade-in duration-fast fixed inset-0 z-modal flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-in zoom-in-95 border-border bg-surface shadow-floating duration-fast w-full max-w-sm overflow-hidden rounded-lg border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-border bg-background flex items-center justify-between border-b p-4">
          <div className="text-foreground flex items-center gap-2 font-bold">
            <Keyboard size={20} className="text-secondary" />
            <span>Shortcuts</span>
          </div>
          <button
            onClick={onClose}
            className="text-secondary hover:text-foreground transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3 p-4">
          {shortcuts.map((s, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="text-secondary">{s.label}</span>
              <div className="flex gap-1">
                {s.keys.map((k, j) => (
                  <kbd
                    key={j}
                    className="border-border bg-surface-hover text-secondary flex min-w-[24px] items-center justify-center rounded-md border px-2 py-1 text-center font-mono text-xs shadow-sm"
                  >
                    {k === 'Ctrl/Cmd' ? <Command size={10} className="mr-1" /> : null}
                    {k === 'Ctrl/Cmd' ? 'Cmd' : k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="border-border bg-background text-secondary border-t p-4 text-center text-xs">
          Press <kbd className="text-secondary font-mono">Esc</kbd> to close
        </div>
      </div>
    </div>
  );
}
