# EstateBazaar — OLX-style Property Marketplace

A full-stack peer-to-peer property marketplace inspired by OLX. Built with **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS**, **shadcn/ui**, **Prisma ORM (SQLite)**, **Socket.io** real-time chat, and **JWT + bcrypt** authentication.

![EstateBazaar](https://img.shields.io/badge/Next.js-16-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Prisma](https://img.shields.io/badge/Prisma-6-indigo) ![Tailwind](https://img.shields.io/badge/Tailwind-4-cyan)

---

## 📦 Project Structure

```
.
├── prisma/
│   └── schema.prisma                # Database schema (9 models)
├── public/
│   ├── uploads/                     # User-uploaded property images
│   └── placeholder-property.svg
├── scripts/
│   └── seed.ts                      # Database seed (admin, demo users, categories, 8 listings)
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
- **Email/Password signup** with bcrypt password hashing (10 rounds)
- **OTP verification** (6-digit code, 10-min expiry, demo preview shown in toast)
- **JWT session tokens** stored in httpOnly cookies (7-day expiry)
- **Login/Logout** with session invalidation
- **Rate limiting** (in-memory, per-IP): signup 5/min, login 10/min, OTP 5/min
- **Role-based access control**: USER vs ADMIN
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
- **Filtering**: by keyword, type, category, city, price range, bedrooms, furnishing
- **Sorting**: latest, price asc/desc, most viewed
- **Pagination**: 12 per page, "Load more" pattern

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

---

## 🗄️ Database Models (9)

| Model | Purpose |
|---|---|
| `User` | Account (USER/ADMIN), name, email, phone, passwordHash, isVerified, isBanned, avatarUrl |
| `Category` | Listing categories (Flats, Houses, Villas, Plots, Builder Floors, Commercial) |
| `Property` | Listings with type, price, area, beds/baths/parking, location, lat/lng, status, contact info |
| `PropertyImage` | Multiple images per property, one isPrimary |
| `Chat` | Conversation thread between buyer & seller about a specific property |
| `Message` | Individual chat messages with isRead tracking |
| `Report` | User-submitted fraud/duplicate/spam reports with status workflow |
| `Favorite` | User bookmarks (unique constraint per user+property) |
| `Otp` | One-time passwords with expiry and consumed flag |
| `AuditLog` | Append-only audit trail of all sensitive actions |

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

---

## ▶️ Running Locally

```bash
# Install dependencies
bun install

# Initialize database
bun run db:push

# Seed sample data
bun run scripts/seed.ts

# Start chat WebSocket service (separate terminal)
cd mini-services/chat-service
bun install
bun run dev   # runs on port 3003

# Start Next.js dev server (separate terminal)
bun run dev   # runs on port 3000
```

Open `http://localhost:3000`.

### Demo Credentials
- **Admin**: `admin@olx-property.com` / `admin123`
- **User 1**: `rahul@example.com` / `demo1234` (owns 2 listings)
- **User 2**: `priya@example.com` / `demo1234`
- **User 3**: `amit@example.com` / `demo1234`
- **User 4**: `sneha@example.com` / `demo1234`

> **Note on OTP**: OTPs are generated and validated server-side. In this demo, the OTP is also returned in the API response and shown via a Sonner toast so you can complete the flow without real email/SMS. In production, remove `otpPreview` from API responses and integrate an actual email/SMS provider.

---

## 🔌 API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/signup` | Create account, sends OTP |
| POST | `/api/auth/login` | Login (or require OTP if unverified) |
| POST | `/api/auth/verify-otp` | Verify OTP and create session |
| POST | `/api/auth/send-otp` | Resend OTP |
| POST | `/api/auth/logout` | Clear session |
| GET | `/api/auth/me` | Get current user |

### Properties
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/properties` | List with filters/sort/pagination |
| POST | `/api/properties` | Create listing (auth required) |
| GET | `/api/properties/featured` | Homepage curated set |
| GET | `/api/properties/my` | Owner's listings (auth required) |
| GET | `/api/properties/[id]` | Get single + similar |
| PUT | `/api/properties/[id]` | Update (owner only) |
| DELETE | `/api/properties/[id]` | Delete (owner or admin) |
| POST | `/api/properties/[id]/report` | Report listing |

### Categories, Favorites, Chats
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/categories` | List all categories |
| POST | `/api/categories` | Create (admin only) |
| GET | `/api/favorites` | User's favorites |
| POST | `/api/favorites/[propertyId]` | Toggle favorite |
| GET | `/api/chats` | User's chats with unread counts |
| POST | `/api/chats` | Start/resume chat |
| GET | `/api/chats/[id]` | Chat with paginated messages |
| POST | `/api/chats/[id]/messages` | Send message |

### Admin
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/stats` | Dashboard analytics |
| GET | `/api/admin/listings` | All listings with filters |
| PATCH | `/api/admin/listings/[id]` | Approve/reject/sold |
| GET | `/api/admin/users` | All users with search |
| PATCH | `/api/admin/users/[id]` | Ban/unban/verify/role |
| GET | `/api/admin/reports` | All reports with status |
| PATCH | `/api/admin/reports/[id]` | Update report status |

### Other
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/users/me` | Get profile with counts |
| PATCH | `/api/users/me` | Update profile |
| POST | `/api/upload` | Upload base64 image |

---

## 🔒 Security Notes

1. **Passwords** — bcrypt-hashed with 10 rounds, never logged or returned
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
