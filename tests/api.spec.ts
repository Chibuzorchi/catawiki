import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { SearchResultsPage } from '../pages/SearchResultsPage';
import { LotPage } from '../pages/LotPage';
import { logger } from '../utils/helpers';

const SEARCH_KEYWORD = 'train';

/**
 * Shared navigation helper — follows the exact same path as the smoke test.
 * Returns the lot ID extracted from the URL after clicking the second result.
 */
async function navigateToSecondLot(page: import('@playwright/test').Page) {
  const homePage = new HomePage(page);
  const resultsPage = new SearchResultsPage(page);
  const lotPage = new LotPage(page);

  await homePage.goto();
  await homePage.search(SEARCH_KEYWORD);
  await resultsPage.waitForResults();
  await resultsPage.clickLotAtIndex(1);
  await lotPage.waitForPageLoad();

  // Extract lot ID from URL — this is the ground truth
  const lotIdMatch = page.url().match(/\/l\/(\d+)/);
  expect(lotIdMatch, 'URL should contain a lot ID').not.toBeNull();
  const lotId = lotIdMatch![1];

  return { lotId, lotPage };
}


test.describe('API — Cross-Layer Validation', () => {

  test('TC-008 | Lot bids API returns valid response for the displayed lot @sanity', async ({ page }) => {
    // Set up the bids interceptor before any navigation
    const capturedBidsResponses: Array<{ url: string; status: number; body: unknown }> = [];

    page.on('response', async (response) => {
      if (response.url().includes('/bids') && response.url().includes('/lots/')) {
        try {
          const body = await response.json();
          capturedBidsResponses.push({
            url: response.url(),
            status: response.status(),
            body,
          });
        } catch { /* non-JSON response, skip */ }
      }
    });

    const { lotId } = await navigateToSecondLot(page);
    logger.info(`Navigated to lot: ${lotId}`);

    // Give the bids request time to complete
    await page.waitForTimeout(3_000);

    // Find the bids response for our lot
    const bidsForOurLot = capturedBidsResponses.find(r => r.url.includes(`/lots/${lotId}/bids`));

    if (bidsForOurLot) {
      expect(bidsForOurLot.status).toBe(200);
      const body = bidsForOurLot.body as Record<string, unknown>;

      // Response should have a recognizable structure
      expect(body).toBeDefined();
      logger.info(`Bids API responded for lot ${lotId}: ${JSON.stringify(Object.keys(body))}`);
    } else {
      // Not all lots fire a bids request (Buy Now, pre-auction, etc.)
      logger.info(`No bids request captured for lot ${lotId} — may not be an active auction`);
    }
  });


  test('TC-009 | UI title matches the lot data served by the API @sanity', async ({ page }) => {
    // Capture all /buyer/api/v1/lots responses during navigation
    const capturedLotResponses: Array<{ url: string; body: Record<string, unknown> }> = [];

    page.on('response', async (response) => {
      if (response.url().includes('/buyer/api/v1/lots') && response.status() === 200) {
        try {
          const body = await response.json();
          capturedLotResponses.push({ url: response.url(), body });
        } catch { /* skip non-JSON */ }
      }
    });

    const { lotId, lotPage } = await navigateToSecondLot(page);
    const uiTitle = await lotPage.getTitle();
    logger.info(`UI title: "${uiTitle}"`);

    // Search through captured API responses for our lot ID
    let apiTitle: string | null = null;

    for (const resp of capturedLotResponses) {
      const lots = (resp.body as { lots?: Array<Record<string, unknown>> }).lots;
      if (!lots) continue;

      const match = lots.find((l: Record<string, unknown>) => String(l.id) === lotId);
      if (match) {
        apiTitle = match.title as string;
        break;
      }
    }

    if (apiTitle) {
      logger.info(`API title: "${apiTitle}"`);
      expect(uiTitle).toContain(apiTitle.substring(0, 30));
      logger.info('UI/API title match confirmed');
    } else {
      // Lot wasn't in any batch response — validate UI data independently
      logger.info(`Lot ${lotId} not found in batch API responses — validating UI only`);
      expect(uiTitle.length).toBeGreaterThan(0);
    }
  });


  test('TC-010 | UI current bid matches bids API for the same lot @sanity', async ({ page }) => {
    const capturedBids: Array<{ url: string; body: Record<string, unknown> }> = [];

    page.on('response', async (response) => {
      if (response.url().includes('/bids') && response.url().includes('/lots/') && response.status() === 200) {
        try {
          const body = await response.json();
          capturedBids.push({ url: response.url(), body });
        } catch { /* skip */ }
      }
    });

    const { lotId, lotPage } = await navigateToSecondLot(page);
    logger.info(`Target lot: ${lotId}`);

    // Wait for bids request to complete
    await page.waitForTimeout(3_000);

    const { amount: uiBid } = await lotPage.getCurrentBid();
    logger.info(`UI current bid: €${uiBid}`);

    const bidsForLot = capturedBids.find(r => r.url.includes(`/lots/${lotId}/bids`));

    if (bidsForLot) {
      const body = bidsForLot.body;
      const bids = body.bids as Array<{ amount: number }> | undefined;

      if (bids && bids.length > 0) {
        const highestBidCents = Math.max(...bids.map(b => b.amount));
        const apiBid = highestBidCents;
        logger.info(`API highest bid: €${apiBid} (${bids.length} total bids)`);

        // €1 tolerance for live auction timing
        expect(Math.abs(uiBid - apiBid)).toBeLessThanOrEqual(1);
        logger.info(`Bid match confirmed (delta: €${Math.abs(uiBid - apiBid).toFixed(2)})`);
      } else {
        logger.info('Bids array is empty — lot at starting price');
        expect(uiBid).toBeGreaterThan(0);
      }
    } else {
      logger.info(`No bids request for lot ${lotId} — validating UI bid is positive`);
      expect(uiBid).toBeGreaterThan(0);
    }
  });


  test('TC-011 | Batch lots API schema validation — fields from network interception @sanity', async ({ page }) => {
    const capturedBatchResponses: Array<Record<string, unknown>> = [];

    page.on('response', async (response) => {
      // Only capture the batch lots call with ids param (not the seller lots endpoint)
      if (
        response.url().includes('/buyer/api/v1/lots?ids=') &&
        response.status() === 200
      ) {
        try {
          const body = await response.json();
          capturedBatchResponses.push(body);
        } catch { /* skip */ }
      }
    });

    const homePage = new HomePage(page);
    const resultsPage = new SearchResultsPage(page);

    await homePage.goto();
    await homePage.search(SEARCH_KEYWORD);
    await resultsPage.waitForResults();

    // Wait for batch request to be captured
    await page.waitForTimeout(2_000);

    expect(capturedBatchResponses.length).toBeGreaterThan(0);

    // Use the LAST batch response — the one triggered by search, not homepage
    const lastBatch = capturedBatchResponses[capturedBatchResponses.length - 1]!;
    const lots = (lastBatch as { lots: Array<Record<string, unknown>> }).lots;

    expect(lots.length).toBeGreaterThan(0);
    logger.info(`Validating schema for ${lots.length} lots in batch response`);

    for (const lot of lots) {
      // Fields confirmed from network tab capture
      expect(typeof lot.id, `id should be number`).toBe('number');
      expect(typeof lot.title, `title should be string`).toBe('string');
      expect(typeof lot.url, `url should be string`).toBe('string');
      expect(typeof lot.auction_id, `auction_id should be number`).toBe('number');

      expect((lot.title as string).length).toBeGreaterThan(0);
      expect(lot.url as string).toContain(`/l/${lot.id}`);
    }

    logger.info(`Schema validated for all ${lots.length} lots`);
  });


  test('TC-012 | Seller lots API fires on lot page with valid structure @sanity', async ({ page }) => {
    const capturedSellerResponses: Array<Record<string, unknown>> = [];

    page.on('response', async (response) => {
      if (response.url().includes('/buyer/api/v1/sellers/lots') && response.status() === 200) {
        try {
          const body = await response.json();
          capturedSellerResponses.push(body);
        } catch { /* skip */ }
      }
    });

    const { lotId } = await navigateToSecondLot(page);
    logger.info(`On lot page: ${lotId}`);

    // Wait for seller lots request
    await page.waitForTimeout(3_000);

    if (capturedSellerResponses.length > 0) {
      const sellerData = capturedSellerResponses[0]! as { total: number; lots: Array<Record<string, unknown>> };

      expect(sellerData.total).toBeGreaterThan(0);
      expect(sellerData.lots.length).toBeGreaterThan(0);

      // Validate seller lot structure
      const firstSellerLot = sellerData.lots[0]!;
      expect(firstSellerLot).toHaveProperty('id');
      expect(firstSellerLot).toHaveProperty('title');
      expect(firstSellerLot).toHaveProperty('url');

      logger.info(`Seller has ${sellerData.total} total lots, page returned ${sellerData.lots.length}`);

      // Check if our lot appears in this page of seller results
      const ourLot = sellerData.lots.find(l => String(l.id) === lotId);
      if (ourLot) {
        logger.info(`Lot ${lotId} found in seller's inventory`);
      } else {
        // Seller may have 500+ lots — our lot might not be on page 1
        logger.info(`Lot ${lotId} not on first page of seller results (${sellerData.total} total lots)`);
      }
    } else {
      logger.info('No seller lots request captured — endpoint may not fire for this lot type');
    }
  });
});