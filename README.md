# Catawiki QA Automation — Home Assignment

Playwright + TypeScript automation suite for Catawiki's auction platform.

## Tech Stack

| Tool | Purpose |
|---|---|
| Playwright | E2E, API interception, and accessibility testing |
| TypeScript (strict) | Type safety across all test and page code |
| axe-core | WCAG 2.1 AA accessibility auditing |
| dotenv | Environment-based configuration |
| GitHub Actions | CI/CD pipeline |

## Project Structure

```
catawiki-automation/
├── tests/
│   ├── search.spec.ts         # TC-001–006: Search flow + edge cases
│   ├── lot-page.spec.ts       # TC-007–010: Lot page structure + live auction
│   ├── api.spec.ts            # TC-011–012: API interception + UI↔API bid integrity
│   ├── accessibility.spec.ts  # TC-013–014: WCAG 2.1 AA compliance audit
│   └── authenticated.spec.ts  # TC-015–016: Login → favourite + bid state (staging only)
├── pages/
│   ├── HomePage.ts            # Page Object: home page + search
│   ├── SearchResultsPage.ts   # Page Object: lot grid + navigation
│   ├── LotPage.ts             # Page Object: lot detail + bid section
│   └── LoginPage.ts           # Page Object: authentication + sign out
├── fixtures/
│   └── base.fixture.ts        # Custom Playwright fixtures + CDN cooldown
├── types/
│   └── catawiki.types.ts      # Shared domain types
├── utils/
│   └── helpers.ts             # Currency parser, logger, cookie handler
├── .github/workflows/
│   └── playwright.yml         # CI pipeline (push + PR)
├── .env.example               # Environment configuration template
└── playwright.config.ts       # Multi-browser config with dotenv
```

## Test Cases

| ID | Area | What it tests |
|---|---|---|
| TC-001 | Search | **Required scenario**: search "train", click second lot, print title / favourites / bid |
| TC-002 | Search | Results page opens with multiple lots for "train" |
| TC-003 | Search | Pagination is present for broad search terms |
| TC-004 | Search | Empty search (no input) does not navigate away |
| TC-005 | Search | Special characters / XSS in search do not break the page |
| TC-006 | Search | "Back to search" link returns to results with lots intact |
| TC-007 | Lot Page | All critical UI elements are present and visible |
| TC-008 | Lot Page | Place bid + Set max bid buttons are enabled |
| TC-009 | Lot Page | Suggested bid amounts are numeric and strictly ascending |
| TC-010 | Lot Page | Closing timer decrements — confirms live auction behaviour |
| TC-011 | API | Bid API response structure validated via network interception |
| TC-012 | API | UI current bid matches API's highest bid (cross-layer integrity) |
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
# Core tests — headed, single browser
npx playwright test --project=chromium --headed

# Just the required scenario (TC-001)
npx playwright test tests/search.spec.ts -g "TC-001" --project=chromium --headed

# By suite
npm run test:search
npm run test:lot
npm run test:api
npm run test:a11y

# Authenticated tests (requires CATAWIKI_EMAIL + CATAWIKI_PASSWORD in .env)
npm run test:auth -- --project=chromium --headed

# Interactive UI mode
npm run test:ui

# View last HTML report
npm run test:report
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

**Real selectors from live DOM inspection** — Every selector was verified against the live site's actual DOM. Priority: `getByRole()` / `getByLabel()` → `data-testid` → `data-sentry-component` → semantic CSS. No guessed `data-testid` values.

**Custom Playwright fixtures** — Page objects are injected via `test.extend()`, avoiding manual instantiation in every test.

**CDN-aware sequential execution** — Tests run with 1 worker and a 3-second cooldown between tests to avoid Akamai rate limiting on the production site.

**API validation via network interception** — Catawiki's API rejects non-browser requests. Tests intercept the real `/buyer/api/v3/lots/{id}/bids` calls the browser makes and validate bid structure + UI↔API data integrity.

**No hardcoded values** — Bid amounts, titles, and timers are asserted on shape (numeric, non-empty, ascending), not exact values. Live auctions change constantly.

**Negative test coverage** — Empty searches, XSS payloads, and back navigation test the app's resilience beyond happy paths.

**Accessibility auditing** — axe-core scans for WCAG 2.1 AA. Violations are logged with severity and element count for triage.

**Authenticated flows (staging-ready)** — TC-015/016 test favourite and bid state changes through a full login → action → logout → verify cycle. Designed for QA environments without CDN bot detection.

**No `waitForTimeout`** — All waits use Playwright's auto-retry assertions or explicit element visibility checks.

**CI/CD** — GitHub Actions runs on every push and PR. Failures upload HTML reports and test artifacts.
