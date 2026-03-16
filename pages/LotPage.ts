import { Page, Locator, expect } from '@playwright/test';
import type { LotDetails, BidOptions } from '../types/catawiki.types';
import { parseCurrencyToNumber, parseFavouritesCount } from '../utils/helpers';

export class LotPage {
  readonly page: Page;

  private readonly lotTitle: Locator;
  private readonly favouriteButton: Locator;
  private readonly bidAmount: Locator;
  private readonly placeBidButton: Locator;
  private readonly setMaxBidButton: Locator;
  private readonly buyerProtectionSection: Locator;
  private readonly expertSection: Locator;

  constructor(page: Page) {
    this.page = page;

    this.lotTitle = page.locator('h1').first();

    // Lot detail favourite button — has count attribute and nested span with count text
    this.favouriteButton = page
      .locator('[data-sentry-component="LotDetailsFavoriteButton"] button[title="favourite"]')
      .first();

    this.bidAmount = page.locator('[data-sentry-component="Amount"]').first();

    this.placeBidButton = page.getByRole('button', { name: 'Place bid' }).first();
    this.setMaxBidButton = page.getByRole('button', { name: 'Set max bid' }).first();

    this.buyerProtectionSection = page.getByText('Catawiki Buyer Protection').first();
    this.expertSection = page.getByText(/Selected by/i).first();
  }

  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
    await this.lotTitle.waitFor({ state: 'visible', timeout: 15_000 });
  }

  async isOnLotPage(): Promise<boolean> {
    return this.page.url().includes('/l/');
  }

  async getTitle(): Promise<string> {
    await expect(this.lotTitle).toBeVisible();
    return (await this.lotTitle.innerText()).trim();
  }

  async getFavouritesCount(): Promise<number> {
    await expect(this.favouriteButton).toBeVisible();

    const countAttr = await this.favouriteButton.getAttribute('count');
    if (countAttr) {
      return parseFavouritesCount(countAttr);
    }

    const spanText = await this.favouriteButton.locator('span').innerText();
    return parseFavouritesCount(spanText);
  }

  async getCurrentBid(): Promise<{ amount: number; currency: string }> {
    await expect(this.bidAmount).toBeVisible();
    const raw = (await this.bidAmount.innerText()).trim();
    const amount = parseCurrencyToNumber(raw);
    const currency = raw.includes('€') ? 'EUR' : 'USD';
    return { amount, currency };
  }

  async getClosingTime(): Promise<string> {
    const timer = this.page.getByTestId('lot-bidding-counter').first();
    await expect(timer).toBeVisible();
    return (await timer.innerText()).trim();
  }

  /**
   * Returns a locator for the seconds column of the countdown timer
   */
  getLiveCountdownLocator(): Locator {
    return this.page
      .getByTestId('lot-bidding-counter')
      .locator('[data-sentry-component="AnimatedNumber"]')
      .last();
  }

  async getLotDetails(): Promise<LotDetails> {
    const title = await this.getTitle();
    const favouritesCount = await this.getFavouritesCount();
    const { amount: currentBid, currency } = await this.getCurrentBid();
    const closingTime = await this.getClosingTime();

    return { title, favouritesCount, currentBid, currency, closingTime };
  }

  async getBidOptions(): Promise<BidOptions> {
    const suggestedBidButtons = this.page.getByRole('button', { name: /^€\s+\d+$/ });

    await suggestedBidButtons.first().waitFor({ state: 'visible', timeout: 10_000 });

    const count = await suggestedBidButtons.count();
    const suggestedAmounts: number[] = [];

    for (let i = 0; i < count; i++) {
      const text = await suggestedBidButtons.nth(i).innerText();
      suggestedAmounts.push(parseCurrencyToNumber(text));
    }

    const bidInput = this.page.getByPlaceholder(/or up/i).first();
    let minimumBid = 0;
    try {
      const placeholder = await bidInput.getAttribute('placeholder') ?? '';
      minimumBid = parseCurrencyToNumber(placeholder);
    } catch {
   
    }

    const uniqueAmounts = [...new Set(suggestedAmounts)].sort((a, b) => a - b);

    return {
      suggestedAmounts: uniqueAmounts,
      minimumBid,
      currency: 'EUR',
    };
  }

  async isBuyerProtectionVisible(): Promise<boolean> {
    try {
      await this.buyerProtectionSection.waitFor({ state: 'visible', timeout: 5_000 });
      return true;
    } catch {
      return false;
    }
  }

  async isExpertSelectorVisible(): Promise<boolean> {
    try {
      await this.expertSection.waitFor({ state: 'visible', timeout: 5_000 });
      return true;
    } catch {
      return false;
    }
  }

  async placeBidButtonIsEnabled(): Promise<boolean> {
    await this.placeBidButton.waitFor({ state: 'visible' });
    return this.placeBidButton.isEnabled();
  }

  async setMaxBidButtonIsEnabled(): Promise<boolean> {
    await this.setMaxBidButton.waitFor({ state: 'visible' });
    return this.setMaxBidButton.isEnabled();
  }
}
