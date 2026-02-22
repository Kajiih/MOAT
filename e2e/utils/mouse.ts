import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Standardized mouse-based drag and drop for dnd-kit.
 * Useful for cross-container drags where keyboard reordering is not applicable.
 * @param page - The Playwright Page object.
 * @param source - The locator for the element to drag.
 * @param target - The locator for the target drop zone.
 */
export async function manualDragAndDrop(page: Page, source: Locator, target: Locator) {
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();

  if (!sourceBox || !targetBox) {
    throw new Error('Could not find bounding boxes for manual drag and drop');
  }

  // 1. Move to source center
  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
  await page.mouse.down();
  
  // 3. Initial small move to trigger drag start
  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2 + 15, { steps: 5 });
  
  // Wait for dnd-kit sensor activation: Verify the source element has become a dashed placeholder
  await expect(source.first()).toHaveClass(/border-dashed/, { timeout: 2000 });
  
  // 4. Move to target center
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, {
    steps: 30,
  });
  
  // 5. Small wiggle to confirm collision detection
  await page.mouse.move(targetBox.x + targetBox.width / 2 + 5, targetBox.y + targetBox.height / 2 + 5, { steps: 5 });
  
  // 6. Release
  await page.mouse.up();
  
  // No settle time needed here, the caller should verify the outcome via expect
}
