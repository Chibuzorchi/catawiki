import { test, expect } from '../fixtures/base.fixture';
import { LoginPage } from '../pages/LoginPage';
import { logger } from '../utils/helpers';

/**
 * Authenticated Flows — Favourite & Bid State Verification
 *
 * These tests require real credentials and a staging/QA environment.
 * Catawiki's production CDN (Akamai) blocks automated login attempts,
 * so these are designed to run against an environment without bot detection.
 *
 * Setup:
 *   1. Set CATAWIKI_EMAIL and CATAWIKI_PASSWORD in .env
 *   2. Optionally set BASE_URL to point to a staging environment
 *   3. Run: npx playwright test tests/authenticated.spec.ts --project=chromium --headed
 */

const EMAIL = process.env['CATAWIKI_EMAIL'] ?? '';
const PASSWORD = process.env['CATAWIKI_PASSWORD'] ?? '';

test.describe('Authenticated Flows', () => {

  test.skip(!EMAIL || !PASSWORD, 'Skipped — set CATAWIKI_EMAIL and CATAWIKI_PASSWORD to run');

  test('TC-015 | Favourite count increments after login and persists after logout @auth', async ({
    homePage, searchResultsPage, lotPage, page,
  }) => {
    const loginPage = new LoginPage(page);

    // Step 1: Get initial favourite count (unauthenticated)
    await homePage.goto();
    await homePage.search('train');
    await searchResultsPage.waitForResults();
    await searchResultsPage.clickLotAtIndex(1);
    await lotPage.waitForPageLoad();

    const countBefore = await lotPage.getFavouritesCount();
    logger.info(`Favourite count before: ${countBefore}`);

    // Step 2: Sign in
    await loginPage.login(EMAIL, PASSWORD);
    expect(await loginPage.isLoggedIn()).toBe(true);
    logger.info('Login successful');

    // Step 3: Navigate back to the same lot
    await homePage.goto();
    await homePage.search('train');
    await searchResultsPage.waitForResults();
    await searchResultsPage.clickLotAtIndex(1);
    await lotPage.waitForPageLoad();

    // Verify count is the same before clicking
    const countAfterLogin = await lotPage.getFavouritesCount();
    logger.info(`Favourite count after login: ${countAfterLogin}`);

    // Step 4: Click the favourite button
    const favButton = page
      .locator('[data-sentry-component="LotDetailsFavoriteButton"] button[title="favourite"]')
      .first();
    await favButton.click();

    // Step 5: Wait for the count to update — it should increment by 1
    const expectedCount = countAfterLogin + 1;
    await expect(favButton).toHaveAttribute('count', String(expectedCount), { timeout: 10_000 });

    const countAfterFav = await lotPage.getFavouritesCount();
    logger.info(`Favourite count after click: ${countAfterFav}`);
    expect(countAfterFav).toBe(expectedCount);

    // Step 6: Sign out
    await loginPage.signOut();
    logger.info('Signed out');

    // Step 7: Navigate back and verify the count persisted
    await homePage.goto();
    await homePage.search('train');
    await searchResultsPage.waitForResults();
    await searchResultsPage.clickLotAtIndex(1);
    await lotPage.waitForPageLoad();

    const countAfterLogout = await lotPage.getFavouritesCount();
    logger.info(`Favourite count after logout: ${countAfterLogout}`);

    expect(countAfterLogout).toBe(expectedCount);
    logger.info('Favourite persisted after logout');
  });


  test('TC-016 | Placing a bid updates current bid and persists after logout @auth', async ({
    homePage, searchResultsPage, lotPage, page,
  }) => {
    const loginPage = new LoginPage(page);

    // Step 1: Get initial bid amount (unauthenticated)
    await homePage.goto();
    await homePage.search('train');
    await searchResultsPage.waitForResults();
    await searchResultsPage.clickLotAtIndex(1);
    await lotPage.waitForPageLoad();

    const { amount: bidBefore } = await lotPage.getCurrentBid();
    logger.info(`Current bid before: €${bidBefore}`);

    // Step 2: Sign in
    await loginPage.login(EMAIL, PASSWORD);
    expect(await loginPage.isLoggedIn()).toBe(true);
    logger.info('Login successful');

    // Step 3: Navigate back to the lot
    await homePage.goto();
    await homePage.search('train');
    await searchResultsPage.waitForResults();
    await searchResultsPage.clickLotAtIndex(1);
    await lotPage.waitForPageLoad();

    // Step 4: Click the first (minimum) quick bid button
    const quickBidButtons = page.locator('[data-sentry-component="LotQuickBid"] button');
    const firstBidButton = quickBidButtons.first();
    await expect(firstBidButton).toBeVisible();

    const bidButtonText = await firstBidButton.innerText();
    logger.info(`Clicking quick bid: ${bidButtonText.trim()}`);
    await firstBidButton.click();

    // Step 5: Bid confirmation modal appears — verify amount shown
    const confirmationText = page.getByText('One step closer to making it yours');
    await expect(confirmationText).toBeVisible({ timeout: 10_000 });
    logger.info('Bid confirmation modal appeared');

    // Step 6: Click "Place bid" in the confirmation modal
    const confirmBidButton = page
      .locator('[data-sentry-source-file="LotBidConfirmation.tsx"] button')
      .filter({ hasText: 'Place bid' });
    await confirmBidButton.click();

    // Step 7: Verify success message
    const successMessage = page.getByText('Your bid is on top!');
    await expect(successMessage).toBeVisible({ timeout: 10_000 });
    logger.info('Bid placed successfully — "Your bid is on top!"');

    // Step 8: Close the success modal
    const closeButton = page.getByTestId('dialog-header-close-button');
    await closeButton.click();

    // Step 9: Verify the new bid amount is higher
    await lotPage.waitForPageLoad();
    const { amount: bidAfter } = await lotPage.getCurrentBid();
    logger.info(`Current bid after: €${bidAfter}`);
    expect(bidAfter).toBeGreaterThan(bidBefore);

    // Step 10: Sign out
    await loginPage.signOut();
    logger.info('Signed out');

    // Step 11: Navigate back and verify the new bid persisted
    await homePage.goto();
    await homePage.search('train');
    await searchResultsPage.waitForResults();
    await searchResultsPage.clickLotAtIndex(1);
    await lotPage.waitForPageLoad();

    const { amount: bidAfterLogout } = await lotPage.getCurrentBid();
    logger.info(`Current bid after logout: €${bidAfterLogout}`);

    expect(bidAfterLogout).toBe(bidAfter);
    logger.info('Bid persisted after logout');
  });
});
