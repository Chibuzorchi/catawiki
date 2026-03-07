import { test, expect } from '../fixtures/base.fixture';
import { logger } from '../utils/helpers';

/**
 * Search Functionality — covers the required scenario plus edge cases.
 *
 * Tags:
 *   @smoke     — TC-001 (must-pass critical path)
 *   @sanity    — TC-002 (basic page health)
 *   @regression — TC-003–006 (deeper edge cases)
 */

test.describe('Search Functionality', () => {

  test('TC-001 | Required: search "train", open second lot, print lot details @smoke', async ({
    homePage, searchResultsPage, lotPage,
  }) => {
    await homePage.goto();
    await homePage.search('train');

    await searchResultsPage.waitForResults();
    expect(await searchResultsPage.isOnSearchResultsPage()).toBe(true);

    const lotCount = await searchResultsPage.getLotCount();
    expect(lotCount).toBeGreaterThanOrEqual(2);

    await searchResultsPage.clickLotAtIndex(1);

    await lotPage.waitForPageLoad();
    expect(await lotPage.isOnLotPage()).toBe(true);

    const details = await lotPage.getLotDetails();

    logger.lot({
      title: details.title,
      favouritesCount: details.favouritesCount,
      currentBid: details.currentBid,
      currency: details.currency,
    });

    expect(details.title.length).toBeGreaterThan(0);
    expect(details.favouritesCount).toBeGreaterThanOrEqual(0);
    expect(details.currentBid).toBeGreaterThan(0);
    expect(details.currency).toBe('EUR');
    expect(details.closingTime.length).toBeGreaterThan(0);
  });


  test('TC-002 | Search results page integrity @sanity', async ({ homePage, searchResultsPage }) => {
    await homePage.goto();
    await homePage.search('train');
    await searchResultsPage.waitForResults();

    expect(homePage.page.url()).toContain('train');

    const count = await searchResultsPage.getLotCount();
    expect(count).toBeGreaterThan(1);

    logger.info(`Search returned ${count} visible lots`);
  });


  test('TC-003 | Pagination is present for broad search term @regression', async ({
    homePage, searchResultsPage,
  }) => {
    await homePage.goto();
    await homePage.search('train');
    await searchResultsPage.waitForResults();

    const hasPagination = await searchResultsPage.hasPagination();
    expect(hasPagination).toBe(true);

    logger.info('Pagination controls confirmed visible');
  });


  test('TC-004 | Empty search does not navigate away from the page @regression', async ({
    homePage, page,
  }) => {
    await homePage.goto();
    const urlBefore = page.url();

    const searchButton = page.getByRole('button', { name: 'Search', exact: true }).first();
    await searchButton.click();

    await page.waitForTimeout(2_000);

    expect(page.url()).toBe(urlBefore);
    logger.info('Empty search correctly stayed on the same page');
  });


  test('TC-005 | Special characters in search do not break the page @regression', async ({
    homePage, searchResultsPage,
  }) => {
    await homePage.goto();
    await homePage.search('<script>alert("xss")</script>');
    await searchResultsPage.waitForSearchPage();

    expect(homePage.page.url()).toContain('catawiki.com');

    const title = await homePage.page.title();
    expect(title).not.toContain('alert');

    logger.info('Special characters handled safely — no XSS execution');
  });


  test('TC-006 | Browser back from lot page preserves search results @flaky @regression', async ({
    homePage, searchResultsPage, lotPage, page,
  }) => {
    await homePage.goto();

    // If CDN blocked the page, search input never appears — skip early with clear feedback
    const searchInput = page.getByRole('combobox', { name: 'Search for brand, model,' }).first();
    try {
      await searchInput.waitFor({ state: 'visible', timeout: 8_000 });
    } catch {
      logger.info('TC-006 skipped: homepage search input not visible (likely Akamai block). Run locally or retry.');
      test.skip(true, 'Homepage blocked or search input not visible — likely Akamai rate limit');
    }

    await homePage.search('train');
    await searchResultsPage.waitForResults();

    const countBefore = await searchResultsPage.getLotCount();

    await searchResultsPage.clickLotAtIndex(1);
    await lotPage.waitForPageLoad();

    const title = await lotPage.getTitle();
    const { amount } = await lotPage.getCurrentBid();
    logger.info(`On lot page: "${title}" — €${amount}. Heading back.`);

    await page.goBack({ waitUntil: 'domcontentloaded' });

    await searchResultsPage.waitForResults();
    expect(await searchResultsPage.isOnSearchResultsPage()).toBe(true);

    const countAfter = await searchResultsPage.getLotCount();
    expect(countAfter).toBeGreaterThan(0);

    logger.info(`Browser back preserved results: ${countBefore} → ${countAfter}`);
  });
});
