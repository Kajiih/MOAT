import fs from 'node:fs';

import { expect, test } from '@playwright/test';

import { BoardPage } from './pom/BoardPage';

test.describe('Import/Export/Share', () => {
  test.setTimeout(60000);
  let boardPage: BoardPage;

  test.beforeEach(async ({ page }) => {
    boardPage = new BoardPage(page);
    // Mock clipboard for headless browsers
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: async () => {},
        },
      });
    });
    await boardPage.goto();
  });

  test('should import and export a tier list', async ({ page }, testInfo) => {
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

  test('should trigger image save', async ({ page, browserName }) => {
    // FIXME: Firefox has issues with programmatic downloads in headless mode
    test.skip(browserName === 'firefox', 'Flaky in Firefox headless');
    
    // Save as Image usually takes a screenshot and triggers a download
    const downloadPromise = page.waitForEvent('download');
    await boardPage.cameraButton.click();
    const download = await downloadPromise;
    
    expect(download.suggestedFilename()).toContain('.png');
  });

  test('should copy sharing link', async ({ page }) => {
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
    await page.getByRole('button', { name: 'Copy' }).click({ force: true });
    
    // 5. Verify Toast (Synchronous with click usually)
    await expect(page.getByText(/Link copied/i)).toBeVisible();
  });
});
