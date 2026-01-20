/**
 * @file ToastProvider.tsx
 * @description Global notification system for the application.
 * Uses the Context API to provide a `showToast` function to any component.
 * Features a stacked toast UI that expands on interaction and auto-dismisses.
 * @module ToastSystem
 */

'use client';

import { AlertCircle, CheckCircle, ChevronDown, Info, X } from 'lucide-react';
import { createContext, ReactNode, useCallback, useContext, useReducer } from 'react';

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
    case 'ADD': {
      return {
        ...state,
        toasts: [...state.toasts, action.toast],
      };
    }
    case 'REMOVE': {
      const nextToasts = state.toasts.filter((t) => t.id !== action.id);
      return {
        ...state,
        toasts: nextToasts,
        // Atomic update: Reset expanded state if list becomes empty
        isExpanded: nextToasts.length === 0 ? false : state.isExpanded,
      };
    }
    case 'SET_EXPANDED': {
      return {
        ...state,
        isExpanded: action.isExpanded,
      };
    }
    default: {
      return state;
    }
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
 * @param props - The props for the component.
 * @param props.children - The child components.
 * @returns The rendered ToastProvider component.
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
      <div className="pointer-events-none fixed right-8 bottom-4 z-[100] flex flex-col-reverse items-end gap-2">
        {/* Collapse Action */}
        {isExpanded && toasts.length > 1 && (
          <button
            onClick={() => dispatch({ type: 'SET_EXPANDED', isExpanded: false })}
            className="pointer-events-auto mb-2 flex items-center gap-1 rounded-full bg-neutral-900/80 px-2 py-1 text-xs text-neutral-500 backdrop-blur-sm transition-colors hover:text-white"
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
                className="group pointer-events-auto relative cursor-pointer"
                onClick={() => dispatch({ type: 'SET_EXPANDED', isExpanded: true })}
              >
                {/* Badge */}
                {toasts.length > 1 && (
                  <div className="absolute -top-2 -left-2 z-50 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white shadow-md ring-2 ring-neutral-950">
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
                      className={`origin-bottom transition-all duration-300 ${!isTop ? 'pointer-events-none' : ''}`}
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
 * @param props - The props for the component.
 * @param props.toast - The toast object to render.
 * @param props.onDismiss - Callback to dismiss the toast.
 * @param props.stacked - Whether the toast is in a stacked view.
 * @returns The rendered ToastItem component.
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
  const typeStyles: Record<ToastType, string> = {
    success: 'border-green-900/50 bg-neutral-900 text-green-400',
    error: 'border-red-900/50 bg-neutral-900 text-red-400',
    info: 'border-blue-900/50 bg-neutral-900 text-blue-400',
  };

  const baseStyles = 'pointer-events-auto flex w-max max-w-[320px] items-center gap-3 rounded-lg border px-4 py-3 shadow-xl';
  const stackStyles = stacked ? 'hover:bg-neutral-800' : 'animate-in slide-in-from-right-full duration-300';

  return (
    <div className={`${baseStyles} ${typeStyles[toast.type]} ${stackStyles}`}>
      {toast.type === 'success' && <CheckCircle size={18} />}
      {toast.type === 'error' && <AlertCircle size={18} />}
      {toast.type === 'info' && <Info size={18} />}

      <span className="max-w-[200px] truncate text-sm font-medium text-neutral-200">
        {toast.message}
      </span>

      {/* Close button - hidden in stack unless top? Or always visible but propagates click to expand? */}
      {/* If stacked, we prefer clicking to expand. If expanded, we click to dismiss. */}
      {!stacked && (
        <button
          onClick={(e) => onDismiss(toast.id, e)}
          className="ml-2 rounded p-1 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
