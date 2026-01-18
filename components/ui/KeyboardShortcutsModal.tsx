/**
 * @file KeyboardShortcutsModal.tsx
 * @description A modal displaying the available keyboard shortcuts for the application.
 * @module KeyboardShortcutsModal
 */

import { Command,Keyboard, X } from 'lucide-react';

import { useEscapeKey } from '@/lib/hooks/useEscapeKey';

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
 */
export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  useEscapeKey(onClose, isOpen);

  if (!isOpen) return null;

  const shortcuts = [
    { label: 'Undo Action', keys: ['Ctrl/Cmd', 'Z'] },
    { label: 'Redo Action', keys: ['Ctrl/Cmd', 'Shift', 'Z'] },
    { label: 'Select Item', keys: ['Click'] },
    { label: 'Move Item', keys: ['Drag'] },
    { label: 'Remove Item', keys: ['Hover', 'X'] },
    { label: 'View Details', keys: ['Hover', 'i'] },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-neutral-800 bg-neutral-900/50">
          <div className="flex items-center gap-2 text-neutral-200 font-bold">
            <Keyboard size={20} className="text-neutral-400" />
            <span>Shortcuts</span>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {shortcuts.map((s, i) => (
            <div key={i} className="flex justify-between items-center text-sm">
              <span className="text-neutral-400">{s.label}</span>
              <div className="flex gap-1">
                {s.keys.map((k, j) => (
                  <kbd
                    key={j}
                    className="px-2 py-1 bg-neutral-800 rounded-md font-mono text-xs text-neutral-300 shadow-sm border border-neutral-700 min-w-[24px] text-center flex items-center justify-center"
                  >
                    {k === 'Ctrl/Cmd' ? <Command size={10} className="mr-1" /> : null}
                    {k === 'Ctrl/Cmd' ? 'Cmd' : k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 bg-neutral-900/50 border-t border-neutral-800 text-xs text-neutral-500 text-center">
          Press <kbd className="font-mono text-neutral-400">Esc</kbd> to close
        </div>
      </div>
    </div>
  );
}
