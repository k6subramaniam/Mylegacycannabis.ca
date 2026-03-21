# My Legacy Cannabis — Solution Architecture & Hosting Document

**Document Version:** 1.0  
**Date:** March 21, 2026  
**Repository:** https://github.com/k6subramaniam/Mylegacycannabis.ca  
**Production Host:** Railway  

---

## Table of Contents

1. [Solution Overview](#1-solution-overview)
2. [Tech Stack](#2-tech-stack)
3. [Application Architecture](#3-application-architecture)
4. [Directory Structure](#4-directory-structure)
5. [Database Schema](#5-database-schema)
6. [Authentication & Security](#6-authentication--security)
7. [External Services & Integrations](#7-external-services--integrations)
8. [Production Hosting — Railway](#8-production-hosting--railway)
9. [Environment Variables](#9-environment-variables)
10. [Build & Deployment Pipeline](#10-build--deployment-pipeline)
11. [OpEx Cost Summary (4,000 orders/month)](#11-opex-cost-summary-4000-ordersmonth)

---

## 1. Solution Overview

My Legacy Cannabis is a **full-stack e-commerce web application** for a 24/7 cannabis dispensary serving the GTA and Ottawa regions of Ontario, Canada. It provides:

- A public-facing storefront (product catalogue, shopping cart, checkout)
- OTP-based customer registration with a 19+ age gate
- ID verification upload flow for new customers
- A loyalty rewards programme
- A complete admin panel (orders, products, customers, verifications, shipping, reports, email templates)

The application is a **monolithic Node.js application** — the client-side React SPA and the Express API server are built together and served from a single Railway service, keeping infrastructure simple and operational overhead minimal.

---

## 2. Tech Stack

### Frontend

| Layer | Technology | Version |
|---|---|---|
| UI Framework | React | 19.2 |
| Language | TypeScript | 5.9 |
| Client-side Router | Wouter | 3.3 |
| Styling | Tailwind CSS | 4.1 |
| Component Library | Radix UI | (full suite) |
| Icons | Lucide React | 0.453 |
| Animations | Framer Motion | 12 |
| Form Management | React Hook Form + Zod | 7.x / 4.x |
| Data Fetching | TanStack React Query (via tRPC) | 5.x |
| Toast Notifications | Sonner | 2.x |
| Charts | Recharts | 2.x |
| Carousel | Embla Carousel | 8.x |
| OTP Input | input-otp | 1.x |

### Backend

| Layer | Technology | Version |
|---|---|---|
| Runtime | Node.js (ESM) | 20+ |
| HTTP Server | Express | 4.21 |
| Language | TypeScript | 5.9 |
| API Layer | tRPC | 11.6 |
| Auth / Sessions | Custom OTP + JOSE (JWT) | 6.x |
| Session Transport | HTTP-only cookies | — |

### Data

| Layer | Technology | Notes |
|---|---|---|
| ORM | Drizzle ORM | 0.44 |
| Production Database | MySQL 2 | Hosted on Railway |
| Local / Sandbox DB | In-memory store (`server/db.ts`) | No DB required locally |
| File Storage | AWS S3-compatible API | Falls back to base64 data URLs |

### Build & Tooling

| Tool | Purpose |
|---|---|
| Vite 7 | Client bundler (dev + production SPA build) |
| esbuild | Server bundler (compiles TypeScript → ESM) |
| pnpm 10 | Package manager |
| tsx | TypeScript runner for development |
| Vitest | Unit / integration testing |
| Prettier | Code formatting |
| drizzle-kit | DB schema generation & migration |

---

## 3. Application Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser / Mobile                      │
│                   React 19 SPA (Vite build)                  │
│  wouter routing │ tRPC client │ React Query │ Tailwind CSS   │
└──────────────────────────┬──────────────────────────────────┘
                           │  HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  Railway — Single Service                    │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐  │
│   │              Node.js / Express Server               │  │
│   │                                                     │  │
│   │  /api/auth/*     Custom OTP Auth (customAuth.ts)    │  │
│   │  /api/oauth/*    Google OAuth callback              │  │
│   │  /api/trpc/*     tRPC router (all admin + store)    │  │
│   │  /*              Serves React SPA (dist/public)     │  │
│   └────────────────────────┬────────────────────────────┘  │
│                            │                                │
│   ┌────────────────────────▼────────────────────────────┐  │
│   │              MySQL Database (Railway)               │  │
│   │  users │ orders │ products │ id_verifications        │  │
│   │  shipping_zones │ email_templates │ rewards_history  │  │
│   └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           │
          ┌────────────────┼─────────────────┐
          ▼                ▼                 ▼
   ┌─────────────┐  ┌───────────┐  ┌──────────────┐
   │  Twilio SMS │  │ S3 / R2   │  │ Google OAuth │
   │  OTP codes  │  │ ID Photos │  │ Social Login │
   └─────────────┘  └───────────┘  └──────────────┘
```

### Request Flow

1. Browser requests a page → Express serves `dist/public/index.html`
2. React SPA boots, reads route, fetches data via tRPC over `/api/trpc`
3. tRPC procedures call `server/db.ts` functions (which wrap Drizzle ORM → MySQL)
4. Auth-protected procedures check the session cookie via `server/_core/context.ts`
5. Files (ID photos) are base64-encoded by the client and POSTed to the tRPC `upload` mutation → stored in S3/R2 (or as data URLs if storage is unconfigured)

---

## 4. Directory Structure

```
mylegacycannabis/
│
├── client/                        # React SPA
│   └── src/
│       ├── pages/                 # Route-level components
│       │   ├── Home.tsx
│       │   ├── Shop.tsx
│       │   ├── ProductPage.tsx
│       │   ├── Cart.tsx
│       │   ├── Checkout.tsx
│       │   ├── Register.tsx       # OTP registration + 19+ age gate
│       │   ├── Login.tsx
│       │   ├── Account.tsx        # Customer profile, orders, rewards
│       │   ├── IDVerification.tsx # ID photo upload flow
│       │   ├── Rewards.tsx
│       │   ├── Locations.tsx
│       │   ├── About.tsx
│       │   ├── Contact.tsx
│       │   ├── FAQ.tsx
│       │   ├── Terms.tsx
│       │   ├── PrivacyPolicy.tsx
│       │   ├── ShippingPolicy.tsx
│       │   └── admin/             # Admin panel pages
│       │       ├── Dashboard.tsx
│       │       ├── Orders.tsx
│       │       ├── Products.tsx
│       │       ├── Customers.tsx  # Full CRUD: edit, lock, delete, points
│       │       ├── Verifications.tsx
│       │       ├── Shipping.tsx
│       │       ├── Reports.tsx    # Analytics, charts, top products
│       │       └── EmailTemplates.tsx
│       ├── components/
│       │   ├── Layout.tsx         # Header, footer, mobile bottom nav
│       │   ├── AdminLayout.tsx    # Admin sidebar layout
│       │   ├── SEOHead.tsx
│       │   ├── LoginDialog.tsx
│       │   └── ui/                # Radix UI component wrappers
│       ├── contexts/
│       │   ├── AuthContext.tsx    # Auth state, OTP login/register
│       │   ├── CartContext.tsx    # Cart state (localStorage)
│       │   └── ThemeContext.tsx
│       └── lib/
│           └── trpc.ts            # tRPC client setup
│
├── server/                        # Express + tRPC backend
│   ├── _core/
│   │   ├── index.ts               # Server entry point
│   │   ├── context.ts             # tRPC context (session / user)
│   │   ├── env.ts                 # Typed environment config
│   │   ├── sdk.ts                 # Session auth SDK
│   │   ├── oauth.ts               # Google OAuth callback handler
│   │   ├── notification.ts        # Owner notification service
│   │   ├── vite.ts                # Vite dev + static file serving
│   │   └── trpc.ts                # tRPC factory (publicProcedure, adminProcedure)
│   ├── routers.ts                 # All tRPC routers (admin, store, auth)
│   ├── customAuth.ts              # OTP send/verify, Google login, age gate
│   ├── db.ts                      # In-memory DB (sandbox) + Drizzle wrappers
│   ├── emailService.ts            # OTP email + SMS (Twilio) delivery
│   └── storage.ts                 # S3-compatible file upload/download
│
├── drizzle/
│   ├── schema.ts                  # MySQL table definitions (source of truth)
│   └── *.sql                      # Generated migration files
│
├── shared/
│   ├── types.ts                   # Shared TypeScript types (client + server)
│   └── const.ts                   # Shared constants
│
├── dist/                          # Production build output
│   ├── index.js                   # Bundled Express server (~91 KB)
│   └── public/                    # Bundled React SPA (served as static files)
│       ├── index.html
│       └── assets/                # Hashed JS/CSS chunks
│
├── .env                           # Environment variables (not committed)
├── vite.config.ts                 # Vite build configuration
├── tsconfig.json                  # TypeScript configuration
├── drizzle.config.ts              # Drizzle ORM configuration
├── package.json                   # Dependencies and scripts
└── pnpm-lock.yaml                 # Lockfile
```

---

## 5. Database Schema

All tables are defined in `drizzle/schema.ts` with MySQL dialect via Drizzle ORM.

| Table | Key Columns | Purpose |
|---|---|---|
| `users` | `openId`, `name`, `email`, `phone`, `role`, `birthday`, `rewardPoints`, `idVerified`, `isLocked` | All customer and admin accounts |
| `verification_codes` | `identifier`, `code`, `type` (email/sms), `purpose`, `expiresAt`, `verified` | OTP tokens for login/register |
| `products` | `slug`, `name`, `category`, `price`, `thcContent`, `stock`, `isActive`, `isFeatured` | Product catalogue |
| `orders` | `orderNumber`, `userId`, `status`, `paymentStatus`, `total`, `guestEmail`, `shippingAddress`, `trackingNumber` | All customer orders |
| `order_items` | `orderId`, `productId`, `productName`, `price`, `quantity` | Line items per order |
| `id_verifications` | `userId`, `frontImageUrl`, `selfieImageUrl`, `idType`, `status` (pending/approved/rejected) | Customer identity documents |
| `shipping_zones` | `province`, `rate`, `freeThreshold`, `deliveryDays`, `isActive` | Province-based shipping rates |
| `email_templates` | `slug`, `subject`, `htmlBody`, `isActive` | Transactional email templates |
| `admin_activity_log` | `adminId`, `action`, `entityType`, `entityId`, `details` | Full audit trail of admin actions |
| `rewards_history` | `userId`, `points`, `type`, `description` | Per-user points ledger |

---

## 6. Authentication & Security

### OTP Flow

```
Register / Login
      │
      ▼
Enter email or phone
      │
      ▼
POST /api/auth/send-otp
  → generates 6-digit code
  → stores in verification_codes (10 min TTL)
  → sends via email (Forge API) or SMS (Twilio)
      │
      ▼
Enter 6-digit code
      │
      ▼
POST /api/auth/verify-otp
  → validates code + expiry
  → for register: checks 19+ age gate (server-side)
  → creates/finds user in DB
  → sets HTTP-only JWT session cookie
      │
      ▼
Authenticated ✓
```

### Security Features

| Feature | Implementation |
|---|---|
| **19+ Age Gate** | Triple-layer: client `onBlur`, pre-submit JS check, and server-side enforcement on `/api/auth/verify-otp` |
| **Session Cookies** | HTTP-only, signed JWT via `jose` library (`JWT_SECRET` env var) |
| **Account Locking** | `isLocked` flag on user; checked at OTP verify + every authenticated request |
| **Admin Protection** | `adminProcedure` tRPC middleware checks `user.role === 'admin'` on every admin route |
| **ID Verification** | Customers upload front ID + optional selfie; admin must approve before full access |
| **Password-free** | No passwords stored — all auth is OTP-based or Google OAuth |
| **Date Parsing** | UTC-safe birthday parsing (`split('-')`) to prevent timezone-boundary age miscalculation |

---

## 7. External Services & Integrations

| Service | Usage | Required? | Config Keys |
|---|---|---|---|
| **Twilio** | SMS OTP delivery | Optional (email fallback available) | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` |
| **Forge API** | OTP email delivery + owner push notifications | Optional (OTPs logged to console if unset) | `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY` |
| **Google OAuth** | Social sign-in | Optional | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| **AWS S3 / Cloudflare R2** | ID verification photo storage | Optional (base64 data URLs used as fallback) | `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY` |
| **MySQL** | Production database | Required in production | `DATABASE_URL` |
| **Railway** | Hosting, deployment, managed MySQL | Required | `PORT` (set automatically) |

---

## 8. Production Hosting — Railway

### Platform

[Railway](https://railway.com) is the production hosting platform. It provides:
- **Auto-deploy** on every push to the `main` branch
- **Managed MySQL** database service
- **Custom domain** support with automatic TLS (Let's Encrypt)
- **Usage-based billing** — pay only for RAM, CPU, storage, and egress consumed

### Services Deployed

```
Railway Project: mylegacycannabis
│
├── Service: Web App
│   ├── Source: GitHub → k6subramaniam/Mylegacycannabis.ca (main branch)
│   ├── Build Command: pnpm install && pnpm run build
│   ├── Start Command: node dist/index.js
│   ├── Port: 3000 (auto-detected)
│   └── Domain: mylegacycannabis.ca (custom + auto TLS)
│
└── Service: MySQL Database
    ├── Engine: MySQL 8
    ├── Connection: via DATABASE_URL env var (injected automatically)
    └── Backups: Railway managed
```

### Build & Runtime Process

```
Git push to main
       │
       ▼
Railway detects new commit
       │
       ▼
pnpm install          ← installs all dependencies
       │
       ▼
vite build            ← compiles React SPA → dist/public/
       │
       ▼
esbuild (server)      ← compiles Express server → dist/index.js
       │
       ▼
node dist/index.js    ← starts production server on PORT
       │
       ▼
Express serves:
  /api/*    → tRPC + auth routes
  /*        → dist/public/index.html (React SPA)
```

### Railway Plan

| Setting | Value |
|---|---|
| Plan | Pro ($20 USD/month) |
| RAM per service | Up to 32 GB (actual usage ~0.5 GB) |
| CPU per service | Up to 32 vCPU (actual usage ~0.15 vCPU) |
| Network egress | $0.05/GB (actual ~15 GB/month) |
| Volume storage | $0.15/GB/month |
| Auto-deploy | Enabled (GitHub integration) |
| Region | US West (default) — can change to `us-east` for lower Canada latency |

### Environment Variables on Railway

Set these in the Railway dashboard under **Variables** for the Web App service:

```
NODE_ENV=production
PORT=3000                              (auto-set by Railway)
DATABASE_URL=mysql://...               (auto-injected by Railway MySQL plugin)
JWT_SECRET=<strong-random-secret>
VITE_APP_ID=mylegacycannabis
OWNER_OPEN_ID=<admin-user-openId>
OAUTH_SERVER_URL=https://mylegacycannabis.ca

# Optional — OTP emails & owner notifications
BUILT_IN_FORGE_API_URL=<forge-endpoint>
BUILT_IN_FORGE_API_KEY=<forge-api-key>

# Optional — SMS OTP
TWILIO_ACCOUNT_SID=<sid>
TWILIO_AUTH_TOKEN=<auth-token>
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx

# Optional — Google Social Login
GOOGLE_CLIENT_ID=<client-id>
GOOGLE_CLIENT_SECRET=<client-secret>
```

---

## 9. Environment Variables

Full reference for all supported environment variables:

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | Yes | `production` in Railway; `development` locally |
| `PORT` | Auto | HTTP port (Railway injects this) |
| `DATABASE_URL` | Yes (prod) | MySQL connection string, e.g. `mysql://user:pass@host:3306/db` |
| `JWT_SECRET` | Yes | Secret key for signing session JWT cookies |
| `VITE_APP_ID` | Yes | Application identifier (e.g. `mylegacycannabis`) |
| `OWNER_OPEN_ID` | Yes | The `openId` of the admin/owner account |
| `OAUTH_SERVER_URL` | Yes | Public base URL of the app (e.g. `https://mylegacycannabis.ca`) |
| `BUILT_IN_FORGE_API_URL` | Optional | Endpoint for email/notification delivery |
| `BUILT_IN_FORGE_API_KEY` | Optional | API key for Forge notification service |
| `TWILIO_ACCOUNT_SID` | Optional | Twilio account SID for SMS OTP |
| `TWILIO_AUTH_TOKEN` | Optional | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | Optional | Twilio sender number (Canadian long code) |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth 2.0 client ID |
| `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth 2.0 client secret |

---

## 10. Build & Deployment Pipeline

### Local Development

```bash
# Install dependencies
pnpm install

# Start dev server (Vite HMR + tsx watch)
pnpm run dev
# → http://localhost:3000
```

### Production Build

```bash
# Full production build
pnpm run build

# Output:
#   dist/public/   ← React SPA (Vite)
#   dist/index.js  ← Express server (esbuild, ~91 KB)

# Run production build locally
NODE_ENV=production node dist/index.js
```

### Database Migrations

```bash
# Generate migration files from schema.ts
pnpm run db:push

# Requires DATABASE_URL to be set
```

### Testing

```bash
# Run all tests
pnpm run test

# Test files:
#   server/auth.login-register.test.ts
#   server/auth.logout.test.ts
#   server/admin.test.ts
#   server/customAuth.test.ts
```

### Deployment Checklist

- [ ] All env vars set in Railway dashboard
- [ ] `DATABASE_URL` points to the Railway MySQL service
- [ ] `JWT_SECRET` is set to a strong, unique random string
- [ ] `OAUTH_SERVER_URL` matches the live domain
- [ ] `OWNER_OPEN_ID` is set to the admin account's `openId`
- [ ] Custom domain added in Railway and DNS configured
- [ ] TLS certificate auto-provisioned (Railway handles this automatically)
- [ ] Drizzle migration run against production DB (`pnpm run db:push`)
- [ ] Push to `main` branch to trigger auto-deploy

---

## 11. OpEx Cost Summary (4,000 orders/month)

Based on the current architecture at 4,000 orders/month, using real March 2026 pricing:

| Service | Provider | Cost/month (CAD) |
|---|---|---|
| App + DB Hosting | Railway Pro | $27.60 |
| Image Storage | Cloudflare R2 | $0.22 |
| SMS OTP | Twilio (300 SMS/mo) | $7.38 |
| Email OTP | Resend / SendGrid (free tier) | $0.00 |
| Google OAuth | Google Identity | $0.00 |
| SSL Certificate | Railway / Let's Encrypt | $0.00 |
| Domain (.ca) | Namecheap | $1.75 |
| **Total** | | **~$36.95 CAD/month** |

**Cost per order: ~$0.009 CAD (<1 cent)**

### Scaling Estimates

| Monthly Orders | Est. Total OpEx (CAD) |
|---|---|
| 1,000 | ~$33 |
| 4,000 | ~$37 ← current |
| 10,000 | ~$55 |
| 25,000 | ~$115 |
| 50,000 | ~$245 |

### Cost Optimisation Tips

1. **Default to email OTP** — SMS is optional in the code; making email the primary method saves ~$6 CAD/month
2. **Use Cloudflare R2** over AWS S3 — zero egress fees, free 10 GB tier
3. **Railway Hobby plan** ($5 USD/mo) is sufficient if staying under ~1,000 concurrent sessions
4. **Use Resend** (3,000 free emails/month) for transactional order confirmation emails

---

*Document generated from codebase at commit `5198197` — March 21, 2026*
