# Catawiki QA Automation — Home Assignment

**[Allure Report (latest run)](https://chibuzorchi.github.io/catawiki/)**

Playwright + TypeScript automation suite for Catawiki's auction platform.

## Tech Stack

| Tool | Purpose |
|------|---------|
| Playwright | E2E, network interception, and accessibility testing |
| TypeScript (strict) | Type safety across all test and page code |
| axe-core | WCAG 2.1 AA accessibility auditing |
| dotenv | Environment-based configuration |
| Allure | Test reporting (results published to GitHub Pages) |
| GitHub Actions | CI/CD pipeline + scheduled daily runs |

## Project Structure

```
catawiki-automation/
├── tests/
│   ├── search.spec.ts         # TC-001–006: Search flow + edge cases
│   ├── lot-page.spec.ts       # TC-007–010: Lot page structure + live auction
│   ├── api.spec.ts            # TC-008–012: API interception + UI↔API validation
│   ├── accessibility.spec.ts  # TC-013–014: WCAG 2.1 AA compliance audit
│   └── authenticated.spec.ts  # TC-015–016: Login → favourite + bid (staging only)
├── pages/
│   ├── HomePage.ts            # Page Object: home page + search
│   ├── SearchResultsPage.ts   # Page Object: lot grid + navigation
│   ├── LotPage.ts             # Page Object: lot detail + bid section
│   └── LoginPage.ts           # Page Object: authentication + sign out
├── fixtures/
│   └── base.fixture.ts        # Custom Playwright fixtures + CDN cooldown
├── types/
│   └── catawiki.types.ts      # Domain types (BatchLot, SellerLot, BidsApiResponse, etc.)
├── utils/
│   └── helpers.ts             # Currency parser, logger, cookie handler
├── .github/workflows/
│   └── playwright.yml         # CI (push/PR + daily schedule), Allure publish
├── .env.example                # Environment configuration template
└── playwright.config.ts        # Multi-browser config with dotenv
```

## Test Cases

| ID | Area | What it tests |
|----|------|----------------|
| TC-001 | Search | **Required scenario**: search "train", click second lot, print title / favourites / bid |
| TC-002 | Search | Results page opens with multiple lots for "train" |
| TC-003 | Search | Pagination is present for broad search terms |
| TC-004 | Search | Empty search (no input) does not navigate away |
| TC-005 | Search | Special characters / XSS in search do not break the page |
| TC-006 | Search | Browser back from lot page preserves search results |
| TC-007 | Lot Page | All critical UI elements are present and visible |
| TC-008 | Lot Page | Place bid + Set max bid buttons are enabled |
| TC-009 | Lot Page | Suggested bid amounts are numeric and strictly ascending |
| TC-010 | Lot Page | Closing timer decrements — confirms live auction behaviour |
| TC-008 | API | Lot bids API returns valid response for the displayed lot (network interception) |
| TC-009 | API | UI title matches the lot data served by the API |
| TC-010 | API | UI current bid matches bids API for the same lot |
| TC-011 | API | Batch lots API schema validation — fields from `/v1/lots?ids=` |
| TC-012 | API | Seller lots API fires on lot page with valid structure |
| TC-013 | Accessibility | Home page WCAG 2.1 AA audit with violation report |
| TC-014 | Accessibility | Lot page WCAG 2.1 AA audit with violation report |
| TC-015 | Authenticated | Favourite count increments after login and persists after logout |
| TC-016 | Authenticated | Placing a bid updates current price and persists after logout |

## Setup

```bash
# Install dependencies
npm install

# Install browsers
npx playwright install

# Copy environment config
cp .env.example .env
# Edit .env with your BASE_URL and (optionally) credentials
```

## Running Tests

```bash
# Default: Firefox headless (avoids CDN issues)
npm run test:smoke

# By tag
npm run test:smoke      # @smoke only
npm run test:sanity     # @smoke + @sanity
npm run test:regression # @smoke + @sanity + @regression
npm run test:a11y       # @a11y
npm run test:auth       # @auth (needs .env credentials)

# By suite
npm run test:search
npm run test:lot
npm run test:api
npm run test:a11y

# Chromium headed (for local demos — headless often blocked by CDN)
npx playwright test --project=chromium --headed

# API tests only
npx playwright test tests/api.spec.ts --project=firefox

# Flaky tests only (e.g. TC-006 — browser back; skipped in CI due to Akamai)
npx playwright test --grep @flaky

# Interactive UI mode
npm run test:ui

# View last HTML report
npm run test:report

# Allure (generate + open)
npm run allure:generate && npm run allure:open
```

## Environment Configuration

```bash
# .env
BASE_URL=https://www.catawiki.com       # or staging URL
CATAWIKI_EMAIL=you@example.com          # for TC-015/016
CATAWIKI_PASSWORD=your_password         # for TC-015/016
```

## Design Decisions

**Page Object Model** — All selectors live in page classes, never in test files. When Catawiki updates a selector, one file changes.

**Real selectors from live DOM inspection** — Every selector was verified against the live site's actual DOM. Priority: `getByRole()` / `getByLabel()` → `data-testid` → `data-sentry-component` → semantic CSS.

**Custom Playwright fixtures** — Page objects are injected via `test.extend()`, avoiding manual instantiation in every test.

**CDN-aware execution** — Tests run with 1 worker and a 3-second cooldown between tests to avoid Akamai rate limiting. CI uses Firefox headless; Chromium headless is often blocked.

**API validation via network interception** — Catawiki's API rejects direct (e.g. curl) requests. Tests use `page.on('response')` to capture real browser calls: `/buyer/api/v3/lots/{id}/bids`, `/buyer/api/v1/lots?ids=`, `/buyer/api/v1/sellers/lots`. No mocking; we assert on the same responses that drive the UI. The second search result is dynamic (lots rotate), so tests use the lot ID from the URL after navigation and tolerate lots with no bids or different shapes.

**Shared domain types** — `types/catawiki.types.ts` defines `BatchLot`, `SellerLot`, `BidsApiResponse`, etc., aligned with observed API payloads.

**No hardcoded values** — Bid amounts, titles, and timers are asserted on shape (numeric, non-empty, ascending), not exact values. Live auctions change constantly.

**Negative test coverage** — Empty searches, XSS payloads, and browser back navigation test resilience beyond happy paths.

**Accessibility auditing** — axe-core scans for WCAG 2.1 AA. Violations are logged with severity and element count for triage.

**Authenticated flows (staging-ready)** — TC-015/016 test favourite and bid state through login → action → logout → verify. Intended for QA environments without CDN bot detection.

**No `waitForTimeout` in assertions** — Waits use Playwright's auto-retry assertions or explicit visibility checks; fixed delays are used only where needed (e.g. waiting for network after navigation).

**CI/CD** — GitHub Actions runs on push/PR and on a daily schedule. Allure results are merged and published to [GitHub Pages](https://chibuzorchi.github.io/catawiki/). HTML reports and artifacts are uploaded on failure.
