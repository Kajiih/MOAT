import { expect, test } from '../fixtures';

test.describe('Complex Board Screenshot Verification (Live)', () => {
  test.setTimeout(90_000); // Complex board might be slow to load images

  test('should import complex board and take screenshot', async ({ page, boardPage }, testInfo) => {
    test.skip(testInfo.project.name === 'firefox', 'Skipping due to known failure in hidden rendering on Firefox. Fix later.');
    test.skip(!!process.env.CI, 'Skipping live test on CI to avoid external dependency flakiness');
    
    // Bypass hotlinking protection by stripping Referer header
    await page.route('https://media.rawg.io/**', async (route) => {
      const headers = { ...route.request().headers() };
      delete headers['referer'];
      await route.continue({ headers });
    });

    // Log failing network requests
    page.on('response', response => {
      if (response.status() >= 400) {
        console.error(`Failed resource: ${response.url()} -> ${response.status()}`);
      }
    });

    await boardPage.goto();

    // Import the complex board fixture
    // Path relative to workspace root (assuming running from root)
    const fixturePath = 'e2e/fixtures/complex-board.json';
    
    await boardPage.importJson(fixturePath);

    // Verify a key item is visible (e.g. Witcher 3 in Tier A)
    const witcherCard = boardPage.getItemCard('rawg:game:3328', 'A');
    await expect(witcherCard).toBeVisible({ timeout: 15_000 });

    // Wait for all images to complete loading (or fail)
    await page.waitForFunction(() => {
      const images = [...document.querySelectorAll('img')];
      return images.every(img => img.complete);
    });

    // Track console errors
    let consoleErrorEncountered = false;
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrorEncountered = true;
        console.error('Console Error in Complex Board:', msg.text());
      }
    });

    // Take Screenshot using Screenshot Engine (Camera Button)
    const downloadPromise = page.waitForEvent('download');
    await boardPage.cameraButton.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toContain('.png');

    // Save the screenshot for manual inspection before checking for console errors
    const savedPath = `e2e/screenshots/complex-board-live-export.png`;
    await download.saveAs(savedPath);

    expect(consoleErrorEncountered).toBe(false);
  });
});
