import { test as base } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { SearchResultsPage } from '../pages/SearchResultsPage';
import { LotPage } from '../pages/LotPage';

type CatawikiFixtures = {
  homePage: HomePage;
  searchResultsPage: SearchResultsPage;
  lotPage: LotPage;
};

export const test = base.extend<CatawikiFixtures>({
  homePage: async ({ page }, use) => {
    const homePage = new HomePage(page);
    await use(homePage);
  },

  searchResultsPage: async ({ page }, use) => {
    const searchResultsPage = new SearchResultsPage(page);
    await use(searchResultsPage);
  },

  lotPage: async ({ page }, use) => {
    const lotPage = new LotPage(page);
    await use(lotPage);
  },
});

// Cooldown between tests so Akamai CDN doesn't rate-limit us
const COOLDOWN_MS = 3_000;
test.afterEach(async () => {
  await new Promise(resolve => setTimeout(resolve, COOLDOWN_MS));
});

export { expect } from '@playwright/test';
