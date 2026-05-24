# OldTrailBikes Sri Lanka — Backend API

Express.js + TypeScript + Prisma + PostgreSQL + Redis backend for the
OldTrailBikes Sri Lanka platform (workshop management + bike marketplace +
multi-vendor parts store).

This is **phase 1**: foundation, schema, auth, and security. Domain modules
beyond `auth` and `brands` are scaffolded but return `501 Not Implemented`
and will be filled in during phase 2.

---

## Tech stack

| Layer       | Choice                                                     |
| ----------- | ---------------------------------------------------------- |
| Runtime     | Node.js ≥ 20, TypeScript 5                                 |
| Framework   | Express 4 (helmet, cors, morgan, compression, rate-limit)  |
| Validation  | express-validator + zod (env)                              |
| ORM         | Prisma 5 (PostgreSQL 15)                                   |
| Cache       | Redis (ioredis)                                            |
| Auth        | JWT access + refresh, bcryptjs, role-based middleware      |
| Images      | Cloudinary + multer-storage-cloudinary                     |
| Email       | Brevo (sib-api-v3-sdk), bilingual templates                |
| Payments    | Stripe (PaymentIntents + webhooks) — see note below        |
| Logging     | pino (+ pino-pretty in dev)                                |

> **Payment provider note:** the project brief body describes Stripe
> (PaymentIntents, webhooks, refunds) while the tech-stack summary line says
> *payhere*. The code is wired for Stripe; switching to PayHere would mean
> swapping `services/payment.service.ts` and the webhook handler. Confirm
> before phase 2.

---

## Quick start

```bash
cd backend

cp .env.example .env
# fill in DATABASE_URL, JWT secrets, Cloudinary, Brevo, Stripe…

npm install

# Generate Prisma client + run migrations (extensions → schema → triggers)
npm run prisma:migrate -- --name initial_schema
npm run prisma:seed

npm run dev          # http://localhost:4000/api/v1
```

Health check:

```bash
curl http://localhost:4000/api/v1/health
```

---

## Environment

See [`.env.example`](.env.example) for the full list. Validated by
[`src/config/env.ts`](src/config/env.ts) at boot — missing or malformed values
fail fast with a clear error.

Required to run at all:

* `DATABASE_URL`
* `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (≥16 chars each)

Optional (degrade gracefully when missing):

* `REDIS_URL` — caching layer disabled when unset
* `CLOUDINARY_*` — image upload returns an error if used without these
* `BREVO_*` — appointment status emails become no-ops
* `STRIPE_*` — checkout endpoint returns an error if used without these

---

## Database & migrations

The `prisma/migrations/` folder contains **two manual migrations** that
bookend the auto-generated schema migration:

```
prisma/migrations/
  00000000000000_init_extensions/        ← runs first, creates pgcrypto
  <prisma-generated>_initial_schema/     ← created by `prisma migrate dev`
  99999999999999_triggers_and_constraints/  ← runs last, adds triggers + checks
```

The triggers migration installs:

* `touch_updated_at()` — bumps `updated_at` on every UPDATE for
  `appointments`, `bikes_for_sale`, `spare_parts` (per the brief).
* `set_mechanic_verified()` — flips `bikes_for_sale.is_mechanic_verified`
  to `TRUE` the moment a row lands in `mechanic_verifications`. A
  symmetric `clear_mechanic_verified()` undoes it on DELETE.
* CHECK constraints:
  * `reviews`: XOR target (`appointment_id` or `part_id`, never both /
    neither, agrees with `target_type`), rating 1..5
  * `spare_parts.stock_quantity >= 0`
  * `order_items.quantity >= 1`, `commission_rate` 0..100
  * `shops.commission_rate` 0..100

### First-time setup

```bash
npm run prisma:migrate -- --name initial_schema
```

Prisma applies migrations in lexicographic order, so `00000…` runs first
(pgcrypto is ready), then the generated schema (its `gen_random_uuid()`
defaults work), then `99999…` adds the triggers.

### Reset

```bash
npm run db:reset   # drops + recreates + re-seeds
```

### Seed data

[`prisma/seed.ts`](prisma/seed.ts) inserts:

* All 10 dirt-bike brands from the brief (KTM, Yamaha, Honda, Husqvarna,
  Kawasaki, Suzuki, GasGas, Beta, Sherco, TM Racing).
* 10 part categories (Engine, Suspension, Brakes, Drive Train, …).
* A platform admin (defaults: `admin@oldtrailbikes.lk` / `ChangeMe!2026`,
  override via `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`).

---

## Project structure

```
backend/
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
│       ├── 00000000000000_init_extensions/
│       └── 99999999999999_triggers_and_constraints/
└── src/
    ├── server.ts                  # bootstrap + graceful shutdown
    ├── app.ts                     # express composition
    ├── config/
    │   ├── env.ts                 # zod-validated env
    │   ├── db.ts                  # PrismaClient singleton
    │   └── redis.ts               # ioredis singleton
    ├── middleware/
    │   ├── auth.ts                # authenticate, authorize(role), requireApprovedShop
    │   ├── error.ts               # ApiError + Prisma error mapping
    │   ├── rateLimit.ts           # apiLimiter, authLimiter
    │   └── validate.ts            # express-validator → 422 helper
    ├── utils/
    │   ├── ApiError.ts
    │   ├── asyncHandler.ts
    │   ├── jwt.ts                 # access + refresh sign/verify
    │   ├── logger.ts              # pino
    │   └── password.ts            # bcryptjs
    ├── services/                  # phase 2: cloudinary, brevo, stripe, redis-cache
    └── modules/
        ├── auth/                  ✅ implemented
        ├── brands/                ✅ list + admin stubs
        ├── appointments/          ✅ implemented (workshop module)
        ├── users/                 ⏳ stub
        ├── bikes/                 ⏳ stub (marketplace + verification)
        ├── shops/                 ⏳ stub
        ├── parts/                 ⏳ stub
        ├── orders/                ⏳ stub
        ├── reviews/               ⏳ stub
        └── webhooks/              ⏳ stub (Stripe — uses raw body)
```

---

## API surface (current)

All routes are prefixed by `API_PREFIX` (default `/api/v1`).

| Method | Route                | Auth          | Status      |
| ------ | -------------------- | ------------- | ----------- |
| GET    | `/health`            | —             | ✅ live      |
| POST   | `/auth/register`     | —             | ✅ live      |
| POST   | `/auth/login`        | —             | ✅ live      |
| POST   | `/auth/refresh`      | —             | ✅ live      |
| POST   | `/auth/logout`       | Bearer        | ✅ live      |
| GET    | `/auth/me`           | Bearer        | ✅ live      |
| GET    | `/brands`            | —             | ✅ live      |
| POST   | `/appointments`               | Bearer (customer) | ✅ live |
| GET    | `/appointments/mine`          | Bearer (customer) | ✅ live |
| GET    | `/appointments/by-plate/:plate` | Bearer          | ✅ live |
| GET    | `/appointments/:id`           | Bearer (owner/admin) | ✅ live |
| GET    | `/appointments`               | Bearer (admin)    | ✅ live |
| PATCH  | `/appointments/:id`           | Bearer (admin)    | ✅ live |
| PATCH  | `/appointments/:id/status`    | Bearer (admin)    | ✅ live (fires Brevo email) |
| *all others*         |                       | various       | 501 stub    |

### Workshop module behaviour

* **Booking** (`POST /appointments`) takes a `registrationPlate` and finds-or-
  creates a `ServiceBike` row keyed on that plate. Subsequent appointments for
  the same plate auto-link, giving the workshop a complete lifetime service
  record per vehicle (visible at `GET /appointments/by-plate/:plate`).
* **Status state machine** enforced server-side:
  * `PENDING → INSPECTED` (requires `estimatedCost`)
  * `INSPECTED → WAITING_FOR_PARTS` or `INSPECTED → REPAIRED`
  * `WAITING_FOR_PARTS → REPAIRED` (requires `finalCost`)
  * `REPAIRED` is terminal. Pass `force: true` (admin) to bypass the machine.
* **Bilingual emails** dispatched on every status change via Brevo, picking
  `BREVO_TEMPLATE_APPT_<STATUS>_<EN|SI>` from env according to the customer's
  `preferredLanguage`. If Brevo isn't configured, the transition still
  succeeds and a warning is logged.
* `inspectedAt` / `repairedAt` are stamped automatically on the matching
  transition.

Auth response shape:

```json
{
  "user": {
    "id": "...",
    "email": "...",
    "fullName": "...",
    "phone": null,
    "role": "CUSTOMER",
    "preferredLanguage": "EN",
    "createdAt": "..."
  },
  "tokens": {
    "accessToken": "eyJ…",
    "refreshToken": "eyJ…"
  }
}
```

---

## Roadmap (phase 2)

1. **Cloudinary upload pipeline** — multer middleware + photo-array endpoints
   for appointments, listings, parts.
2. **Workshop module** — appointments CRUD, status transitions firing Brevo
   bilingual emails, per-plate lifetime history.
3. **Marketplace module** — listings CRUD, filtering by brand/price/engine,
   mechanic verification endpoint (insert into `mechanic_verifications` →
   trigger sets badge).
4. **Multi-vendor store** — shop registration + admin approval, parts CRUD,
   public storefront, soft-delete, Redis caching for the directory.
5. **Checkout** — order creation that locks per-line `unit_price`,
   `commission_rate`, `commission_amount`; Stripe PaymentIntent; webhook
   handler for `payment_intent.succeeded`, `.payment_failed`, `charge.refunded`.
6. **Reviews** — author CRUD with XOR target enforcement at API + DB level.
7. **Tests** — Jest + Supertest, integration tests against a throwaway DB.
