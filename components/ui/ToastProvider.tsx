/**
 * @file ToastProvider.tsx
 * @description Global notification system for the application.
 * Uses the Context API to provide a `showToast` function to any component.
 * Features a stacked toast UI that expands on interaction and auto-dismisses.
 * @module ToastSystem
 */

'use client';

import { createContext, useContext, useCallback, ReactNode, useReducer } from 'react';
import { X, CheckCircle, AlertCircle, Info, ChevronDown } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastState {
  toasts: Toast[];
  isExpanded: boolean;
}

type ToastAction =
  | { type: 'ADD'; toast: Toast }
  | { type: 'REMOVE'; id: string }
  | { type: 'SET_EXPANDED'; isExpanded: boolean };

function toastReducer(state: ToastState, action: ToastAction): ToastState {
  switch (action.type) {
    case 'ADD':
      return {
        ...state,
        toasts: [...state.toasts, action.toast],
      };
    case 'REMOVE': {
      const nextToasts = state.toasts.filter((t) => t.id !== action.id);
      return {
        ...state,
        toasts: nextToasts,
        // Atomic update: Reset expanded state if list becomes empty
        isExpanded: nextToasts.length === 0 ? false : state.isExpanded,
      };
    }
    case 'SET_EXPANDED':
      return {
        ...state,
        isExpanded: action.isExpanded,
      };
    default:
      return state;
  }
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
  toastCount: number;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

/**
 * Custom hook to consume the Toast Context.
 * @returns The showToast function and current toast count.
 * @throws {Error} if used outside of a ToastProvider.
 */
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

/**
 * Provider component for the Global Toast system.
 * Renders the toast container and manages the lifecycle of notifications.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(toastReducer, {
    toasts: [],
    isExpanded: false,
  });

  const { toasts, isExpanded } = state;

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = crypto.randomUUID();
    const toast = { id, message, type };

    dispatch({ type: 'ADD', toast });

    // Auto-dismiss
    setTimeout(() => {
      dispatch({ type: 'REMOVE', id });
    }, 5000);
  }, []);

  const removeToast = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    dispatch({ type: 'REMOVE', id });
  };

  return (
    <ToastContext.Provider value={{ showToast, toastCount: toasts.length }}>
      {children}
      <div className="fixed bottom-4 right-8 z-[100] flex flex-col-reverse items-end gap-2 pointer-events-none">
        {/* Collapse Action */}
        {isExpanded && toasts.length > 1 && (
          <button
            onClick={() => dispatch({ type: 'SET_EXPANDED', isExpanded: false })}
            className="pointer-events-auto flex items-center gap-1 text-xs text-neutral-500 hover:text-white bg-neutral-900/80 px-2 py-1 rounded-full backdrop-blur-sm transition-colors mb-2"
          >
            Collapse <ChevronDown size={12} />
          </button>
        )}

        {isExpanded
          ? /* Expanded List */
            toasts.map((toast) => (
              <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} stacked={false} />
            ))
          : /* Stacked View */
            toasts.length > 0 && (
              <div
                className="relative group cursor-pointer pointer-events-auto"
                onClick={() => dispatch({ type: 'SET_EXPANDED', isExpanded: true })}
              >
                {/* Badge */}
                {toasts.length > 1 && (
                  <div className="absolute -top-2 -left-2 z-50 bg-blue-600 text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center shadow-md ring-2 ring-neutral-950">
                    {toasts.length}
                  </div>
                )}

                {/* Render last 3 items for stack effect */}
                {toasts.slice(-3).map((toast, index, array) => {
                  const isTop = index === array.length - 1;
                  const reverseIndex = array.length - 1 - index; // 0 = top, 1 = middle, 2 = bottom

                  return (
                    <div
                      key={toast.id}
                      style={{
                        transform: `translateY(${reverseIndex * 8}px) scale(${1 - reverseIndex * 0.05})`,
                        zIndex: 30 - reverseIndex,
                        opacity: 1 - reverseIndex * 0.2,
                        position: isTop ? 'relative' : 'absolute',
                        bottom: 0,
                        right: 0,
                        width: '100%', // Ensure absolute ones take full width of relative parent
                      }}
                      className={`transition-all duration-300 origin-bottom ${!isTop ? 'pointer-events-none' : ''}`}
                    >
                      <ToastItem toast={toast} onDismiss={removeToast} stacked={true} />
                    </div>
                  );
                })}
              </div>
            )}
      </div>
    </ToastContext.Provider>
  );
}

/**
 * Renders an individual toast message with appropriate icons and colors.
 */
function ToastItem({
  toast,
  onDismiss,
  stacked,
}: {
  toast: Toast;
  onDismiss: (id: string, e: React.MouseEvent) => void;
  stacked: boolean;
}) {
  return (
    <div
      className={`
              pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl border w-max max-w-[320px]
              ${toast.type === 'success' ? 'bg-neutral-900 border-green-900/50 text-green-400' : ''}
              ${toast.type === 'error' ? 'bg-neutral-900 border-red-900/50 text-red-400' : ''}
              ${toast.type === 'info' ? 'bg-neutral-900 border-blue-900/50 text-blue-400' : ''}
              ${stacked ? 'hover:bg-neutral-800' : 'animate-in slide-in-from-right-full duration-300'}
            `}
    >
      {toast.type === 'success' && <CheckCircle size={18} />}
      {toast.type === 'error' && <AlertCircle size={18} />}
      {toast.type === 'info' && <Info size={18} />}

      <span className="text-sm font-medium text-neutral-200 truncate max-w-[200px]">
        {toast.message}
      </span>

      {/* Close button - hidden in stack unless top? Or always visible but propagates click to expand? */}
      {/* If stacked, we prefer clicking to expand. If expanded, we click to dismiss. */}
      {!stacked && (
        <button
          onClick={(e) => onDismiss(toast.id, e)}
          className="ml-2 hover:text-white transition-colors p-1 hover:bg-white/10 rounded"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
