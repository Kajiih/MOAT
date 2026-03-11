import { type Locator, type Page } from '@playwright/test';

/**
 * Standardized native HTML5 drag and drop for pragmatic-drag-and-drop (PrDnd).
 * PrDnd relies on the native browser drag event lifecycle and strict DataTransfer payloads.
 * Playwright's `locator.dragTo()` works sometimes but can be flaky if the DataTransfer
 * isn't perfectly populated or if dragenter/dragover bounds are strict.
 *
 * @param page - The Playwright Page object.
 * @param source - The locator for the element to drag.
 * @param target - The locator for the target drop zone.
 */
export async function nativeDragAndDrop(
  page: Page,
  source: Locator,
  target: Locator,
  options?: { targetPosition?: { x: number; y: number } }
) {
  // Ensure both elements are visible before attempting math
  // Ensure visibility
  await source.hover();

  await page.mouse.down();

  // Pragmatic Drag and Drop requires an explicit movement threshold to decouple from clicks
  await source.hover({ position: { x: 5, y: 5 } });
  await page.waitForTimeout(100);

  // Animate straight to target to give requestAnimationFrame hooks time to resolve DOM nodes
  await target.hover({ position: options?.targetPosition });
  await page.waitForTimeout(100);

  await page.mouse.up();

  // Wait for React to process the drop action and trigger Redux
  await page.waitForTimeout(100);
}
