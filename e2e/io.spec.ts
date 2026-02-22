import fs from 'node:fs';

import { expect, test } from './fixtures';
import { clearBrowserStorage } from './utils/storage';

test.describe('Import/Export/Share', () => {
  test.setTimeout(60_000);

  test.beforeEach(async ({ page }) => {
    await clearBrowserStorage(page);
    // Mock clipboard for headless browsers
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: async () => {},
        },
      });
    });
  });

  test('should import and export a tier list', async ({ boardPage }, testInfo) => {
    await boardPage.goto();

    const importData = {
      version: 1,
      title: 'IO Test Board',
      tiers: [
        { label: 'Imported', color: 'red', items: [] },
      ],
      items: {},
    };

    const filePath = testInfo.outputPath('io_test.json');
    fs.writeFileSync(filePath, JSON.stringify(importData));

    // 1. Import
    await boardPage.importJson(filePath);

    await expect(boardPage.tierLabels.filter({ hasText: 'Imported' })).toBeVisible();
    await expect(boardPage.titleInput).toHaveValue('IO Test Board');

    // 2. Export
    const download = await boardPage.exportJson();

    expect(download.suggestedFilename()).toContain('.json');
    
    // Cleanup
    fs.unlinkSync(filePath);
  });

  test('should trigger image save', async ({ page, boardPage, browserName }) => {
    await boardPage.goto();

    // TODO: Firefox has issues with programmatic downloads in headless mode
    test.skip(browserName === 'firefox', 'Flaky in Firefox headless');
    
    // Save as Image usually takes a screenshot and triggers a download
    const downloadPromise = page.waitForEvent('download');
    await boardPage.cameraButton.click();
    const download = await downloadPromise;
    
    expect(download.suggestedFilename()).toContain('.png');
  });

  test('should copy sharing link', async ({ page, boardPage }) => {
    await boardPage.goto();

    // 1. Mock the publish API
    await page.route('**/api/share/publish', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'test-share-id' }),
      });
    });

    // 2. Click Share
    await boardPage.shareButton.click();
    
    // 3. Wait for Share Modal
    await expect(page.getByText('Board Published')).toBeVisible();
    
    // 4. Click Copy
    await page.getByRole('button', { name: 'Copy' }).click();
    
    // 5. Verify Toast (Synchronous with click usually)
    await expect(page.getByText(/Link copied/i)).toBeVisible();
  });
});
