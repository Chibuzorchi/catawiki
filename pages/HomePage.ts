import { Page, Locator, expect } from '@playwright/test';
import { dismissCookieBanner } from '../utils/helpers';

export class HomePage {
  readonly page: Page;

  private readonly searchInput: Locator;
  private readonly searchButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // 3 comboboxes exist (desktop, mobile, footer) — target the first visible one
    this.searchInput = page.getByRole('combobox', { name: 'Search for brand, model,' }).first();
    this.searchButton = page.getByRole('button', { name: 'Search' }).first();
  }

  async goto(): Promise<void> {
    await this.page.goto('/en/', { waitUntil: 'networkidle' });

    // Human-like delay after page load
    await this.page.waitForTimeout(Math.random() * 1000 + 1500);

    await dismissCookieBanner(this.page);

    // Wait for page to stabilize
    await this.page.waitForLoadState('domcontentloaded');
  }

  async search(keyword: string): Promise<void> {
    // Wait for search box to be visible
    await this.searchInput.waitFor({ state: 'visible', timeout: 10000 });

    // Human-like mouse movement before click
    const box = await this.searchInput.boundingBox();
    if (box) {
      // Move mouse to center of element
      await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 });
      await this.page.waitForTimeout(Math.random() * 300 + 200);
    }

    await this.searchInput.click();

    // Small delay before typing
    await this.page.waitForTimeout(Math.random() * 500 + 300);

    // Type with human-like delays
    await this.searchInput.pressSequentially(keyword, { delay: Math.random() * 100 + 80 });

    await expect(this.searchInput).toHaveValue(keyword);

    // Human pause before clicking search
    await this.page.waitForTimeout(Math.random() * 800 + 500);

    await this.searchButton.click();
  }
}
