import { test, expect } from '../fixtures/base.fixture';
import { logger } from '../utils/helpers';

/**
 * Lot Page Test Suite — verifies structure and live auction behaviour.
 *
 * Tags:
 *   @sanity     — TC-007, TC-008 (basic page health)
 *   @regression — TC-009, TC-010 (deeper checks)
 */

test.describe('Lot Page', () => {

  test.beforeEach(async ({ homePage, searchResultsPage }) => {
    await homePage.goto();
    await homePage.search('train');
    await searchResultsPage.waitForResults();
    await searchResultsPage.clickLotAtIndex(1);
  });


  test('TC-007 | Lot page structural integrity — all critical elements present @sanity', async ({
    lotPage,
  }) => {
    await lotPage.waitForPageLoad();

    const title = await lotPage.getTitle();
    expect(title.length).toBeGreaterThan(0);

    const { amount, currency } = await lotPage.getCurrentBid();
    expect(amount).toBeGreaterThan(0);
    expect(currency).toBe('EUR');

    const favourites = await lotPage.getFavouritesCount();
    expect(favourites).toBeGreaterThanOrEqual(0);

    const closingTime = await lotPage.getClosingTime();
    expect(closingTime.length).toBeGreaterThan(0);

    const hasBuyerProtection = await lotPage.isBuyerProtectionVisible();
    expect(hasBuyerProtection).toBe(true);

    const hasExpert = await lotPage.isExpertSelectorVisible();
    expect(hasExpert).toBe(true);

    logger.info(`Lot page structure verified: "${title}"`);
  });


  test('TC-008 | Bid action buttons are visible and enabled @sanity', async ({ lotPage }) => {
    await lotPage.waitForPageLoad();

    const placeBidEnabled = await lotPage.placeBidButtonIsEnabled();
    const setMaxBidEnabled = await lotPage.setMaxBidButtonIsEnabled();

    expect(placeBidEnabled).toBe(true);
    expect(setMaxBidEnabled).toBe(true);

    logger.info('Both bid action buttons are visible and enabled');
  });


  test('TC-009 | Suggested bid amounts are numeric and strictly ascending @regression', async ({
    lotPage,
  }) => {
    await lotPage.waitForPageLoad();

    const bidOptions = await lotPage.getBidOptions();

    expect(bidOptions.suggestedAmounts.length).toBeGreaterThan(0);

    for (const amount of bidOptions.suggestedAmounts) {
      expect(amount).toBeGreaterThan(0);
      expect(Number.isFinite(amount)).toBe(true);
    }

    for (let i = 1; i < bidOptions.suggestedAmounts.length; i++) {
      const prevAmount = bidOptions.suggestedAmounts[i - 1];
      const currAmount = bidOptions.suggestedAmounts[i];
      if (prevAmount === undefined || currAmount === undefined) continue;
      expect(currAmount).toBeGreaterThan(prevAmount);
    }

    logger.info(
      `Suggested bids verified: ${bidOptions.suggestedAmounts.map(a => `€${a}`).join(', ')}`
    );
  });


  test('TC-010 | Closing timer is live — decrements in real time @regression', async ({ lotPage }) => {
    await lotPage.waitForPageLoad();

    const timerLocator = lotPage.getLiveCountdownLocator();
    await expect(timerLocator).toBeVisible();

    const firstReading = await timerLocator.innerText();
    logger.info(`Timer at t=0: "${firstReading}"`);

    await expect(timerLocator).not.toHaveText(firstReading, { timeout: 10_000 });

    const secondReading = await timerLocator.innerText();
    logger.info(`Timer changed to: "${secondReading}"`);
  });
});
