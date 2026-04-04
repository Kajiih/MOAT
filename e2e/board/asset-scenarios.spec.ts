import { expect, test } from '../fixtures';

test.describe('Asset Scenarios Verification', () => {
  test.setTimeout(15_000);

  test.beforeEach(async ({ page }) => {
    // Intercept image proxy with specific behavior per key
    await page.route('**/api/proxy-image**', async (route) => {
      const url = route.request().url();
      
      if (url.includes('2c55f39d-9cb3-401c-b218-2fc600d26ec5')) {
        // Success Album
        await route.fulfill({
          status: 200,
          contentType: 'image/png',
          body: Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            'base64'
          ),
        });
      } else if (url.includes('00000000-0000-0000-0000-000000000000')) {
        // NotFound
        await route.fulfill({ status: 404 });
      } else if (url.includes('076caf66-1bb1-4486-8f46-910c83441eab')) {
        // Fallback Artist
        await route.fulfill({
          status: 200,
          contentType: 'image/png',
          body: Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            'base64'
          ),
        });
      } else {
        // Default fallback for other potential images
        await route.fulfill({ status: 404 });
      }
    });
  });

  test('should load asset scenarios and verify rendering', async ({ page, boardPage }) => {
    await boardPage.goto();

    const fixturePath = 'e2e/fixtures/asset-scenarios.json';
    await boardPage.importJson(fixturePath);

    // Verify Success Album has an image
    const successItem = page.locator('[data-testid^="item-card-musicbrainz:album:2c55f39d-9cb3-401c-b218-2fc600d26ec5"]');
    await expect(successItem).toBeVisible();
    await expect(successItem.locator('img')).toBeVisible();

    // Verify NotFound Album does NOT have an image, or shows fallback text
    const notFoundItem = page.locator('[data-testid^="item-card-musicbrainz:album:00000000-0000-0000-0000-000000000000"]');
    await expect(notFoundItem).toBeVisible();
    await expect(notFoundItem.locator('img')).not.toBeVisible();
    await expect(notFoundItem).toContainText('NotFound Album');

    // Take screenshot to verify visually
    const downloadPromise = page.waitForEvent('download');
    await boardPage.cameraButton.click();
    const download = await downloadPromise;

    const savedPath = 'test-results/asset-scenarios-export.png';
    await download.saveAs(savedPath);
    console.log(`Screenshot saved to: ${savedPath}`);
  });
});
