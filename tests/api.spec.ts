import { test, expect } from '../fixtures/base.fixture';
import { logger } from '../utils/helpers';

/**
 * API — Cross-Layer Validation
 *
 * Intercepts real browser API calls to validate data integrity
 * between Catawiki's backend and what the UI renders.
 *
 * Endpoint: /buyer/api/v3/lots/{lotId}/bids?currency_code=EUR&per_page=200
 *
 * Tags:
 *   @sanity     — TC-011 (API health check)
 *   @regression — TC-012 (UI↔API data integrity)
 */

interface Bid {
  id: number;
  amount: number;
  currency_code: string;
  bidder: { name: string; country: { code: string } };
  created_at: string;
}

interface BidsResponse {
  bids: Bid[];
  meta: { total: number; per_page: number; page: number };
}

test.describe('API — Cross-Layer Validation', () => {

  test('TC-011 | Bid API response has correct structure @sanity', async ({
    homePage, searchResultsPage, page,
  }) => {
    let bidsResponse: BidsResponse | null = null;

    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('/buyer/api/v3/lots/') && url.includes('/bids') && response.status() === 200) {
        try {
          bidsResponse = await response.json() as BidsResponse;
        } catch {
          // ignore parse errors
        }
      }
    });

    await homePage.goto();
    await homePage.search('train');
    await searchResultsPage.waitForResults();
    await searchResultsPage.clickLotAtIndex(1);
    await page.waitForLoadState('networkidle');

    expect(bidsResponse, 'Bids API response was not intercepted').not.toBeNull();

    // TypeScript type guard
    if (!bidsResponse) {
      throw new Error('Bids API response was not intercepted');
    }
    const { bids, meta } = bidsResponse as BidsResponse;

    expect(Array.isArray(bids)).toBe(true);
    expect(bids.length).toBeGreaterThan(0);

    expect(meta).toHaveProperty('total');
    expect(meta.total).toBe(bids.length);

    const currentBid = bids[0];
    if (!currentBid) {
      throw new Error('No bids found in response');
    }
    expect(currentBid).toHaveProperty('id');
    expect(currentBid).toHaveProperty('amount');
    expect(currentBid).toHaveProperty('currency_code');
    expect(currentBid).toHaveProperty('bidder');
    expect(currentBid).toHaveProperty('created_at');
    expect(currentBid.amount).toBeGreaterThan(0);
    expect(currentBid.currency_code).toBe('EUR');
    expect(currentBid.bidder).toHaveProperty('name');
    expect(currentBid.bidder).toHaveProperty('country');

    for (let i = 1; i < bids.length; i++) {
      const prevBid = bids[i - 1];
      const currBid = bids[i];
      if (!prevBid || !currBid) continue;
      expect(prevBid.amount).toBeGreaterThanOrEqual(currBid.amount);
    }

    logger.info(`Bids API: ${meta.total} bids, highest: €${currentBid.amount} by ${currentBid.bidder.name}`);
  });


  test('TC-012 | UI current bid matches API highest bid @regression', async ({
    homePage, searchResultsPage, lotPage, page,
  }) => {
    let apiBidAmount: number | null = null;
    let apiCurrency: string | null = null;

    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('/buyer/api/v3/lots/') && url.includes('/bids') && response.status() === 200) {
        try {
          const body = await response.json() as BidsResponse;
          if (body.bids && body.bids.length > 0) {
            const highestBid = body.bids[0];
            if (highestBid) {
              apiBidAmount = highestBid.amount;
              apiCurrency = highestBid.currency_code;
            }
          }
        } catch {
          // ignore
        }
      }
    });

    await homePage.goto();
    await homePage.search('train');
    await searchResultsPage.waitForResults();
    await searchResultsPage.clickLotAtIndex(1);
    await lotPage.waitForPageLoad();
    await page.waitForLoadState('networkidle');

    const { amount: uiBid, currency: uiCurrency } = await lotPage.getCurrentBid();

    expect(apiBidAmount, 'Bids API was not intercepted').not.toBeNull();

    logger.info(`UI:  €${uiBid} (${uiCurrency})`);
    logger.info(`API: €${apiBidAmount} (${apiCurrency})`);

    expect(uiBid).toBe(apiBidAmount);
    expect(uiCurrency).toBe('EUR');
    expect(apiCurrency).toBe('EUR');

    logger.info('UI ↔ API bid values match');
  });
});
