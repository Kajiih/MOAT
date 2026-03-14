import { type Locator, type Page } from '@playwright/test';

/**
 * Standardized native HTML5 drag and drop for pragmatic-drag-and-drop (PrDnd).
 * PrDnd relies on the native browser drag event lifecycle and strict DataTransfer payloads.
 * Playwright's `locator.dragTo()` works sometimes but can be flaky if the DataTransfer
 * isn't perfectly populated or if dragenter/dragover bounds are strict.
 * @param page - The Playwright Page object.
 * @param source - The locator for the element to drag.
 * @param target - The locator for the target drop zone.
 * @param options - Optional drag configuration.
 * @param options.targetPosition - Specific pixel coordinates to drop onto inside the target.
 * @param options.targetPosition.x - X coordinate relative to the target's bounding box.
 * @param options.targetPosition.y - Y coordinate relative to the target's bounding box.
 */
export async function nativeDragAndDrop(
  page: Page,
  source: Locator,
  target: Locator,
  options?: { targetPosition?: { x: number; y: number } },
) {
  // Pragmatic Drag and Drop requires an explicit movement heuristic to differentiate drags from clicks.
  // Instead of forced sleeps or manually fighting DOM synthetic event dispatchers, we use natural
  // Playwright mouse boundaries seamlessly.

  // Wait for the components to be fully mounted and visible
  await source.waitFor({ state: 'visible' });
  await target.waitFor({ state: 'visible' });

  // Playwright's locator.hover() natively manages element auto-scrolling
  // We avoid arbitrary waitForTimeout by structurally yielding execution flow inline
  // with browser frame rendering, exactly matching Pragmatic Drag and Drop's internal architecture.

  await source.hover();
  await page.mouse.down();

  // Pragmatic Drag and Drop requires a threshold movement distance to trigger drag start
  const DRAG_THRESHOLD_OFFSET = 5;
  await source.hover({ position: { x: DRAG_THRESHOLD_OFFSET, y: DRAG_THRESHOLD_OFFSET } });
  await page.evaluate(() => new Promise(requestAnimationFrame));

  // Animate directly to the target element's relative layout coordinates
  await target.hover({ position: options?.targetPosition });
  await page.evaluate(() => new Promise(requestAnimationFrame));

  await page.mouse.up();
  await page.evaluate(() => new Promise(requestAnimationFrame));
}
