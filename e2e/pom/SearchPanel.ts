import { expect, type Locator, type Page } from '@playwright/test';

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
    this.container = page.getByTestId('search-panel');
    this.searchInput = page.locator('input[placeholder^="Search"]');
    this.tabButtons = page.locator('button[title^="Search"]');
    this.results = page.getByTestId('search-results');
    this.filterToggleButton = page.getByTitle('Toggle filters');
    this.showAddedButton = page.getByRole('button', { name: /(Show|Hide) Added/i });
    this.serviceToggle = page.locator('text=Provider:').locator('..');
  }

  /**
   * Switches to a specific search tab using its deterministic entity ID mapped to data-testid.
   * @param entityId - The core registry entity ID to switch to (e.g. 'game', 'artist', 'album')
   */
  async switchTab(entityId: string) {
    const tabSelector = this.page.getByTestId(`tab-${entityId}`);
    await tabSelector.waitFor({ state: 'visible' });
    await tabSelector.click();
  }

  /**
   * Switches the active service/database (e.g., RAWG ↔ IGDB).
   * Only visible when the category has multiple services.
   * @param label - The service label (e.g., 'RAWG', 'IGDB').
   */
  async switchService(label: string) {
    const button = this.serviceToggle.getByRole('button', { name: label, exact: true });
    await button.click();
    // Wait for state to propagate (button becomes active)
    await expect(button).toHaveClass(/bg-surface-hover/);
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
    const source = await this.getResultCard(itemId);
    const target = this.page.locator(`[data-tier-label="${tierLabel}"]`).getByTestId('tier-drop-zone');
    
    await source.waitFor({ state: 'visible' });
    await target.waitFor({ state: 'visible' });

    const fullId = itemId.includes(':') ? itemId : `rawg:game:${itemId}`;
    const boardItem = this.page.getByTestId('tier-row').getByTestId(`item-card-${fullId}`);

    for (let attempt = 1; attempt <= 3; attempt++) {
      await source.dragTo(target);
      
      try {
        await expect(boardItem).toBeVisible({ timeout: 3000 });
        return; // Success!
      } catch (error) {
        if (attempt === 3) {
          throw new Error(`Self-healing Drag failed for ${itemId} to ${tierLabel} after 3 attempts. Error: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
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
