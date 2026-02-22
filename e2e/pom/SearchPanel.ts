import { type Locator, type Page } from '@playwright/test';

import { manualDragAndDrop } from '../utils/mouse';

export class SearchPanel {
  readonly page: Page;
  readonly container: Locator;
  readonly searchInput: Locator;
  readonly tabButtons: Locator;
  readonly results: Locator;
  readonly filterToggleButton: Locator;
  readonly showAddedButton: Locator;
  readonly serviceToggle: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.locator('.sticky'); // As seen in visual.spec.ts
    this.searchInput = page.locator('input[placeholder^="Search"]');
    this.tabButtons = page.locator('button[title^="Search"]');
    this.results = page.getByTestId('search-results');
    this.filterToggleButton = page.getByTitle('Toggle filters');
    this.showAddedButton = page.getByRole('button', { name: /(Show|Hide) Added/i });
    this.serviceToggle = page.locator('text=Database:').locator('..');
  }

  async switchTab(
    type:
      | 'song'
      | 'album'
      | 'artist'
      | 'book'
      | 'movie'
      | 'tv'
      | 'game'
      | 'developer'
      | 'franchise',
  ) {
    const titleMap = {
      song: 'Search Songs',
      album: 'Search Albums',
      artist: 'Search Artists',
      book: 'Search Books',
      movie: 'Search Movies',
      tv: 'Search TV Shows',
      game: 'Search Games',
      developer: 'Search Developers',
      franchise: 'Search Franchises',
    };
    await this.page.getByTitle(titleMap[type], { exact: false }).click();
  }

  /**
   * Switches the active service/database (e.g., RAWG ↔ IGDB).
   * Only visible when the category has multiple services.
   * @param label - The service label (e.g., 'RAWG', 'IGDB').
   */
  async switchService(label: string) {
    await this.serviceToggle.getByRole('button', { name: label, exact: true }).click();
  }

  async search(query: string) {
    await this.searchInput.fill(query);
    await this.searchInput.press('Enter');
  }

  async getResultCard(id: string) {
    return this.page.getByTestId(`media-card-search-${id}`);
  }

  async dragToTier(itemId: string, tierLabel: string) {
    const card = await this.getResultCard(itemId);
    const tierRow = this.page.locator(`[data-tier-label="${tierLabel}"]`);
    const dropZone = tierRow.getByTestId('tier-drop-zone');

    await manualDragAndDrop(this.page, card, dropZone);
  }

  async toggleFilters() {
    await this.filterToggleButton.click();
  }

  async setShowAdded(show: boolean) {
    const text = (await this.showAddedButton.textContent()) || '';
    const isShowing = text.includes('Hide Added'); // If it says "Hide Added", it is currently showing
    if (isShowing !== show) {
      await this.showAddedButton.click();
    }
  }
}
