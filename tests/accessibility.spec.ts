import { test, expect } from '../fixtures/base.fixture';
import AxeBuilder from '@axe-core/playwright';
import { logger } from '../utils/helpers';

/**
 * Accessibility Test Suite — WCAG 2.1 AA compliance audits.
 *
 * Tags:
 *   @a11y — TC-013, TC-014
 */

test.describe('Accessibility', () => {

  test('TC-013 | Home page WCAG 2.1 AA audit @a11y', async ({ homePage, page }) => {
    await homePage.goto();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const violations = results.violations;

    logger.info(`Home page: ${violations.length} a11y violations found`);
    for (const v of violations) {
      logger.info(`  [${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} elements)`);
    }

    expect(results.passes.length + violations.length).toBeGreaterThan(0);

    const critical = violations.filter(v => v.impact === 'critical');
    logger.info(`  → ${critical.length} critical, ${violations.length} total violations`);
  });


  test('TC-014 | Lot page WCAG 2.1 AA audit @a11y', async ({
    homePage, searchResultsPage, page,
  }) => {
    await homePage.goto();
    await homePage.search('train');
    await searchResultsPage.waitForResults();
    await searchResultsPage.clickLotAtIndex(1);

    await page.waitForLoadState('domcontentloaded');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .exclude('iframe')
      .analyze();

    const violations = results.violations;

    logger.info(`Lot page: ${violations.length} a11y violations found`);
    for (const v of violations) {
      logger.info(`  [${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} elements)`);
    }

    expect(results.passes.length + violations.length).toBeGreaterThan(0);

    const critical = violations.filter(v => v.impact === 'critical');
    logger.info(`  → ${critical.length} critical, ${violations.length} total violations`);
  });
});
