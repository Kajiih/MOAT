import { expect, test } from '../fixtures';
import * as fs from 'fs';
import * as path from 'path';

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

  test('should verify screenshot visual parity with mocking', async ({ page, boardPage }, testInfo) => {
    await boardPage.goto();

    await page.getByTestId('search-panel').waitFor({ state: 'visible' });

    // Generate Board JSON
    const board = {
      version: 2,
      createdAt: new Date().toISOString(),
      title: "Export Test Board",
      tiers: [
        {
          label: "S",
          color: "red",
          items: [
            {
              id: "rawg:game:1",
              identity: { providerId: "rawg", entityId: "game", providerItemId: "1" },
              title: "Test Game 1",
              images: [{ type: "url", url: "https://placehold.co/100x100.png" }]
            }
          ]
        },
        {
          label: "A",
          color: "orange",
          items: [
            {
              id: "musicbrainz:album:2",
              identity: { providerId: "musicbrainz", entityId: "album", providerItemId: "2" },
              title: "Test Album 2",
              images: [{ type: "url", url: "https://placehold.co/100x100.png" }]
            }
          ]
        }
      ],
      uncategorizedItems: []
    };

    // Write to temp file in test output directory
    const fixturePath = testInfo.outputPath('export-board.json');
    fs.mkdirSync(path.dirname(fixturePath), { recursive: true });
    fs.writeFileSync(fixturePath, JSON.stringify(board, null, 2));

    await boardPage.importJson(fixturePath);

    // Use POM encapsulated methods
    await boardPage.openScreenshotPreview();

    const exportSurface = boardPage.getScreenshotPreviewSurface();

    // Visual regression check
    await expect(exportSurface).toHaveScreenshot('export-preview.png', {
      maxDiffPixels: 100,
    });

    // Clean up temp file
    try {
      fs.unlinkSync(fixturePath);
    } catch (e) {
      console.warn('Failed to clean up temp file:', e);
    }
  });


});
