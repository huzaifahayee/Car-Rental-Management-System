# Rental Management System

A multi-tenant car rental management platform built with a PERN-style stack:
- **PostgreSQL**
- **Express**
- **React**
- **Node.js**
- **Prisma**

This repository contains:
- `Backend/` — Express API, Prisma ORM, multi-tenant resolver, booking workflows, role-based access, and vehicle/outlet management.
- `Frontend/` — React + Vite admin and customer-facing rental UI.
- `Resources/` — documentation and agent prompts.

## Key Features

- Multi-tenancy with isolated tenant databases via `Backend/middleware/tenantResolver.js`
- Role-based access control: `SUPERADMIN`, `ADMIN`, `EMPLOYEE`, `CUSTOMER`
- Vehicle catalog, availability status, and booking lifecycle management
- Admin dashboard for bookings, vehicles, outlets, and users
- Booking confirmation, cancellation, and completion with vehicle status reconciliation
- Outlet-based self-drive rentals and address-based with-driver rentals
- WhatsApp notification integration for booking approvals and cancellations
- Cloudinary image upload support for vehicle media

## Repository Structure

- `Backend/`
  - `server.js` — starts Express server on port `5000`
  - `routes/` — API route definitions
  - `controllers/` — business logic for auth, bookings, vehicles, outlets, users, etc.
  - `middleware/` — authentication, tenant resolution, and file uploads
  - `prisma/` — schema and migrations
  - `config/tenants.example.json` — sample tenant setup
  - `scripts/createAdmin.js` — seed admin user

- `Frontend/`
  - `src/` — React pages, components, context, and helpers
  - `package.json` — Vite app configuration
  - `vite.config.js` — frontend build setup

## Environment Setup

### Backend Environment

Create `Backend/.env` with the following variables:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/your_db_name?schema=public"
JWT_SECRET="your_jwt_secret"
CLOUDINARY_CLOUD_NAME="your_cloudinary_cloud_name"
CLOUDINARY_API_KEY="your_cloudinary_api_key"
CLOUDINARY_API_SECRET="your_cloudinary_api_secret"
GOOGLE_GEOCODING_API_KEY="your_google_geocoding_api_key"
```

> Note: This repository uses multi-tenancy via `Backend/config/tenants.json`. Copy `Backend/config/tenants.example.json` and update the tenant database URL(s) as needed.

### Frontend Environment

Create `Frontend/.env` with the following variables:

```env
VITE_API_BASE_URL="http://localhost:5000"
VITE_GOOGLE_MAPS_API_KEY="your_google_maps_api_key"
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

## Seed Admin User

Run the admin creation script after the backend is configured:

```bash
cd Backend
npm run seed:admin
```

## Useful Scripts

### Backend
- `npm run dev` — start backend with nodemon
- `npm start` — start backend with Node
- `npm run seed:admin` — create admin seed user

### Frontend
- `npm run dev` — start the Vite development server
- `npm run build` — build production assets
- `npm run preview` — preview production build

## Notes

- The current frontend `Frontend/README.md` contains the default Vite template README. Use this root README for repository-level setup and project-specific instructions.
- The backend periodically reconciles overdue confirmed bookings and automatically marks them as completed while freeing up vehicle availability.

## License

This repository does not include a license file. Add one if you plan to publish or share this project publicly.
