import { expect, test } from './fixtures';

test.describe('Service Toggle (Multi-Database)', () => {
  test.beforeEach(async ({ dashboardPage }) => {
    await dashboardPage.goto();
    await dashboardPage.createBoard('Game Board');
  });

  test('should not show a database toggle when only one provider is available', async ({ page }) => {
    // The "Database:" label and toggle should NOT be visible when there's only one provider
    await expect(page.getByText('Database:')).toBeHidden();
    await expect(page.getByRole('button', { name: 'RAWG' })).toBeHidden();
  });

  test('should show Game and Developer tabs for RAWG', async ({
    page,
  }) => {
    // RAWG supports Game + Developer
    await expect(page.getByTitle('Search Video Games', { exact: false })).toBeVisible();
    await expect(page.getByTitle('Search Developers', { exact: false })).toBeVisible();
    // RAWG does NOT support Franchise
    await expect(page.getByTitle('Search Franchises', { exact: false })).toBeHidden();
  });

});
