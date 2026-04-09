# My Legacy Cannabis — Remaining Feature Test Plans
# For use with Playwright Test Agents (Planner/Generator/Healer)

---

## specs/order-state-machine.md

### Order State Machine — Full Lifecycle (PR #75)

**Prerequisites:** Admin account, at least one test order

**Scenario: Valid State Transitions**
1. Navigate to Admin > Orders
2. Find a "Pending Payment" order
3. Verify only valid actions are shown (Confirm Payment, Cancel)
4. Click "Confirm Payment" — order should move to "Processing"
5. Verify "Ship" action now appears but "Confirm Payment" does not
6. Add a tracking number
7. Verify auto-cascade: status → Shipped, reward points awarded, shipped email sent
8. Verify "Cancel" is no longer available on shipped orders

**Scenario: Payment Gate**
1. Try to mark an unpaid order as "Shipped" without confirming payment first
2. System should block this transition with a clear error

**Scenario: Cancel + Refund**
1. Find a paid order
2. Click "Cancel"
3. Verify stock is restored
4. Verify payment status changes to "Refunded"
5. Verify reward points are clawed back

---

## specs/maintenance-mode.md

### Maintenance Mode (PRs #10, #11, #12)

**Prerequisites:** Admin account

**Scenario:**
1. Navigate to Admin > Settings
2. Enable Maintenance Mode
3. Verify a preview of the overlay is shown
4. Open the storefront in a new incognito tab
5. Verify the maintenance overlay appears with logo and location carousel
6. Verify the overlay has the configured maintenance message
7. Verify location cards auto-scroll
8. Disable maintenance mode in admin
9. Verify the storefront loads normally again

---

## specs/id-verification-full.md

### ID Verification — Complete Flow (PRs #6, #9, #56)

**Prerequisites:** User account without ID verification

**Scenario: Manual Verification**
1. Log in as unverified user
2. Navigate to Account — status shows "Not Verified"
3. Click "Verify Now"
4. Upload a test image of ID (front)
5. Verify preview shows the uploaded image
6. Submit verification
7. Status changes to "Pending Review"
8. Switch to admin account
9. Navigate to customer verification panel
10. Find the pending verification
11. Review the submitted image
12. Click "Approve"
13. Switch back to user account
14. Verify status is now "Verified"

**Scenario: AI Auto-Verification (PR #56)**
1. Enable AI verification toggle in admin Settings
2. Upload a clear ID image as a test user
3. System should auto-approve if AI confidence is high
4. Verify status changes to "Verified" without admin intervention

---

## specs/persistent-uploads.md

### Persistent File Store (PR #77)

**Prerequisites:** Admin account

**Scenario:**
1. Upload a new site logo via Admin > Settings
2. Verify logo appears on the storefront
3. Deploy a new version (simulate: the test verifies image accessibility)
4. After deployment, verify the logo still loads (not broken image)
5. Verify product images still load on the shop page
6. All images should have naturalWidth > 0 (not broken)

---

## specs/scrolling-banner.md

### Scrolling Banner Admin (PRs #37, #72)

**Prerequisites:** Admin account

**Scenario:**
1. Navigate to Admin > Settings
2. Find the Banner Messages section
3. Add a new message: "Test Banner Message"
4. Verify live preview shows the new message scrolling
5. Save changes
6. Open storefront — verify the new message appears in the marquee
7. Return to admin, edit the message
8. Save and verify the updated text appears on storefront
9. Delete the test message
10. Verify it no longer appears

---

## specs/gmail-circuit-breaker.md

### Gmail Circuit Breaker (PR #91)

**Prerequisites:** Admin account, health endpoint access

**Scenario:**
1. Call GET /api/health
2. Verify response includes Gmail auth status
3. If Gmail is connected: status should show "connected" or similar
4. If Gmail token is expired: should show warning, NOT flood logs
5. Navigate to Admin > Payments
6. Verify Gmail polling status is visible
7. If disconnected, should show clear "reconnect" guidance
