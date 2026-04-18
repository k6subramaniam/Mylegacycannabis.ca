# My Legacy Cannabis — Automated E2E Test Suite

## Quick Start

```bash
# 1. Install Playwright
npm init playwright@latest
# Select: TypeScript, tests/e2e folder, add GitHub Actions, install browsers

# 2. Copy these files into your repo
# (see File Structure below)

# 3. Configure environment
cp .env.test.example .env.test
# Edit .env.test with your test account credentials

# 4. Run tests locally
npx playwright test                    # all tests
npx playwright test --project=chrome   # desktop only
npx playwright test --project=mobile   # mobile only
npx playwright test --grep @smoke      # smoke tests only
npx playwright test --grep @critical   # critical path only

# 5. Interactive mode (visual debugging)
npx playwright test --ui

# 6. View HTML report
npx playwright show-report
```

## File Structure

```
repo/
├── playwright.config.ts              # Main config — projects, timeouts, browsers
├── .env.test.example                 # Template for test env vars
├── .github/
│   └── workflows/
│       └── e2e.yml                   # CI/CD — runs on every PR and push to main
├── specs/
│   └── test-plans.md                 # AI-readable test plans for Playwright Agents
├── tests/
│   ├── .auth/                        # Auto-generated auth session files (gitignored)
│   │   ├── user.json
│   │   └── admin.json
│   └── e2e/
│       ├── auth.setup.ts             # Auth setup — creates user/admin sessions
│       ├── smoke.smoke.spec.ts       # Production smoke tests (no auth, read-only)
│       ├── auth.spec.ts              # Login, registration, OAuth, session tests
│       ├── shop.spec.ts              # Product browsing, Quick View, cart, images
│       ├── checkout.spec.ts          # e-Transfer checkout, unique cents, acknowledgment
│       ├── admin.spec.ts             # Admin dashboard, geo-analytics, orders
│       ├── api.spec.ts               # Backend API endpoint validation
│       └── a11y-perf.spec.ts         # Accessibility + performance checks
```

## Test Coverage Summary

| File | Tests | What It Covers |
|------|-------|----------------|
| `smoke.smoke.spec.ts` | 10 | Homepage, shop, login, APIs, SEO, performance, console errors |
| `auth.spec.ts` | 9 | Email OTP, Google OAuth, session guards, registration, age check |
| `shop.spec.ts` | 9 | Product grid, detail page, Quick View, image carousel, cart, featured |
| `checkout.spec.ts` | 5 | e-Transfer flow, unique cents, acknowledgment checkbox, cart persistence |
| `admin.spec.ts` | 9 | Insights tabs, geo KPIs, province map, city table, period selector, orders |
| `api.spec.ts` | 9 | Auth endpoints, geo endpoint, FreeIPAPI, rate limiting, PIPEDA compliance |
| `a11y-perf.spec.ts` | 8 | Alt text, keyboard nav, focus styles, labels, performance, JS errors |
| **Total** | **59** | |

## Tags for Selective Execution

```bash
npx playwright test --grep @smoke       # 10 tests — 2 min — run after every deploy
npx playwright test --grep @critical    # 23 tests — 5 min — run on every PR
npx playwright test --grep @admin       # 9 tests — admin dashboard only
npx playwright test --grep @auth        # 9 tests — authentication only
npx playwright test --grep @checkout    # 5 tests — payment flow only
npx playwright test --grep @api         # 9 tests — backend validation only
npx playwright test --grep @a11y        # 5 tests — accessibility only
npx playwright test --grep @performance # 4 tests — speed checks only
npx playwright test                     # 59 tests — full suite — ~15 min
```

## CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/e2e.yml`) runs automatically:

1. **On every PR to main:**
   - Smoke tests run first (fast gate)
   - If smoke passes, full E2E suite runs in parallel (Chrome + Mobile)
   - Test reports uploaded as artifacts

2. **On push to main:**
   - Same pipeline — validates the deploy

3. **Manual trigger:**
   - Go to Actions → E2E Tests → Run workflow
   - Optionally specify a custom URL and test filter

### GitHub Secrets Required

Add these in: **Settings → Secrets and variables → Actions**

| Secret | Description |
|--------|-------------|
| `TEST_USER_EMAIL` | Email for the test user account |
| `TEST_USER_OTP` | Fixed OTP for the test user (set in server config for test env) |
| `TEST_ADMIN_EMAIL` | Email for the test admin account |
| `TEST_ADMIN_OTP` | Fixed OTP for the test admin |

## AI-Powered Testing with Playwright Agents

### Setup

```bash
# Generate agent definitions
npx playwright init-agents
```

### Usage with Claude Code

```
# Ask Claude Code to explore your app and write tests:
@planner explore the app at https://mylegacycannabisca-production.up.railway.app
and create a test plan for the checkout flow

# Generate executable tests from a plan:
@generator create tests from specs/test-plans.md focusing on the e-Transfer checkout section

# Fix broken tests automatically:
@healer run the test suite and fix any failing tests
```

### Usage with GitHub Copilot

Same commands work in the VS Code Copilot chat when the Playwright extension is installed.

### Self-Healing Tests

When your UI changes break tests, the Healer agent:
1. Runs the failing test
2. Takes a browser snapshot
3. Identifies what changed (selector, layout, new element)
4. Generates a fix
5. Re-runs to verify

This reduces test maintenance from hours to seconds.

## Test Accounts Setup

Create dedicated test accounts on your platform:

1. **Test User:**
   - Register with `testuser@mylegacycannabis.ca` (or your chosen email)
   - Complete ID verification
   - Set a known fixed OTP in your server for this email in test/dev mode

2. **Test Admin:**
   - Register with `admin@mylegacycannabis.ca`
   - Grant admin role in the database
   - Set a known fixed OTP

### Server-Side: Test OTP Bypass (optional, dev only)

Add to your auth route for easier test automation:

```typescript
// ONLY in development/test — never in production
if (process.env.NODE_ENV !== 'production' && process.env.TEST_OTP_BYPASS === 'true') {
  app.post('/api/auth/test-otp', async (req, res) => {
    const { email } = req.body;
    // Return the current OTP for this email (from your OTP store)
    const otp = await getActiveOTP(email);
    res.json({ code: otp || '123456' });
  });
}
```

## Running Against Production vs. Local

| Environment | Command | Auth |
|-------------|---------|------|
| Local dev | `npx playwright test` | Uses `webServer` auto-start |
| Production smoke | `npx playwright test --project=production-smoke` | No auth needed |
| Production full | `TEST_BASE_URL=https://...railway.app npx playwright test` | Needs test accounts |

## Troubleshooting

### Tests timeout on Railway
Railway cold starts can take 10-20 seconds. Increase `navigationTimeout` in config to 30_000.

### Auth setup fails
Ensure test user exists and the OTP is correct. Check Railway logs for auth errors.

### Flaky tests
Run with traces: `npx playwright test --trace on`
Then view: `npx playwright show-trace test-results/*/trace.zip`

### Codegen for new tests
Record actions and auto-generate test code:
```bash
npx playwright codegen https://mylegacycannabisca-production.up.railway.app
```

## Cost

**$0.** Everything is open source:
- Playwright: MIT license, free
- GitHub Actions: 2,000 free minutes/month on public repos
- AI Agents: Work with Claude Code / GitHub Copilot (your existing tools)
- No BrowserStack, Sauce Labs, or paid services needed
