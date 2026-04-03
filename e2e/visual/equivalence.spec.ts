import path from 'node:path';

import { expect, test } from '../fixtures';

test.describe('Visual Equivalence - Legacy vs Modern Import', () => {
  const legacyFixturePath = path.join(__dirname, 'fixtures', 'legacy-equivalent.json');
  const modernFixturePath = path.join(__dirname, 'fixtures', 'modern-equivalent.json');

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Wait for hydration
    await expect(page.getByLabel('Tier List Title')).toBeVisible();
    await expect(page.getByTestId('tier-row-label')).toHaveCount(6);

    // Mock search API to keep UI stable
    await page.route('**/api/search*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [],
          pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
        }),
      });
    });

    // Wait for skeletons to disappear
    await expect(page.getByTestId('skeleton-card')).toHaveCount(0, { timeout: 15_000 });
  });

  test('establish modern baseline', async ({ page, boardPage }) => {
    await boardPage.importJson(modernFixturePath);
    
    await page.evaluate(() => document.fonts.ready);
    
    // Check if title changed to verify import worked
    await expect(boardPage.titleInput).toHaveValue('Equivalence Test Board');
    
    const itemCard = boardPage.getItemCard('musicbrainz:album:6ab3e5c0-0852-4879-91f2-f1d7bbd37139');
    await expect(itemCard).toBeVisible();
    
    await expect(page).toHaveScreenshot('equivalence-test.png', {
      fullPage: true,
      mask: [boardPage.cameraButton, boardPage.dashboardButton],
      maxDiffPixelRatio: 0.05,
    });
  });

  test('legacy import matches modern baseline visually', async ({ page, boardPage }) => {
    const errorPromise = new Promise<never>((_, reject) => {
      page.on('console', msg => {
        if (msg.type() === 'error' && msg.text().includes('Failed to import JSON file')) {
          reject(new Error(`Import failed: ${msg.text()}`));
        }
      });
    });

    await boardPage.importJson(legacyFixturePath);

    // Race success vs failure
    await Promise.race([
      (async () => await expect(boardPage.titleInput).toHaveValue('Equivalence Test Board'))(),
      errorPromise,
    ]);

    const itemCard = boardPage.getItemCard('musicbrainz:album:6ab3e5c0-0852-4879-91f2-f1d7bbd37139');
    await expect(itemCard).toBeVisible();

    await expect(page).toHaveScreenshot('equivalence-test.png', {
      fullPage: true,
      mask: [boardPage.cameraButton, boardPage.dashboardButton],
      maxDiffPixelRatio: 0.05,
    });
  });

  test('legacy import with imageUrl renders correctly', async ({ page, boardPage }) => {
    const legacyImageUrlPath = path.join(__dirname, 'fixtures', 'legacy-imageurl.json');
    
    await boardPage.importJson(legacyImageUrlPath);

    await expect(boardPage.titleInput).toHaveValue('SA');

    const itemCard = page.getByTestId('item-card-search-ad520805-a825-48d8-ac06-d3cd0096a16c');
    await expect(itemCard).toBeVisible();
    
    // We can also screenshot check if we want, but visibility is a good start!
    await expect(page).toHaveScreenshot('legacy-imageurl-test.png', {
      fullPage: true,
      mask: [boardPage.cameraButton, boardPage.dashboardButton],
      maxDiffPixelRatio: 0.05,
    });
  });
});
