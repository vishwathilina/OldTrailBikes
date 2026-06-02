<table>
  <tr>
    <td valign="top">
      <img src="frontend/public/logo.png" alt="OldTrailBikes Logo" width="200"/>
    </td>
    <td valign="top">
      <h1>OldTrailBikes Sri Lanka</h1>
      <p>Dirt-bike workshop management, peer-to-peer marketplace, and multi-vendor parts store — bilingual (Sinhala / English) from a Next.js dashboard backed by an Express + Prisma API.</p>
      <p>This repository supports two runtime models:</p>
      <ul>
        <li>Local development with PostgreSQL (Neon or self-hosted) and optional Redis caching</li>
        <li>Containerized backend deployment via Docker for production-style runs</li>
      </ul>
    </td>
  </tr>
</table>

## Technologies Used

![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat-square&logo=prisma&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat-square&logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Cloudinary](https://img.shields.io/badge/Cloudinary-3448C5?style=flat-square&logo=cloudinary&logoColor=white)
![PayHere](https://img.shields.io/badge/PayHere-00A651?style=flat-square&logoColor=white)
![Brevo](https://img.shields.io/badge/Brevo-0092FF?style=flat-square&logoColor=white)

## What This Platform Does

- Register and authenticate users with JWT access + refresh tokens and role-based access (`CUSTOMER`, `SHOP_OWNER`, `ADMIN`)
- Book workshop appointments keyed by registration plate — full service history per bike
- Track appointment status (`PENDING → INSPECTED → WAITING_FOR_PARTS → REPAIRED`) with bilingual Brevo email notifications
- List and browse used dirt bikes on a peer-to-peer marketplace with mechanic verification badges
- Operate a multi-vendor spare-parts catalog with shop registration, admin approval, and commission tracking
- Process checkout and payments through **PayHere** (Sri Lankan gateway) with webhook confirmation
- Upload listing and appointment photos via **Cloudinary**
- Serve a bilingual Next.js App Router UI with dark mode, cart, and admin dashboards

## Runtime Models

### 1) Local Development

Run PostgreSQL (e.g. [Neon](https://neon.tech) cloud or a local instance) and optionally Redis. Start the backend and frontend on the host with `npm` / `pnpm`.

| Service | Role | Default port |
|---------|------|--------------|
| **Backend** | Express REST API, Prisma ORM, PayHere webhooks, Brevo emails | `4000` |
| **Frontend** | Next.js App Router dashboard and storefront | `3000` |
| **PostgreSQL** | Primary database | `5432` |
| **Redis** | Optional cache layer (skipped when `REDIS_URL` is unset) | `6379` |

Default local endpoints:

- Frontend: http://localhost:3000
- Backend API: http://localhost:4000/api/v1
- Backend health: http://localhost:4000/api/v1/health

### 2) Containerized Backend

The backend ships with a multi-stage `Dockerfile` for production builds. The frontend is typically deployed separately (e.g. Vercel) or run with `npm run build && npm start`.

```bash
cd backend
docker build -t oldtrailbikes-api .
docker run -p 4000:4000 --env-file .env oldtrailbikes-api
```

## Repository Structure

### Root folders

| Path | Purpose |
|------|---------|
| `backend/` | Express + Prisma API: auth, appointments, marketplace, shops, parts, orders, reviews, PayHere webhooks |
| `frontend/` | Next.js App Router UI (marketplace, workshop, parts store, shop dashboard, admin) |

### Backend layout

```
backend/
├── prisma/
│   ├── schema.prisma          # Full domain schema
│   ├── seed.ts                # Brands, categories, admin user
│   └── migrations/            # Extensions → schema → triggers
└── src/
    ├── server.ts              # Bootstrap + graceful shutdown
    ├── app.ts                 # Express composition
    ├── config/                # env (zod), db, redis
    ├── middleware/            # auth, validate, rate-limit, errors
    ├── services/              # Cloudinary, Brevo, PayHere, Redis cache
    └── modules/
        ├── auth/              # Register, login, refresh, JWT
        ├── appointments/      # Workshop booking + status machine
        ├── bikes/             # Marketplace listings + verification
        ├── shops/             # Shop registration + admin approval
        ├── parts/             # Spare-parts catalog
        ├── orders/            # Checkout + commission
        ├── reviews/           # Shop / part reviews
        └── webhooks/          # PayHere payment notifications
```

### Frontend routes

| Route | Purpose |
|-------|---------|
| `/` | Landing page |
| `/login`, `/register` | Authentication |
| `/dashboard` | Customer dashboard |
| `/workshop` | Book a service appointment |
| `/appointments/[id]` | Appointment detail + status |
| `/marketplace`, `/marketplace/[id]`, `/marketplace/sell` | Browse and list bikes |
| `/parts`, `/parts/[id]` | Parts catalog |
| `/orders/[id]/success`, `/orders/[id]/cancel` | PayHere return pages |
| `/shop/apply`, `/shop/dashboard` | Shop owner flows |
| `/admin`, `/admin/shops` | Platform admin |

## Quick Start

### 1. Environment

Copy templates into each service (env files are not committed):

```bash
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
```

Set at minimum in `backend/.env`:

1. `DATABASE_URL` — PostgreSQL connection string
2. `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — random strings (≥ 16 chars)
3. `CORS_ORIGINS` — `http://localhost:3000`

Optional until you need those features:

- `REDIS_URL` — caching (gracefully skipped when unset)
- `CLOUDINARY_*` — image uploads
- `BREVO_*` — appointment status emails
- `PAYHERE_MERCHANT_ID` / `PAYHERE_MERCHANT_SECRET` — checkout

In `frontend/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_PAYHERE_CHECKOUT_URL=https://sandbox.payhere.lk/pay/checkout
```

### 2. Backend

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

Health check:

```bash
curl http://localhost:4000/api/v1/health
```

### 3. Frontend

```bash
cd frontend
pnpm install   # or npm install
pnpm dev       # http://localhost:3000
```

Open http://localhost:3000, register an account, or sign in with the seeded admin (`admin@oldtrailbikes.lk` / credentials from `SEED_ADMIN_*` in `.env`).

## API Overview

All routes are prefixed by `API_PREFIX` (default `/api/v1`).

| Module | Prefix | Highlights |
|--------|--------|------------|
| Auth | `/auth` | Register, login, refresh, logout, `/me` |
| Brands | `/brands` | Dirt-bike brand directory |
| Appointments | `/appointments` | Book, list, status transitions, per-plate history |
| Bikes | `/bikes` | Marketplace CRUD, filters, mechanic verification |
| Shops | `/shops` | Apply, admin approve, shop dashboard |
| Parts | `/parts` | Catalog, inventory, shop-scoped CRUD |
| Orders | `/orders` | Cart checkout, PayHere redirect |
| Reviews | `/reviews` | Shop and part reviews |
| Webhooks | `/webhooks` | PayHere payment notifications |

## Further reading

- [`backend/README.md`](backend/README.md) — API layout, migrations, workshop status machine, seed data
