import { expect, test } from './fixtures';
import { mockSearchResults } from './utils/mocks';

test.describe('Service Toggle (Multi-Database)', () => {
  test.beforeEach(async ({ dashboardPage }) => {
    await dashboardPage.goto();
    await dashboardPage.createBoard('Game Board', 'Games');
  });

  test('should show a database toggle on game boards', async ({ page }) => {
    // The "Database:" label and toggle should be visible
    await expect(page.getByText('Database:')).toBeVisible();
    await expect(page.getByRole('button', { name: 'RAWG' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'IGDB' })).toBeVisible();
  });

  test('should show Game and Developer tabs when RAWG is selected', async ({
    page,
    searchPanel,
  }) => {
    await searchPanel.switchService('RAWG');

    // RAWG supports Game + Developer
    await expect(page.getByTitle('Search Video Games', { exact: false })).toBeVisible();
    await expect(page.getByTitle('Search Developers', { exact: false })).toBeVisible();
    // RAWG does NOT support Franchise
    await expect(page.getByTitle('Search Franchises', { exact: false })).toBeHidden();
  });

  test('should show Game and Franchise tabs when IGDB is selected', async ({
    page,
    searchPanel,
  }) => {
    await searchPanel.switchService('IGDB');

    // IGDB supports Game + Franchise
    await expect(page.getByTitle('Search Video Games', { exact: false })).toBeVisible();
    await expect(page.getByTitle('Search Franchises', { exact: false })).toBeVisible();
    // IGDB does NOT support Developer
    await expect(page.getByTitle('Search Developers', { exact: false })).toBeHidden();
  });

  test('should search through the selected service', async ({ page, searchPanel }) => {
    await mockSearchResults(page, [{ id: 'game-1', title: 'The Witcher 3', type: 'game' }]);

    await searchPanel.switchService('IGDB');
    await searchPanel.search('Witcher');

    await expect(page.getByText('The Witcher 3')).toBeVisible();
  });
});
