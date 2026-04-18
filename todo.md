# Admin Dashboard Build — Todo

## Phase 1: Upgrade to Full-Stack
- [x] Run webdev_add_feature for web-db-user
- [x] Review generated schema and server setup

## Phase 2: Database Schema
- [x] Create products table
- [x] Create orders table
- [x] Create order_items table
- [x] Create id_verifications table
- [x] Create email_templates table
- [x] Create shipping_zones table
- [x] Create admin_activity_log table
- [x] Seed initial data (products, shipping zones, email templates)

## Phase 3: Admin Layout & Auth
- [x] Create admin layout with sidebar navigation
- [x] Admin auth guard (check user role)
- [x] Dashboard overview page (stats cards, recent orders, pending verifications)

## Phase 4: Product Management
- [x] Product list with search, filter, pagination
- [x] Add/edit product form (all fields)
- [x] Delete product with confirmation

## Phase 5: Order Management
- [x] Order list with filters (status, date range, search)
- [x] Order detail view (items, customer info, shipping, payment)
- [x] Order status workflow (pending → processing → shipped → delivered / cancelled)
- [x] Add tracking number and order notes

## Phase 6: ID Verification Review
- [x] Pending verifications queue
- [x] Document viewer (front ID, selfie)
- [x] Approve/reject with notes

## Phase 7: Shipping, Email Templates, Notifications
- [x] Shipping zone configuration (edit rates, delivery times)
- [x] Email template editor with preview
- [x] Notification log via admin activity log

## Phase 8: Reporting & Customers
- [x] Revenue summary, order stats, product counts
- [x] Customers page with user list and search
- [x] Vitest tests for all admin routes (10 tests passing)

## Phase 9: Custom Authentication System
- [x] Update users table with phone, birthday, googleId, idVerified fields
- [x] Create verification_codes table for OTP
- [x] Build email OTP send/verify backend routes (FREE via built-in notification)
- [x] Build SMS OTP send/verify backend routes (pluggable, logged for testing)
- [x] Build Google OAuth backend route (placeholder)
- [x] Build registration backend route (name, email, phone mandatory, birthday)
- [x] Build complete-profile route for Google users to add phone
- [x] Build Login page UI (email, phone, Google options)
- [x] Build Register page UI (3-step: info, verify email, done)
- [x] Build Complete Profile page UI (for Google users)
- [x] Build OTP input component (6-digit code entry)
- [x] Add routes to App.tsx (login, register, complete-profile)
- [x] Write vitest tests for auth validation (17 total tests passing)

## Phase 10: SEO Fixes
- [x] Reduce homepage keywords from 10 to 6 focused keywords
- [x] Shorten homepage meta description from 196 to 131 characters


## Phase 11: Wire Storefront to Database
- [ ] Add backend API routes for fetching products with filters/search
- [ ] Add backend API route for creating orders
- [ ] Connect Shop page to fetch products from backend
- [ ] Connect Product page to fetch product details from backend
- [ ] Connect Cart page to use backend cart/order submission
- [ ] Connect Checkout page to submit orders to backend
- [ ] Add order confirmation page
- [ ] Test end-to-end: browse, add to cart, checkout

## Phase 12: Product Image Management
- [ ] Add image upload field to admin Products page
- [ ] Add S3 storage integration for product images
- [ ] Display product images on Shop and Product pages
- [ ] Add image preview in admin Products list
- [ ] Test image upload and display

## Phase 10.5: Fix Critical Authentication Bug
- [x] Add loginEmail backend endpoint to fetch user by email
- [x] Add register backend endpoint to create new user
- [x] Update AuthContext to call backend endpoints instead of using hardcoded DEMO_USER
- [x] Update upsertUser to handle phone and birthday fields
- [x] Write vitest tests for loginEmail and register (5 tests passing)
- [x] Verify Account page displays actual user data (not Alex Thompson)

## Phase 10.6: Fix Registration Flow Bug
- [x] Debug why CREATE ACCOUNT button does nothing when clicked
- [x] Fix root cause: tRPC superjson wire format requires {json: ...} wrapper
- [x] Fix root cause: auth.me auto-login was bypassing register form for Manus OAuth users
- [x] Show error messages on registration and login failures
- [x] Remove demo text from login form
- [x] Verify registration works end-to-end (22 tests passing)

## Phase 10.7: Fix superjson response parsing in AuthContext
- [x] Fix AuthContext to unwrap superjson { json: ... } response format (added unwrapTrpcResponse helper)
- [x] Show specific error messages ("Email already registered") instead of generic fallback
- [x] Fix auth.me useEffect to properly unwrap superjson and skip Manus OAuth users
- [x] Allow email registration when existing user was created via Manus OAuth (upgrade auth method)
- [x] Verified registration works end-to-end: form → backend → account page with correct data

## Phase 10.8: Make Admin Panel Publicly Accessible
- [x] Remove Manus OAuth authentication requirement from admin frontend routes (AdminLayout)
- [x] Change admin backend procedures from adminProcedure to publicProcedure
- [x] Fix ctx.user references to use optional chaining with fallback values
- [x] Test admin panel is accessible without login
- [x] Update admin test to reflect public access
- [x] Republish

## Phase 10.9: Fix ID Verification Not Showing in Admin
- [x] Investigate why customer ID submissions don't appear in admin ID Verification page
- [x] Fix verification submission to persist to database (send files to store.submitVerification endpoint)
- [x] Updated AuthContext submitIdVerification to convert files to base64 and POST to backend
- [x] Updated IDVerification.tsx to pass actual files to the backend
- [x] Build passes, all 22 tests pass
- [x] Republish

## Phase 11: Fix Shop Pages — Add Sample Products for Nationwide Shipping
- [x] Investigated: Shop page fetches from DB via tRPC but DB was empty; fixed productsData.data unwrapping
- [x] Seeded 36 products (6 per category: flower, pre-rolls, edibles, vapes, concentrates, accessories)
- [x] Fixed Shop.tsx to read productsData.data and map DB products to Cart Product type
- [x] Verified all 36 products display correctly on shop page
- [x] Republish

## Phase 12: Update Homepage Verbiage and Email Subscription Field
- [x] Update hero section text with new verbiage about 24/7 dispensary, fair prices, no taxes, free shipping
- [x] Fix email subscription field styling to match orange design from screenshot
- [x] Republish

## Phase 12.1: Fix Hero Text Font Consistency
- [x] Make both hero paragraphs use the same font size and style (both now text-lg md:text-xl font-body)
- [x] Republish

## Phase 12.2: Add "I am under 19 — Exit" to Age Verification Gate
- [x] Add "I am under 19 — Exit" link below the "I AM 19 OR OLDER" button (redirects to google.com)
- [x] Update body text to match reference design
- [x] Updated heading to "WELCOME TO / MY LEGACY" (two lines)
- [x] Republish
