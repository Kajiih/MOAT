/**
 * @file utils.tsx
 * @description Shared testing utilities and custom render functions.
 * Integrates standard providers (Redux, Toast, Router mocks) to reduce test boilerplate.
 */

import { render as rtlRender, RenderOptions as RTLRenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';

import { ToastProvider } from '@/core/ui/ToastProvider';
import { TierListProvider } from '@/features/board/context';

interface CustomRenderOptions extends Omit<RTLRenderOptions, 'wrapper'> {
  /**
   * If provided, wraps the component in a TierListProvider with this board ID.
   */
  boardId?: string;
  /**
   * If true, wraps the component in a ToastProvider. Defaults to true.
   */
  withToast?: boolean;
}

/**
 * Custom render function that wraps the UI in standard providers.
 * @param ui - The UI component to render.
 * @param options - Custom render options.
 * @returns The render results from React Testing Library.
 * @example
 * // Render with default ToastProvider
 * renderWithProviders(<MyComponent />);
 * @example
 * // Render with Board context
 * renderWithProviders(<MyComponent />, { boardId: 'test-board' });
 */
function renderWithProviders(ui: ReactElement, options: CustomRenderOptions = {}) {
  const { boardId, withToast = true, ...renderOptions } = options;
  let content = ui;

  if (boardId) {
    content = <TierListProvider boardId={boardId}>{content}</TierListProvider>;
  }

  if (withToast) {
    content = <ToastProvider>{content}</ToastProvider>;
  }

  return rtlRender(content, renderOptions);
}

export * from '@testing-library/react';
export { renderWithProviders };
