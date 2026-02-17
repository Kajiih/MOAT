import { type Locator, type Page } from '@playwright/test';

export class SearchPanel {
  readonly page: Page;
  readonly container: Locator;
  readonly searchInput: Locator;
  readonly tabButtons: Locator;
  readonly results: Locator;
  readonly filterToggleButton: Locator;
  readonly showAddedCheckbox: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.locator('.sticky'); // As seen in visual.spec.ts
    this.searchInput = page.locator('input[placeholder^="Search"]');
    this.tabButtons = page.locator('button[title^="Search"]');
    this.results = page.getByTestId('search-results');
    this.filterToggleButton = page.getByTitle('Toggle filters');
    this.showAddedCheckbox = page.locator('label').filter({ hasText: 'Show Added' }).locator('input');
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
    return this.page.locator(`#media-card-search-${id}`);
  }

  async dragToTier(itemId: string, tierLabel: string) {
    const card = await this.getResultCard(itemId);
    const tierRow = this.page.locator(`[data-tier-label="${tierLabel}"]`);
    const dropZone = tierRow.getByTestId('tier-drop-zone');

    const cardBox = await card.boundingBox();
    const dropBox = await dropZone.boundingBox();

    if (!cardBox || !dropBox) throw new Error('Could not find bounding boxes for drag and drop');

    await this.page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
    await this.page.mouse.down();
    
    // Hold to ensure drag start
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await this.page.waitForTimeout(200);
    
    // Initial small move to trigger sensor
    await this.page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2 + 10, { steps: 5 });
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await this.page.waitForTimeout(100);

    await this.page.mouse.move(dropBox.x + dropBox.width / 2, dropBox.y + dropBox.height / 2, {
      steps: 50,
    });
    
    // Hover over target
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await this.page.waitForTimeout(200);
    
    await this.page.mouse.up();
  }

  async toggleFilters() {
    await this.filterToggleButton.click();
  }

  async setShowAdded(show: boolean) {
    const isChecked = await this.showAddedCheckbox.isChecked();
    if (isChecked !== show) {
      await this.showAddedCheckbox.click();
    }
  }
}
