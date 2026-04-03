import { expect, test } from '../fixtures';

test.describe('Service Toggle (Multi-Database)', () => {
  test.beforeEach(async ({ dashboardPage }) => {
    await dashboardPage.goto();
    await dashboardPage.createBoard('Game Board');
  });

  test('should show a provider toggle when multiple providers are available', async ({ page }) => {
    // The "Provider:" label and toggle should be visible because 'bootstrap.ts' loads RAWG and MusicBrainz
    await expect(page.getByText('Provider:')).toBeVisible();
    await expect(page.getByRole('button', { name: 'RAWG' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'MUSICBRAINZ' })).toBeVisible();
  });

  test('should show Game and Developer tabs for RAWG', async ({ page, searchPanel }) => {
    // Switch to RAWG database to see Games/Developers tabs
    await searchPanel.switchService('RAWG');

    // RAWG supports Game + Developer
    await expect(page.getByTestId('tab-game')).toBeVisible();
    await expect(page.getByTestId('tab-developer')).toBeVisible();
    // RAWG does NOT support Franchise
    await expect(page.getByTestId('tab-franchise')).toBeHidden();
  });
});
