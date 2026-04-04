import { expect, test } from '../fixtures';
import * as fs from 'fs';
import * as path from 'path';
import { TestBoardBuilder, TestItemBuilder } from '../utils/board-builder';

test.describe('Asset Scenarios Verification', () => {
  test.setTimeout(15_000);

  test.beforeEach(async ({ page }) => {
    // Intercept image proxy calls
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
        // Default fallback for other potential images via proxy
        await route.fulfill({ status: 404 });
      }
    });
  });

  test('should load asset scenarios and verify rendering', async ({ page, boardPage }, testInfo) => {
    // Generate Board JSON using builder
    const board = new TestBoardBuilder()
      .withTitle("Asset Scenarios Test Board")
      .addTier("Scenarios", "blue", [
        TestItemBuilder.create("musicbrainz", "album", "2c55f39d-9cb3-401c-b218-2fc600d26ec5")
          .withTitle("Success Album")
          .withReferenceImage("2c55f39d-9cb3-401c-b218-2fc600d26ec5"),
        TestItemBuilder.create("musicbrainz", "album", "00000000-0000-0000-0000-000000000000")
          .withTitle("NotFound Album")
          .withReferenceImage("00000000-0000-0000-0000-000000000000"),
        TestItemBuilder.create("musicbrainz", "artist", "076caf66-1bb1-4486-8f46-910c83441eab")
          .withTitle("Fallback Artist")
          .withReferenceImage("076caf66-1bb1-4486-8f46-910c83441eab")
      ])
      .build();

    // Write to temp file in test output directory
    const fixturePath = testInfo.outputPath('asset-scenarios.json');
    fs.mkdirSync(path.dirname(fixturePath), { recursive: true });
    fs.writeFileSync(fixturePath, JSON.stringify(board, null, 2));

    await boardPage.goto();
    await boardPage.importJson(fixturePath);

    // Verify Success Album has an image
    const successItem = page.locator('[data-testid^="item-card-musicbrainz:album:2c55f39d-9cb3-401c-b218-2fc600d26ec5"]');
    await expect(successItem).toBeVisible();
    await expect(successItem.locator('img')).toBeVisible({ timeout: 15_000 });

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

    // Clean up temp file
    try {
      fs.unlinkSync(fixturePath);
    } catch (e) {
      console.warn('Failed to clean up temp file:', e);
    }
  });
});
