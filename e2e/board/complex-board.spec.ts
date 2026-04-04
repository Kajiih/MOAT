import { expect, test } from '../fixtures';

test.describe('Complex Board Screenshot Verification', () => {
  test.setTimeout(15_000); // Complex board might be slow to load images

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

  test('should import complex board and take screenshot', async ({ page, boardPage }, testInfo) => {
    await boardPage.goto();

    // Import the complex board fixture
    // Path relative to workspace root (assuming running from root)
    const fixturePath = 'e2e/fixtures/complex-board.json';
    
    await boardPage.importJson(fixturePath);

    // Verify items are visible in Tier A
    const card = boardPage.getTierRow('A').getByTestId(/^item-card-/).first();
    await expect(card).toBeVisible({ timeout: 15_000 });

    // Wait for all images to complete loading (or fail)
    await page.waitForFunction(() => {
      const images = [...document.querySelectorAll('img')];
      return images.every(img => img.complete);
    });

    // Track console errors
    let consoleErrorEncountered = false;
    page.on('console', async (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore expected network failures for problematic items in the fixture
        if (text.includes('Failed to load resource') || text.includes('proxy-image')) {
          console.log('Ignoring expected console error:', text);
          return;
        }
        consoleErrorEncountered = true;
        const args = await Promise.all(msg.args().map(arg => arg.jsonValue()));
        console.error('Console Error in Complex Board:', ...args);
      }
    });

    // Take Screenshot using Screenshot Engine (Camera Button)
    const downloadPromise = page.waitForEvent('download');
    await boardPage.cameraButton.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toContain('.png');

    // Save the screenshot for manual inspection before checking for console errors
    const savedPath = testInfo.outputPath('complex-board-export.png');
    await download.saveAs(savedPath);

    expect(consoleErrorEncountered).toBe(false);
  });
});
