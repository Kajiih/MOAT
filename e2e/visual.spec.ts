import fs from 'node:fs';

import { expect, test } from './fixtures';

test.describe('Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for hydration
    await expect(page.getByLabel('Tier List Title')).toBeVisible();
    await expect(page.getByTestId('tier-row-label')).toHaveCount(6);
  });

  test('default board snapshot', async ({ page }) => {
    // Take snapshot of the entire page
    await expect(page).toHaveScreenshot('default-board.png', {
      fullPage: true,
      mask: [page.locator('.lucide-camera')], // Mask dynamic elements if any (camera icon itself is stable though)
    });
  });

  test('search panel snapshot', async ({ page }) => {
    // Open search panel by ensuring it's visible (it is persistent on desktop)
    await expect(page.getByPlaceholder('Search songs...')).toBeVisible();

    // Snapshot of the search panel only
    const searchPanel = page.locator('.sticky'); // The search panel container
    await expect(searchPanel).toHaveScreenshot('search-panel-empty.png');
  });

  test('populated board snapshot', async ({ page }, testInfo) => {
    // Prepare a dummy JSON file to populate board
    const importData = {
      version: 1,
      title: 'Visual Test Board',
      tiers: [
        { id: '1', label: 'Visual S', color: 'red', items: [] },
        { id: '2', label: 'Visual A', color: 'blue', items: [] },
      ],
      items: {},
    };

    // Create temporary file using Playwright's testInfo.outputPath()
    const filePath = testInfo.outputPath('visual_import.json');
    fs.writeFileSync(filePath, JSON.stringify(importData));

    // Import
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByTitle('Board Options').click();
    await page.getByText('Import JSON', { exact: true }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(filePath);

    // Wait for the specific goal post (Visual S appearing)
    await expect(page.getByText('Visual S')).toBeVisible();

    // Ensure icons and layout are ready
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('.lucide-camera')).toBeVisible();
    
    // Final settling poll to ensure no layout shift is in progress
    await expect.poll(async () => {
      const box = await page.getByText('Visual S').boundingBox();
      return box?.y;
    }, { timeout: 2000 }).toBeGreaterThan(0);

    // Snapshot
    await expect(page).toHaveScreenshot('populated-board.png', {
      fullPage: true,
      mask: [
        page.getByTitle('Save as Image'),
        page.getByTitle('Back to Dashboard'),
      ],
    });

    // Cleanup
    fs.unlinkSync(filePath);
  });
});
