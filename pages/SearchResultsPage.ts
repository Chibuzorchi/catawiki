import { Page, Locator, expect } from '@playwright/test';
import type { SearchResult } from '../types/catawiki.types';

export class SearchResultsPage {
  readonly page: Page;

  readonly lotCards: Locator;
  private readonly paginationNext: Locator;
  private readonly noResultsIndicator: Locator;

  constructor(page: Page) {
    this.page = page;

    // Each lot card has data-testid="lot-card-container-{lotId}" wrapping an <article>
    this.lotCards = page.locator('[data-testid^="lot-card-container-"]');

    this.paginationNext = page.getByRole('button', { name: 'Next' })
      .or(page.getByRole('link', { name: 'Next' }))
      .first();

    this.noResultsIndicator = page.getByText(/no results|no objects|0 objects/i).first();
  }

  async waitForResults(): Promise<void> {
    await this.page.waitForURL(/\/s\?/, { timeout: 15_000 });
    await this.page.waitForLoadState('domcontentloaded');
    await this.lotCards.first().waitFor({ state: 'visible', timeout: 15_000 });
  }

  async waitForSearchPage(): Promise<void> {
    await this.page.waitForURL(/\/s\?/, { timeout: 15_000 });
    await this.page.waitForLoadState('domcontentloaded');
  }

  async isOnSearchResultsPage(): Promise<boolean> {
    return this.page.url().includes('/s?');
  }

  async getLotCount(): Promise<number> {
    return this.lotCards.count();
  }

  async getLotAtIndex(index: number): Promise<SearchResult> {
    const card = this.lotCards.nth(index);
    await expect(card).toBeVisible();

    const title = await card.locator('p.c-lot-card__title').innerText();
    return { title: title.trim(), index };
  }

  async clickLotAtIndex(index: number): Promise<void> {
    const card = this.lotCards.nth(index);
    await expect(card).toBeVisible();

    const link = card.locator('a.c-lot-card');
    await Promise.all([
      this.page.waitForURL(/\/l\//, { timeout: 15_000 }),
      link.click(),
    ]);
  }

  async hasPagination(): Promise<boolean> {
    try {
      await this.paginationNext.waitFor({ state: 'visible', timeout: 5_000 });
      return true;
    } catch {
      return false;
    }
  }

  async hasNoResults(): Promise<boolean> {
    try {
      await this.noResultsIndicator.waitFor({ state: 'visible', timeout: 5_000 });
      return true;
    } catch {
      return false;
    }
  }
}
