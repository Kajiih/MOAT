import { expect, test } from './fixtures';

test.describe('Live Export / Screenshot (Mocked)', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept image proxy to return a stable 1x1 pixel PNG
    await page.route('**/api/proxy-image**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'image/png',
        body: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          'base64'
        ),
      });
    });
  });

  test('should verify screenshot visual parity with mocking', async ({ page, boardPage }) => {
    await boardPage.goto();

    await page.getByTestId('search-panel').waitFor({ state: 'visible' });

    const fixturePath = 'e2e/fixtures/complex-board.json';
    await boardPage.importJson(fixturePath);

    // Use POM encapsulated methods
    await boardPage.openScreenshotPreview();

    const exportSurface = boardPage.getScreenshotPreviewSurface();

    // Visual regression check
    await expect(exportSurface).toHaveScreenshot('export-preview.png', {
      maxDiffPixels: 100,
    });
  });


});
