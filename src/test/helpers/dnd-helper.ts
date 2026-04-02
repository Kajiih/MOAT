/**
 * @file dnd-helper.ts
 * @description Helpers to simulate Pragmatic Drag and Drop events in JSDOM tests.
 * This allows testing the logic responsive to drops without a full browser environment.
 */

import { vi } from 'vitest';

interface FakeDragStartPayload {
  source: { element: Element; data: Record<string, unknown> };
}

interface FakeDropPayload {
  source: { element: Element; data: Record<string, unknown> };
  location: { current: { dropTargets: Array<{ element: Element; data: Record<string, unknown> }> } };
}

/**
 * Registry to hold the active monitoring callbacks.
 * Captured when `monitorForElements` is called in the component.
 */
export const activeDndMonitor = {
  onDragStart: null as ((payload: FakeDragStartPayload) => void) | null,
  onDrag: null as ((payload: FakeDragStartPayload) => void) | null,
  onDrop: null as ((payload: FakeDropPayload) => void) | null,
};

/**
 * Mocks the `@atlaskit/pragmatic-drag-and-drop/element/adapter` module
 * to capture standard monitoring callbacks.
 * 
 * Must be called at the top of the test file or in `beforeAll`.
 */
vi.mock('@atlaskit/pragmatic-drag-and-drop/element/adapter', () => ({
  draggable: () => () => {},
  dropTargetForElements: () => () => {},
  monitorForElements: (options: {
    onDragStart?: (payload: FakeDragStartPayload) => void;
    onDrag?: (payload: FakeDragStartPayload) => void;
    onDrop?: (payload: FakeDropPayload) => void;
  }) => {
    activeDndMonitor.onDragStart = options.onDragStart || null;
    activeDndMonitor.onDrag = options.onDrag || null;
    activeDndMonitor.onDrop = options.onDrop || null;

    return () => {
      activeDndMonitor.onDragStart = null;
      activeDndMonitor.onDrag = null;
      activeDndMonitor.onDrop = null;
    };
  },
}));

/**
 * Simulates an item drop event by calling the registered `onDrop` handler.
 * @param payload - The drop payload containing source and location.
 */
export function simulateElementDrop(payload: FakeDropPayload) {
  if (activeDndMonitor.onDrop) {
    activeDndMonitor.onDrop(payload);
  } else {
    throw new Error('No Pragmatic DnD monitor registered. Did you render the component that mounts the monitor?');
  }
}

/**
 * Simulates a drag start event.
 * @param payload - The drag start payload containing source.
 */
export function simulateElementDragStart(payload: FakeDragStartPayload) {
  if (activeDndMonitor.onDragStart) {
    activeDndMonitor.onDragStart(payload);
  } else {
    throw new Error('No Pragmatic DnD monitor registered.');
  }
}
