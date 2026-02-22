import { expect, type Locator, type Page } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly createBoardButton: Locator;
  readonly boardCards: Locator;

  constructor(page: Page) {
    this.page = page;
    this.createBoardButton = page.getByText('Create Board');
    this.boardCards = page.getByTestId('board-card');
  }

  async goto() {
    await this.page.goto('/dashboard', { waitUntil: 'commit' });
    // Wait for the loading state to disappear
    await expect(this.page.getByText('Loading registry...')).not.toBeVisible({ timeout: 10_000 });
    // Wait for core UI to be ready (hydration complete)
    await expect(this.createBoardButton).toBeVisible();
  }

  async createBoard(title?: string) {
    await this.createBoardButton.waitFor({ state: 'visible' });
    await this.createBoardButton.click();
    // Use first() to avoid strict mode violation if multiple elements match
    await this.page.getByRole('button', { name: /Music/i }).first().click();
    
    // Once on the board page, we can rename it if needed
    if (title) {
      const titleInput = this.page.getByLabel('Tier List Title');
      await expect(titleInput).toBeVisible();
      await titleInput.fill(title);
      await titleInput.press('Enter');
    }
  }

  async openBoard(title: string) {
    const card = this.boardCards.filter({ hasText: title }).first();
    await card.click();
  }

  async deleteBoard(title: string) {
    const card = this.boardCards.filter({ hasText: title }).first();
    await card.hover();
    
    this.page.once('dialog', dialog => dialog.accept());
    await card.getByTitle('Delete Board').click();
  }
}
