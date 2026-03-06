import { Page } from '@playwright/test';

/**
 * Parses a Catawiki currency string into a numeric value.
 * Handles formats: "€ 53", "€53", "€ 1,234", "€ 1.234"
 */
export function parseCurrencyToNumber(raw: string): number {
  const cleaned = raw.replace(/[€\s,]/g, '').trim();
  const value = parseFloat(cleaned);

  if (isNaN(value)) {
    throw new Error(`Failed to parse currency value: "${raw}"`);
  }

  return value;
}

/**
 * Parses a favourites/heart counter string to number.
 * Handles formats: "39", "1.2k", "1k+"
 */
export function parseFavouritesCount(raw: string): number {
  const cleaned = raw.trim().toLowerCase().replace(/[^0-9k.+]/g, '');

  if (cleaned.includes('k')) {
    const numeric = parseFloat(cleaned.replace('k', '').replace('+', ''));
    return Math.round(numeric * 1000);
  }

  const value = parseInt(cleaned, 10);

  if (isNaN(value)) {
    throw new Error(`Failed to parse favourites count: "${raw}"`);
  }

  return value;
}

/**
 * Dismisses cookie consent banner if present.
 * Catawiki shows "Agree" button on first visit.
 */
export async function dismissCookieBanner(page: Page): Promise<void> {
  const acceptButton = page.locator('#cookie_bar_agree_button');

  try {
    await acceptButton.waitFor({ state: 'visible', timeout: 5_000 });
    await acceptButton.click();
    await acceptButton.waitFor({ state: 'hidden', timeout: 5_000 });
  } catch {
    // Banner not present — continue normally
  }
}

export const logger = {
  lot(details: { title: string; favouritesCount: number; currentBid: number; currency: string }): void {
    console.log('\n─────────────────────────────────────');
    console.log('  LOT DETAILS');
    console.log('─────────────────────────────────────');
    console.log(`  Title:       ${details.title}`);
    console.log(`  Favourites:  ${details.favouritesCount}`);
    console.log(`  Current Bid: ${details.currency === 'EUR' ? '€' : '$'} ${details.currentBid}`);
    console.log('─────────────────────────────────────\n');
  },

  info(message: string): void {
    console.log(`[INFO] ${message}`);
  },
};
