# My Legacy Cannabis — AI-Generated Test Plans

# Use with Playwright Test Agents: npx playwright init-agents

# Then ask Claude Code or GitHub Copilot: "@planner explore specs/checkout-flow.md"

---

## specs/full-checkout-etransfer.md

### e-Transfer Checkout — Complete Happy Path

**Prerequisites:**

- User is logged in and ID-verified
- Shop has products in stock

**Scenario:**

1. Navigate to /shop
2. Browse available products
3. Click on any product to view details
4. Select quantity of 1
5. Click "Add to Cart"
6. Navigate to cart/checkout
7. Verify cart shows the selected product with correct price
8. Select "Interac e-Transfer" as payment method
9. Verify payment instructions appear with a specific dollar-and-cents amount
10. Verify the amount does NOT end in .00 (unique cent matching)
11. Verify a mandatory acknowledgment checkbox is visible
12. Check the acknowledgment checkbox
13. Click "Place Order"
14. Verify order confirmation page appears
15. Verify confirmation shows the exact e-Transfer amount
16. Verify confirmation shows the order number in memo instructions
17. Navigate to /account → Orders tab
18. Verify the new order appears with "Pending Payment" status

**Expected Outcomes:**

- Order is created with status "Pending Payment"
- The displayed amount has unique cents (not .00)
- Payment instructions include the exact amount and order number
- Order appears in the user's account immediately

---

## specs/google-oauth-flow.md

### Google OAuth Login — Session Handling

**Prerequisites:**

- Google OAuth is enabled on the platform
- A Google test account is available

**Scenario:**

1. Navigate to /login
2. Click "Sign In with Google"
3. Complete Google OAuth flow (select account, authorize)
4. Verify redirect to /account (NOT back to /login)
5. Verify no "flash" of login page after the redirect
6. Verify the Account page shows the user's name from Google
7. If the user is new (no phone), verify redirect to /complete-profile
8. On /complete-profile, enter a phone number
9. Click "Complete Setup"
10. Verify redirect to /account with full profile visible

**Edge Case — Network Interruption:**

1. Log in successfully via Google OAuth
2. Simulate a network blip (go offline briefly)
3. Come back online
4. Verify the user is still logged in (NOT kicked to /login)

**Expected Outcomes:**

- Google OAuth redirect chain completes without landing on /login
- Session is preserved across network interruptions
- New Google users are prompted for phone before accessing account

---

## specs/admin-geo-analytics.md

### Admin Geo-Analytics Dashboard

**Prerequisites:**

- User is logged in as admin
- Some behavioral analytics data exists (page views from different cities)

**Scenario:**

1. Navigate to /admin
2. Click on "Insights" section
3. Click the "Geo-Analytics" tab
4. Verify KPI cards render: Total Events, Cities Reached, Active Provinces, Proxy/VPN rate
5. Verify the province map/visualization shows data
6. Click on a province in the map (e.g., Ontario)
7. Verify the city table filters to show only cities in that province
8. Click "Clear filter" to reset
9. Change the period selector from 30d to 7d
10. Verify data refreshes (loading state, then updated numbers)
11. Switch to 90d period
12. Verify data refreshes again
13. In the Daily Trend section, click "Visitors" metric toggle
14. Verify the chart updates to show visitor data
15. Click "Orders" metric toggle
16. Verify the chart updates to show order data
17. Scroll to Category Preferences by Province
18. Verify it shows product categories with horizontal bars

**Expected Outcomes:**

- All sections render without errors
- Period selector changes data across all sections
- Province filter cross-filters the city table
- Metric toggles update the trend chart

---

## specs/rewards-program.md

### Rewards Program — Points & Referrals

**Prerequisites:**

- User is logged in with an existing account

**Scenario:**

1. Navigate to /account
2. Click "My Rewards" tab
3. Verify points balance is displayed
4. Verify the referral code is visible
5. Click the copy button next to the referral code
6. Verify the code is copied (toast notification or clipboard)
7. Click the share button (if available)
8. Verify sharing options appear

**Expected Outcomes:**

- Points balance is a non-negative number
- Referral code is a string that can be copied
- The rewards section explains earning rates

---

## specs/id-verification.md

### ID Verification Upload Flow

**Prerequisites:**

- User is logged in but NOT yet ID-verified

**Scenario:**

1. Navigate to /account
2. Verify "Not Verified" status is shown
3. Click "Verify Now"
4. Verify the ID upload page loads
5. Upload a test image (front of ID)
6. Verify the image preview appears
7. Submit the verification
8. Verify status changes to "Pending Review"
9. Navigate back to /account
10. Verify the ID Verification section shows "Pending Review"

**Expected Outcomes:**

- Image upload works (file input accepts JPG/PNG)
- Status transitions correctly
- User cannot place orders until verified (if ID verification is enabled)

---

## specs/mobile-experience.md

### Mobile Shopping Experience (Galaxy S25 Ultra)

**Device:** Samsung Galaxy S25 Ultra (412x915 viewport, touch enabled)

**Scenario:**

1. Navigate to / on mobile viewport
2. Verify the hamburger menu is visible (not desktop nav)
3. Tap the hamburger menu
4. Verify navigation drawer opens with links
5. Tap "Shop"
6. Verify product grid is single-column or 2-column on mobile
7. Tap on a product
8. Verify product page is full-width on mobile
9. Verify "Add to Cart" button is easily tappable (min 44px height)
10. Swipe left on image carousel (if present)
11. Verify image advances
12. Navigate to /login on mobile
13. Verify OTP input boxes are large enough for thumb typing
14. Verify keyboard appears when tapping email input

**Expected Outcomes:**

- All interactions are touch-friendly (44px minimum tap targets)
- No horizontal scrolling on any page
- Text is readable without zooming
- Images scale to viewport width
