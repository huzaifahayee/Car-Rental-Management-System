# Rental Management System (GariTrip)

A multi-tenant car rental SaaS built with a PERN-style stack:
- **PostgreSQL**
- **Express**
- **React**
- **Node.js**
- **Prisma**

This repository contains:
- `Backend/` — Express API, Prisma ORM, subdomain-based multi-tenant resolver, tenant provisioning, booking workflows, role-based access, and vehicle/driver/outlet management.
- `Frontend/` — React + Vite admin panel and customer-facing rental UI.
- `Resources/` — documentation and agent prompts.

## Key Features

- **True multi-tenancy**: each tenant (agency) gets its own real, isolated Postgres database. Tenants are resolved per-request from the subdomain (`<slug>.yourdomain.com`, or `<slug>.localhost` in dev) via `Backend/middleware/tenantResolver.js`.
- **SuperAdmin tenant management**: SuperAdmin can create, edit, archive/unarchive, and reactivate tenants directly from the admin panel's **Tenants** tab — creating a tenant provisions a brand-new database, runs migrations, and seeds the initial Admin + a synced SuperAdmin account, all atomically (rolled back on any failure). See `Backend/services/tenantProvisioning.js`.
- **SuperAdmin identity sync**: SuperAdmin's account is duplicated (not shared) across every tenant database, and profile/password changes automatically propagate to all of them (`Backend/services/superadminSync.js`).
- Role-based access control: `SUPERADMIN`, `ADMIN`, `EMPLOYEE`, `CUSTOMER`
- Vehicle catalog with make/model/variant/registration plate, image uploads, availability status, and booking lifecycle management
- Driver management (registration, license/CNIC tracking, IDLE/ASSIGNED status) with admin-side assignment to With-Driver bookings
- Admin dashboard for bookings, vehicles, drivers, outlets, users, agency settings, and themes
- Real-time-ish staff notifications: Admin/Employee get a popup for new booking requests while browsing anywhere in the app, with a link straight to the pending booking
- Booking confirmation, cancellation, and completion with automatic vehicle status reconciliation (per-tenant, on a timer, and on demand)
- Outlet-based self-drive rentals and address-based with-driver rentals
- WhatsApp notification integration for booking approvals and cancellations
- Cloudinary image upload support for vehicle media and agency branding (logo)

## Repository Structure

- `Backend/`
  - `server.js` — starts Express server on port `5000`
  - `routes/` — API route definitions
  - `controllers/` — business logic for auth, bookings, vehicles, drivers, outlets, users, tenants, etc.
  - `services/` — tenant provisioning, SuperAdmin cross-tenant sync, booking reconciliation
  - `middleware/` — authentication, subdomain-based tenant resolution, file uploads
  - `prisma/` — schema and migrations (applied to every tenant database)
  - `config/tenants.json` — tenant registry (slug, DB connection string, status); `tenants.example.json` is the template
  - `config/tenantsStore.js` — read/write layer for `tenants.json`, hot-reloaded (no restart needed after tenant changes)
  - `scripts/createAdmin.js` — seed admin/superadmin user for the primary tenant

- `Frontend/`
  - `src/pages/AdminPanel.jsx` — the staff-facing admin panel (bookings, vehicles, drivers, outlets, users, tenants, settings)
  - `src/components/` — shared UI, including `BookingNotifications.jsx` (staff popup) and `AuthAvatar.jsx` (agency logo/avatar)
  - `src/lib/apiClient.js` — derives the backend URL from the current page's hostname, so each tenant subdomain talks to its own backend context
  - `package.json` / `vite.config.js` — Vite app configuration

## Environment Setup

### Backend Environment

Create `Backend/.env` with the following variables:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/your_db_name?schema=public"

# Admin-level connection used only for tenant provisioning (CREATE DATABASE /
# DROP DATABASE on rollback). The role needs CREATEDB privilege — e.g.
# `ALTER ROLE your_user CREATEDB;` — and this should point at the `postgres`
# maintenance database, not an application database.
POSTGRES_ADMIN_URL="postgresql://user:password@localhost:5432/postgres?schema=public"

JWT_SECRET="your_jwt_secret"
CLOUDINARY_CLOUD_NAME="your_cloudinary_cloud_name"
CLOUDINARY_API_KEY="your_cloudinary_api_key"
CLOUDINARY_API_SECRET="your_cloudinary_api_secret"
GOOGLE_GEOCODING_API_KEY="your_google_geocoding_api_key"
```

> This repository uses real multi-tenancy via `Backend/config/tenants.json` — each entry is a separate Postgres database. Copy `Backend/config/tenants.example.json` to `tenants.json` and update the primary tenant's database URL. The primary tenant is marked with `"isPrimary": true`, which must stay on exactly one entry — it's what the server boots against and what a bare hostname (no subdomain) resolves to; it can be renamed/re-slugged safely since `isPrimary` (not the slug) is what's tracked.

### Frontend Environment

Create `Frontend/.env` with the following variables:

```env
# The frontend derives the backend URL from the current page's own hostname
# + this port (e.g. a page on al-rafay-motors.localhost:5173 talks to
# al-rafay-motors.localhost:5000) — required for subdomain-based tenant
# routing to work correctly in dev.
VITE_API_PORT=5000

VITE_GOOGLE_MAPS_API_KEY="your_google_maps_api_key"

# Uncomment to hard-override the backend URL instead (e.g. a deployed
# backend on a different host). When set, this takes priority over the
# hostname-derived URL above and subdomain routing to that backend breaks.
# VITE_API_BASE_URL=http://localhost:5000
```

## Local Setup

### Backend

```bash
cd Backend
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

The backend server will run at:

- `http://localhost:5000`

### Frontend

```bash
cd Frontend
npm install
npm run dev
```

The frontend will run at:

- `http://localhost:5173`

### Testing multiple tenants locally

Modern browsers resolve any `*.localhost` hostname to `127.0.0.1` automatically — no `/etc/hosts` edits needed. To visit a specific tenant in dev, use `http://<slug>.localhost:5173` (e.g. `http://al-rafay-motors.localhost:5173`); a bare `http://localhost:5173` resolves to whichever tenant is marked `isPrimary`. New tenants are created from the admin panel's **Tenants** tab (SuperAdmin only), which provisions a real database for them — no manual setup required.

## Seed Admin User

Run the admin creation script after the backend is configured — this seeds the primary tenant only (the one marked `isPrimary` in `tenants.json`):

```bash
cd Backend
npm run seed:admin
```

## Useful Scripts

### Backend
- `npm run dev` — start backend with nodemon
- `npm start` — start backend with Node
- `npm run seed:admin` — create admin/superadmin seed user for the primary tenant

### Frontend
- `npm run dev` — start the Vite development server
- `npm run build` — build production assets
- `npm run preview` — preview production build

## Notes

- The current frontend `Frontend/README.md` contains the default Vite template README. Use this root README for repository-level setup and project-specific instructions.
- Overdue confirmed bookings are automatically reconciled (marked completed, vehicle freed) on a 5-minute timer across every active tenant. This can also be triggered on demand via `POST /tenants/reconcile` (SuperAdmin only) instead of waiting on the timer.
- An archived tenant's subdomain refuses all requests with a clear "this agency is no longer active" response/page rather than a generic error; archiving never touches the underlying database, so unarchiving restores access immediately.

## License

This repository does not include a license file. Add one if you plan to publish or share this project publicly.
