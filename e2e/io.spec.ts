import fs from 'node:fs';

import { expect, test } from './fixtures';

test.describe('Import/Export/Share', () => {
  test.setTimeout(60_000);

  test.beforeEach(async ({ page }) => {
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
      tiers: [{ label: 'Imported', color: 'red', items: [] }],
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

  test('should trigger image save', async ({ page, boardPage }) => {
    await boardPage.goto();

    // 1. Setup interceptors for standard browser activity (ObjectURL and programmatic link clicks)
    await page.evaluate(() => {
      (window as any).__createdUrls = [];
      const originalCreateObjectURL = URL.createObjectURL;
      URL.createObjectURL = (obj) => {
        const url = originalCreateObjectURL(obj);
        const size = obj instanceof Blob ? obj.size : 0;
        (window as any).__createdUrls.push({ url, size });
        return url;
      };

      (window as any).__downloadClicks = [];
      document.addEventListener(
        'click',
        (e) => {
          const target = e.target as HTMLElement;
          if (target && target.tagName === 'A' && target.hasAttribute('download')) {
            (window as any).__downloadClicks.push({
              href: target.getAttribute('href'),
              download: target.getAttribute('download'),
            });
          }
        },
        true,
      );
    });

    // 2. Trigger screenshot
    await boardPage.cameraButton.click();

    // 3. Verify toast indicates completion (this is slower in CI so we use a generous timeout)
    await expect(page.getByText(/Screenshot saved/i)).toBeVisible({ timeout: 60_000 });

    // 4. Verify that either an ObjectURL was created OR a link with download attr was clicked
    const activity = await page.evaluate(() => ({
      urls: (window as any).__createdUrls,
      clicks: (window as any).__downloadClicks,
    }));

    const hasActivity = activity.urls.length > 0 || activity.clicks.length > 0;
    expect(hasActivity).toBe(true); // Ensure at least one mechanism was triggered
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
