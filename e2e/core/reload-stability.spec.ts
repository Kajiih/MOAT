import path from 'node:path';
import fs from 'node:fs';

import { expect, test } from '../fixtures';
import { BoardPage } from '../pom/BoardPage';

test.describe('Reload Item Stability', () => {
  test('should persist items and images after page reload', async ({ page }, testInfo) => {
    const boardPage = new BoardPage(page);
    await page.goto('/');

    let consoleErrorEncountered = false;
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore BatchResolver flush failure due to fetch being canceled on reload
        if (text.includes('BatchResolver flush failure') && text.includes('Failed to fetch')) {
          return;
        }
        consoleErrorEncountered = true;
        console.error(`Console Error in Reload Test: ${text}`);
      }
    });

    // Generate Board JSON
    const board = {
      version: 2,
      createdAt: new Date().toISOString(),
      title: "Reload Test Board",
      tiers: [
        {
          label: "S",
          color: "red",
          items: [
            {
              id: "rawg:game:1",
              identity: { providerId: "rawg", entityId: "game", providerItemId: "1" },
              title: "Test Game 1",
              images: [
                {
                  type: "url",
                  url: "https://placehold.co/100x100.png"
                }
              ],
              subtitle: ["Test Subtitle"],
              tertiaryText: "Test Text"
            }
          ]
        }
      ],
      uncategorizedItems: []
    };

    // Write to temp file in test output directory
    const fixturePath = testInfo.outputPath('reload-board.json');
    fs.mkdirSync(path.dirname(fixturePath), { recursive: true });
    fs.writeFileSync(fixturePath, JSON.stringify(board, null, 2));

    await boardPage.importJson(fixturePath);

    // Verify initial load succeeds without errors
    expect(consoleErrorEncountered).toBe(false);

    // Verify item is visible before reload
    const item = page.locator('[data-testid^="item-card-rawg:game:1"]');
    await expect(item).toBeVisible();

    // Wait for debounced persistence to fire (default window is 500-1000ms)
    // Since there is no UI indicator for save completion, we must use a timeout here.
    await page.waitForTimeout(1500);

    // Trigger page reload
    await page.reload();

    // Verify items still render
    await expect(item).toBeVisible();

    // Verify NO console errors occur after reload
    expect(consoleErrorEncountered).toBe(false);

    // Clean up temp file
    try {
      fs.unlinkSync(fixturePath);
    } catch (e) {
      console.warn('Failed to clean up temp file:', e);
    }
  });
});
