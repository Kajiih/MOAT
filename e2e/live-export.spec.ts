import { expect, test } from './fixtures';

test.describe('Live Export Verification (Unmocked)', () => {
  test.setTimeout(60_000); // Live API might be slow

  test('should render real images in export preview @smoke', async ({ page, boardPage, searchPanel }) => {
    await boardPage.goto();

    await page.getByTestId('search-panel').waitFor({ state: 'visible' });
    
    // Import the complex board fixture
    const fixturePath = 'e2e/fixtures/complex-board.json';
    await boardPage.importJson(fixturePath);

    // Wait for real items to load on the board before opening preview
    const witcherCard = boardPage.getItemCard('rawg:game:3328', 'A');
    await expect(witcherCard).toBeVisible({ timeout: 15_000 });

    // Toggle Preview
    await page.keyboard.press('Shift+P');

    const overlay = page.locator('.z-overlay');
    await expect(overlay).toBeVisible();

    const exportSurface = overlay.locator('#export-board-surface');
    await expect(exportSurface).toBeVisible();

    // Verify specific image loads in preview from RAWG
    const witcherImg = exportSurface.getByRole('img', { name: 'The Witcher 3: Wild Hunt' });
    await expect(witcherImg).toBeVisible({ timeout: 15_000 });

    // Verify image from MusicBrainz (Album)
    const michaelImg = exportSurface.getByRole('img', { name: 'Michael' });
    await expect(michaelImg).toBeVisible({ timeout: 15_000 });

    // Verify image from TMDB (Movie)
    const shelterImg = exportSurface.getByRole('img', { name: 'Shelter' });
    await expect(shelterImg).toBeVisible({ timeout: 15_000 });

    // Take a screenshot for manual verification
    await exportSurface.screenshot({ path: 'e2e/screenshots/live-export-preview.png' });
    console.log('Saved screenshot to e2e/screenshots/live-export-preview.png');
  });
});
