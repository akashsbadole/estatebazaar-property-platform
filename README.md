# EstateBazaar — OLX-style Property Marketplace

A full-stack peer-to-peer property marketplace inspired by OLX. Built with **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS**, **shadcn/ui**, **Prisma ORM (SQLite)**, **Socket.io** real-time chat, and **JWT + bcrypt** authentication.

![EstateBazaar](https://img.shields.io/badge/Next.js-16-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Prisma](https://img.shields.io/badge/Prisma-6-indigo) ![Tailwind](https://img.shields.io/badge/Tailwind-4-cyan)

## Screenshots

![Homepage](./screenshot/EstateBazaar-%20Homepage.png)
![Login](./screenshot/EstateBazaar-%20login.png)
![Contact Us](./screenshot/EstateBazaar-%20Contact%20Us.png)
![Pricing](./screenshot/EstateBazaar-%20Pricing.png)

---

## Credential

---

| Email                   | Role  | Subscription | Password    |
| ----------------------- | ----- | ------------ | ----------- |
| admin@estatebazaar.com  | ADMIN | FREE         | password123 |
| user@estatebazaar.com   | USER  | FREE         | password123 |
| pro@estatebazaar.com    | USER  | PRO          | password123 |
| broker@estatebazaar.com | USER  | BROKER       | password123 |
| vendor@estatebazaar.com | USER  | FREE         | password123 |

---

## 📦 Project Structure

```
.
├── prisma/
│   ├── schema.prisma                # Database schema (12+ models)
│   ├── migrations/                  # Migration history
│   └── seed.ts                      # Database seed (users, categories, plans, 6 listings)
├── public/
│   ├── uploads/                     # User-uploaded property images
│   └── placeholder-property.svg
├── mini-services/
│   └── chat-service/                # Socket.io WebSocket service (port 3003)
│       ├── index.ts
│       └── package.json
├── src/
│   ├── app/
│   │   ├── layout.tsx               # Root layout with toaster
│   │   ├── page.tsx                 # Main SPA page (view router)
│   │   ├── globals.css              # Brand theme + Tailwind
│   │   └── api/                     # API routes (App Router)
│   │       ├── auth/{signup,login,verify-otp,send-otp,logout,me}/route.ts
│   │       ├── properties/{[id],[id]/report,my,featured}/route.ts
│   │       ├── properties/route.ts
│   │       ├── categories/route.ts
│   │       ├── favorites/{[propertyId]}/route.ts
│   │       ├── favorites/route.ts
│   │       ├── chats/{[id],[id]/messages}/route.ts
│   │       ├── chats/route.ts
│   │       ├── admin/{listings,listings/[id],users,users/[id],reports,reports/[id],stats}/route.ts
│   │       ├── users/me/route.ts
│   │       └── upload/route.ts
│   ├── components/
│   │   ├── ui/                      # shadcn/ui components (pre-installed)
│   │   ├── header.tsx
│   │   ├── footer.tsx
│   │   ├── auth-modal.tsx           # Login + Signup + OTP modal
│   │   ├── property-card.tsx        # Reusable listing card
│   │   └── views/
│   │       ├── home-view.tsx        # Hero, search, categories, latest, trending
│   │       ├── listings-view.tsx    # Filter sidebar + grid/list + sort + pagination
│   │       ├── detail-view.tsx      # Image slider, tabs, seller card, similar listings, report dialog
│   │       ├── post-view.tsx        # 5-step wizard with preview
│   │       ├── chat-view.tsx        # Real-time chat with Socket.io + typing indicator
│   │       ├── profile-view.tsx     # User profile + edit
│   │       ├── my-listings-view.tsx # Owner listings + favorites view
│   │       └── admin-view.tsx       # Dashboard, listings moderation, users, reports
│   ├── lib/
│   │   ├── auth.ts                  # bcrypt + JWT + OTP + rate limit + audit + helpers
│   │   ├── constants.ts             # Constants, types, formatters
│   │   ├── store.ts                 # Zustand app store (auth + navigation)
│   │   ├── api-client.ts            # Fetch wrapper
│   │   ├── db.ts                    # Prisma client
│   │   └── utils.ts
│   └── hooks/
└── package.json
```

---

## 🚀 Features Implemented

### 🔐 Authentication & Security

- **Email/Password signup** with bcrypt password hashing (12 rounds)
- **OTP verification** (6-digit code, 10-min expiry, demo preview shown in toast)
- **JWT session tokens** stored in httpOnly cookies (7-day expiry)
- **Login/Logout** with session invalidation
- **Rate limiting** (in-memory, per-IP): signup 5/min, login 10/min, OTP 5/min
- **Role-based access control**: USER vs ADMIN
- **Subscription tiers**: FREE | PRO | BROKER (stored on User)
- **Brokerage signup fee** tracking (`brokeragePaid`)
- **Input sanitization** (strips angle brackets, enforces max length)
- **Audit logging** of all sensitive actions (signup, login, listing create/update/delete, favorite, report, admin moderation)
- **Account banning** — banned users cannot log in
- **Verified seller badges** for verified accounts

### 🏠 Property Listing & CRUD

- **Create** new listing (defaults to `PENDING` status for admin review)
- **Read** listing with view count increment, owner info, similar properties
- **Update** listing — significant field changes trigger re-approval
- **Delete** listing (cascade removes images, chats, messages, favorites, reports)
- **My Listings** page — owner can view all their listings across statuses
- **Featured** endpoint — latest + most-viewed + cities list for homepage
- **Recommended** endpoint — personalized or trending fallback
- **Filtering**: by keyword, type, category, city, price range, bedrooms, furnishing
- **Sorting**: latest, price asc/desc, most viewed
- **Pagination**: 12 per page, "Load more" pattern
- **Property types**: FLAT | HOUSE | PLOT | COMMERCIAL | VILLA | BUILDER_FLOOR
- **Furnishing**: FURNISHED | SEMI_FURNISHED | UNFURNISHED
- **Contact preferences**: CALL | CHAT | BOTH
- **Verified Listing badge** — premium feature for PRO/BROKER subscribers
- **360° Tour images** — JSON array of panoramic image URLs (PRO/BROKER)
- **Price history tracking** — automatic on price changes

### 📂 Categories

- 4 built-in categories: Residential, Commercial, Land, Rental
- Each with icon and slug for routing
- Property count aggregation

### 💳 Subscription System

- **Plans**: FREE (₹0), PRO (₹999/mo, ₹9,999/yr), BROKER (₹2,999/mo, ₹29,999/yr)
- Feature flags stored as JSON: maxListings, maxImagesPerListing, featuredListing, verifiedBadge, analytics, prioritySupport, teamAccess, crmIntegration
- Billing cycle: MONTHLY | YEARLY
- Subscription status: ACTIVE | EXPIRED | CANCELLED | PENDING
- Payment tracking with Razorpay/UPI/DEMO methods

### 🎨 UI/UX (8 distinct views)

1. **Home** — Hero with search bar, category tiles, latest + trending sections, why-choose-us, CTA
2. **Listings** — Sidebar filters (mobile sheet), grid/list toggle, sort, active filter chips, "Load more"
3. **Detail** — Image slider with thumbnails, 3 tabs (Overview, Description, Location w/ map), seller card, similar properties, report dialog, share, save
4. **Post Property** — 5-step wizard (Category → Details → Photos → Pricing → Review) with image upload, preview modal, validation, geolocation detect
5. **Chat** — Two-pane layout (chat list + thread), Socket.io real-time, typing indicator, optimistic messages, unread badges
6. **Profile** — Avatar card with stats, editable fields (name, phone)
7. **My Listings** — Grid of owner properties with status badges, view/delete actions
8. **Admin Panel** — 4 tabs:
   - **Dashboard** — 8 stat cards, 7-day listings trend bar chart, top cities, type distribution
   - **Listings** — Status filter, approve/reject/mark sold actions
   - **Users** — Search, verify/unverify, ban/unban actions
   - **Reports** — Status filter, mark reviewing/resolved/dismissed

### 💬 Real-time Chat (Socket.io)

- Mini-service on port 3003 with JWT handshake auth
- Broadcasts messages, typing indicators, read receipts
- Per-user socket set (multi-tab support)
- Falls back to REST API when WS unavailable
- Messages persisted to DB with isRead tracking

### 🛡️ Admin Tools

- Approve / reject pending listings
- Mark listings as sold
- Ban / unban users
- Verify / unverify users
- Resolve / dismiss / mark-reviewing reports
- Full audit log of all admin actions
- Dashboard analytics (totals + charts)

### 📁 Image Upload

- `POST /api/upload` accepts base64 data URLs (PNG/JPG/WebP/GIF)
- Saves to `/public/uploads/<uuid>.<ext>`
- 5 MB size limit per file
- Returns public URL for embedding

### 💾 Additional Features

- **Favorites** — Bookmark listings with unique constraint per user+property
- **Reports** — Fraud/Duplicate/Spam/Wrong Info/Other with status workflow
- **Contact Requests** — Enquiry (property) or Support (general) with admin notes
- **Recently Viewed** — Per-user viewing history with timestamps
- **Saved Searches** — Save filter sets with optional email alerts
- **Mortgage Applications** — Pre-approval forms with partner bank integration
- **Site Settings** — Key-value store with categories and secrets
- **Banners** — Homepage promotional banners
- **Blog Posts** — Content management with slugs
- **Content Pages** — Static pages (About, Terms, Privacy, etc.)
- **Redirects** — URL redirect management
- **Newsletter Subscribers** — Email capture
- **Notifications** — User notifications with read status
- **Password Reset Tokens** — Secure reset flow

---

## 🗄️ Database Models (18+)

| Model                  | Purpose                                                                      |
| ---------------------- | ---------------------------------------------------------------------------- |
| `User`                 | Account (USER/ADMIN), subscription tier, brokerage, verification, ban status |
| `Category`             | Listing categories with icons and slugs                                      |
| `Property`             | Full listing details, pricing, location, status, contact, tour images        |
| `PropertyImage`        | Multiple images per property, one primary                                    |
| `Chat`                 | Conversation thread between buyer & seller                                   |
| `Message`              | Individual chat messages with read tracking                                  |
| `Report`               | User-submitted reports with status workflow                                  |
| `Favorite`             | User bookmarks (unique per user+property)                                    |
| `Otp`                  | One-time passwords with expiry/consumed flag                                 |
| `AuditLog`             | Append-only audit trail                                                      |
| `SubscriptionPlan`     | Plan definitions with feature flags (JSON)                                   |
| `Subscription`         | User subscriptions with billing cycle & status                               |
| `Payment`              | Payment records (Razorpay/UPI/DEMO)                                          |
| `ContactRequest`       | Enquiries & support tickets                                                  |
| `RecentlyViewed`       | Per-user property view history                                               |
| `SavedSearch`          | Saved filter sets with alert settings                                        |
| `MortgageApplication`  | Pre-approval applications                                                    |
| `SiteSetting`          | Key-value site configuration                                                 |
| `PriceHistory`         | Property price change tracking                                               |
| `Banner`               | Homepage promotional banners                                                 |
| `BlogPost`             | Content management                                                           |
| `ContentPage`          | Static pages                                                                 |
| `Redirect`             | URL redirects                                                                |
| `NewsletterSubscriber` | Email list                                                                   |
| `Notification`         | User notifications                                                           |
| `PasswordResetToken`   | Password reset flow                                                          |

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4 + shadcn/ui (New York variant)
- **Database**: SQLite via Prisma ORM 6
- **Auth**: bcryptjs + jsonwebtoken + httpOnly cookies
- **State**: Zustand (client state) + TanStack Query (server state available)
- **Forms**: react-hook-form + zod (available)
- **Realtime**: Socket.io (separate mini-service on port 3003)
- **Icons**: Lucide React
- **Toasts**: Sonner
- **Date**: date-fns
- **Charts**: Recharts (admin dashboard)

---

## ▶️ Running Locally

```bash
# Install dependencies
npm install

# Initialize database (run migrations)
npm run db:migrate

# Seed sample data
npm run db:seed

# Start chat WebSocket service (separate terminal)
cd mini-services/chat-service
npm install
npm run dev   # runs on port 3003

# Start Next.js dev server (separate terminal)
npm run dev   # runs on port 3000
```

Open `http://localhost:3000`.

### Demo Credentials

- **Admin**: `admin@estatebazaar.com` / `password123`
- **Regular User**: `user@estatebazaar.com` / `password123` (FREE tier)
- **Pro User**: `pro@estatebazaar.com` / `password123` (PRO tier)
- **Broker**: `broker@estatebazaar.com` / `password123` (BROKER tier)
- **Vendor**: `vendor@estatebazaar.com` / `password123` (FREE tier)

> **Note on OTP**: OTPs are generated and validated server-side. In this demo, the OTP is also returned in the API response and shown via a Sonner toast so you can complete the flow without real email/SMS. In production, remove `otpPreview` from API responses and integrate an actual email/SMS provider.

---

## 🔌 API Reference

### Auth

| Method | Endpoint               | Description                          |
| ------ | ---------------------- | ------------------------------------ |
| POST   | `/api/auth/signup`     | Create account, sends OTP            |
| POST   | `/api/auth/login`      | Login (or require OTP if unverified) |
| POST   | `/api/auth/verify-otp` | Verify OTP and create session        |
| POST   | `/api/auth/send-otp`   | Resend OTP                           |
| POST   | `/api/auth/logout`     | Clear session                        |
| GET    | `/api/auth/me`         | Get current user                     |

### Properties

| Method | Endpoint                      | Description                       |
| ------ | ----------------------------- | --------------------------------- |
| GET    | `/api/properties`             | List with filters/sort/pagination |
| POST   | `/api/properties`             | Create listing (auth required)    |
| GET    | `/api/properties/featured`    | Homepage curated set              |
| GET    | `/api/properties/recommended` | Personalized or trending          |
| GET    | `/api/properties/my`          | Owner's listings (auth required)  |
| GET    | `/api/properties/[id]`        | Get single + similar              |
| PUT    | `/api/properties/[id]`        | Update (owner only)               |
| DELETE | `/api/properties/[id]`        | Delete (owner or admin)           |
| POST   | `/api/properties/[id]/report` | Report listing                    |

### Categories, Favorites, Chats

| Method | Endpoint                      | Description                     |
| ------ | ----------------------------- | ------------------------------- |
| GET    | `/api/categories`             | List all categories             |
| POST   | `/api/categories`             | Create (admin only)             |
| GET    | `/api/favorites`              | User's favorites                |
| POST   | `/api/favorites/[propertyId]` | Toggle favorite                 |
| GET    | `/api/chats`                  | User's chats with unread counts |
| POST   | `/api/chats`                  | Start/resume chat               |
| GET    | `/api/chats/[id]`             | Chat with paginated messages    |
| POST   | `/api/chats/[id]/messages`    | Send message                    |

### Admin

| Method | Endpoint                   | Description               |
| ------ | -------------------------- | ------------------------- |
| GET    | `/api/admin/stats`         | Dashboard analytics       |
| GET    | `/api/admin/listings`      | All listings with filters |
| PATCH  | `/api/admin/listings/[id]` | Approve/reject/sold       |
| GET    | `/api/admin/users`         | All users with search     |
| PATCH  | `/api/admin/users/[id]`    | Ban/unban/verify/role     |
| GET    | `/api/admin/reports`       | All reports with status   |
| PATCH  | `/api/admin/reports/[id]`  | Update report status      |

### Other

| Method | Endpoint        | Description             |
| ------ | --------------- | ----------------------- |
| GET    | `/api/users/me` | Get profile with counts |
| PATCH  | `/api/users/me` | Update profile          |
| POST   | `/api/upload`   | Upload base64 image     |

---

## 🔒 Security Notes

1. **Passwords** — bcrypt-hashed with 12 rounds, never logged or returned
2. **Sessions** — JWT in httpOnly, SameSite=Lax cookies (7-day expiry)
3. **SQL Injection** — All queries go through Prisma ORM (parameterized)
4. **XSS** — User input sanitized (strips `<`/`>`), no `dangerouslySetInnerHTML` for user data
5. **CSRF** — SameSite=Lax cookies; POST endpoints require JSON body
6. **Rate Limiting** — Per-IP limits on auth endpoints
7. **Authorization** — Every mutation checks `requireAuth()` / `requireAdmin()` server-side
8. **Audit Trail** — All sensitive actions logged to `AuditLog` table
9. **File Upload Safety** — Image MIME-type validation, 5MB max, UUID filenames

---

## 📝 License

MIT — feel free to use this as a starting point for your own property marketplace.
