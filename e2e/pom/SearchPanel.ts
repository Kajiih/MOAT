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

  constructor(page: Page) {
    this.page = page;
    this.container = page.locator('.sticky'); // As seen in visual.spec.ts
    this.searchInput = page.locator('input[placeholder^="Search"]');
    this.tabButtons = page.locator('button[title^="Search"]');
    this.results = page.getByTestId('search-results');
    this.filterToggleButton = page.getByTitle('Toggle filters');
    this.showAddedButton = page.getByRole('button', { name: /(Show|Hide) Added/i });
  }

  async switchTab(type: 'song' | 'album' | 'artist' | 'book' | 'movie' | 'tv') {
    const titleMap = {
      song: 'Search songs',
      album: 'Search albums',
      artist: 'Search artists',
      book: 'Search books',
      movie: 'Search movies',
      tv: 'Search tv shows',
    };
    await this.page.getByTitle(titleMap[type]).click();
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
