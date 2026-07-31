# TypeScript Error Fix Plan

## Error Summary (35 errors across 18 files)

### Category 1: Missing Dependency (2 errors)
- `examples/websocket/server.ts:2` — `socket.io` not installed (only `socket.io-client` exists in package.json)
- `mini-services/chat-service/index.ts:2` — same

**Fix:** Install `socket.io` + `@types/socket.io`, or exclude these example/mini-service files from `tsc` (add to `tsconfig.json` exclude).

---

### Category 2: Prisma Schema — Missing `slug` field (4 errors)
- `prisma/seed.ts:293` — Property creation data missing `slug`
- `scripts/seed.ts:275` — same
- `scripts/seed-more.ts:265` — same
- `src/app/api/properties/route.ts:210` — POST handler missing `slug`

**Root cause:** `Property` model has `slug String @unique` (required), but creation payloads omit it.

**Fix:** Add `slug` generation (title → kebab-case + random suffix) in all 4 locations.

---

### Category 3: Prisma Schema — Invalid `meta` field on Subscription update (1 error)
- `src/app/api/subscriptions/me/route.ts:110` — `meta` doesn't exist in `SubscriptionUpdateInput`

**Root cause:** `Subscription` model has `meta String?` field, but Prisma's generated `SubscriptionUpdateInput` may not include it (nullable scalar on a non-relation model sometimes excluded from update input).

**Fix:** Use `prisma.$executeRaw` or type-assert the update: `data: { status: 'PENDING_CHANGE', meta: JSON.stringify(...) } as any`.

---

### Category 4: Prisma Schema — `actor` relation missing on AuditLog (6 errors)
- `src/app/api/admin/stats/route.ts:133,160` — `include: { actor: ... }` fails; `log.actor` is `never`

**Root cause:** `AuditLog` model has `actorId String?` but no `@@relation` to `User`. Prisma treats it as a scalar field, not a relation.

**Fix:** Remove the `include: { actor: ... }` from the query. If actor info is needed, fetch it separately or denormalize `actorName/email` into `AuditLog` at write time.

---

### Category 5: Type mismatches in API routes

| File | Error | Fix |
|------|-------|-----|
| `src/app/api/admin/stats/route.ts:202` | `buildHistogram(recentUsers, 'joinedDate')` — param expects `createdAt` key | Change `buildHistogram` signature to accept `Date` items generically, or pass `'joinedDate'` as the key |
| `src/app/api/admin/users/[id]/detail/route.ts:126` | `c.buyerId` doesn't exist on Chat type | Use `c.buyer.id === id ? c.seller : c.buyer` (compare by `.id`) |
| `src/app/api/admin/users/[id]/impersonate/route.ts:52` | `targetUser.phone` — not selected | Add `phone: true` to the select |
| `src/app/api/admin/users/bulk/route.ts:70` | `audit(..., null, ...)` — target expects `string \| undefined` | Pass `undefined` instead of `null` (or cast) |
| `src/app/api/auth/ws-token/route.ts:15` | `user.role` is `string`, not `'USER' \| 'ADMIN'` | Cast: `role: user.role as 'USER' | 'ADMIN'` |
| `src/app/api/saved-searches/check-alerts/route.ts:119` | `audit(..., null, ...)` — same as bulk | Pass `undefined` |
| `src/app/api/users/me/route.ts:80` | `Object.keys(data)` is `string[]`, not `Record<string, unknown>` | Cast: `Object.keys(data) as Record<string, unknown>` or pass `undefined` |

---

### Category 6: Component type errors

| File | Error | Fix |
|------|-------|-----|
| `src/components/property-card.tsx:49` | `res.message` — API returns `{ favorited: boolean }` only | Use `res.favorited` and show a static toast or add `message` to API response type |
| `src/components/property-card.tsx:70` | `fill` prop doesn't exist on `ResponsiveImageProps` | Remove `fill` prop or add it to the component |
| `src/components/subscribe-modal.tsx:54` | `window.Razorpay` not in `Window` type | Cast: `(window as any).Razorpay` |
| `src/components/views/admin-view.tsx:1149-1199` | `Label`, `Input`, `Switch` not imported; `items` is `unknown` | Add imports from `@/components/ui/label`, `input`, `switch`; fix `items` typing |

---

## Implementation Order

1. **Prisma schema check** — verify `SubscriptionUpdateInput` and whether `meta` is included in generated types (run `npx prisma generate` after any schema change)
2. **Seed files** — add `slug` to `prisma/seed.ts`, `scripts/seed.ts`, `scripts/seed-more.ts`
3. **API route fixes** — 8 files with type casts, missing selects, null → undefined, actor include removal
4. **Properties POST** — add `slug` generation
5. **Component fixes** — 4 files (toast message, ResponsiveImage prop, window.Razorpay cast, missing imports)
6. **socket.io** — install `socket.io` + `@types/socket.io` or exclude example/mini-service from tsconfig
