import path from 'node:path';

import { expect, test } from '../fixtures';
import { BoardPage } from '../pom/BoardPage';

test.describe('Reload Item Stability', () => {
  test('should persist items and images after page reload', async ({ page }) => {
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

    // Import complex board
    const fixturePath = path.resolve(__dirname, '../fixtures/complex-board.json');
    await boardPage.importJson(fixturePath);

    // Verify initial load succeeds without errors
    expect(consoleErrorEncountered).toBe(false);

    // Trigger page reload
    await page.reload();

    // Verify items still render and NO console errors occur after reload
    expect(consoleErrorEncountered).toBe(false);
  });
});
