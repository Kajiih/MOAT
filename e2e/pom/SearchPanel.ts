import { type Locator, type Page } from '@playwright/test';

import { nativeDragAndDrop } from '../utils/drag';

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
    this.container = page.locator('.sticky');
    this.searchInput = page.locator('input[placeholder^="Search"]');
    this.tabButtons = page.locator('button[title^="Search"]');
    this.results = page.getByTestId('search-results');
    this.filterToggleButton = page.getByTitle('Toggle filters');
    this.showAddedButton = page.getByRole('button', { name: /(Show|Hide) Added/i });
    this.serviceToggle = page.locator('text=Database:').locator('..');
  }

  async switchTab(
    type: 'game' | 'developer',
  ) {
    const titleMap = {
      game: 'Search Video Games',
      developer: 'Search Developers',
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
    const fullId = id.includes(':') ? id : `rawg:game:${id}`;
    const card = this.container.getByTestId(`item-card-${fullId}`);
    return card;
  }

  async dragToTier(itemId: string, tierLabel: string) {
    const card = await this.getResultCard(itemId);
    const tier = this.page.locator(`[data-tier-label="${tierLabel}"]`);
    
    // Target the tier's drop zone directly. Redux logic handles empty vs populated appended placement.
    await nativeDragAndDrop(this.page, card, tier.getByTestId('tier-drop-zone'), {
      targetPosition: { x: 5, y: 5 },
    });
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
