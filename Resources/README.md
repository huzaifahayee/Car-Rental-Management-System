# GariTrip — Car Rental Management System

GariTrip is a multi-tenant car rental SaaS platform built with the PERN stack (PostgreSQL, Express, React, Node.js, Prisma).

---

## Features

- **Multi-Tenancy**: Isolated database per agency tenant via `tenantResolver.js`.
- **Role-Based Access Control (RBAC)**: `ADMIN`, `EMPLOYEE`, and `CUSTOMER` roles.
- **Rental Modes**:
  - **With-Driver**: Customer inputs free-form pickup/drop-off addresses with **Google Places Autocomplete** and server-side geocoding verification.
  - **Self-Drive**: Customer selects an agency **Outlet / Branch location** with dynamic location preview and a **Get Directions** Google Maps deep link.
- **Outlet Management**: Full CRUD interface in the Admin Panel for branch location management with location autocomplete.
- **Vehicle Catalog & Booking**: Search, filter by category/transmission/AC, live availability, and manual payment reference tracking.

---

## Environment Configuration

### Backend (`Backend/.env`)
```env
DATABASE_URL="postgresql://user:password@localhost:5432/garitrip_dev?schema=public"
JWT_SECRET="your_jwt_secret_here"
CLOUDINARY_CLOUD_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"

# Google Maps Geocoding API Key (server-side verification)
GOOGLE_GEOCODING_API_KEY="your_google_geocoding_api_key"
```

### Frontend (`Frontend/.env`)
```env
VITE_API_BASE_URL="http://localhost:5000"

# Google Maps Places Autocomplete & JS SDK (client-side)
VITE_GOOGLE_MAPS_API_KEY="your_google_maps_api_key"
```

---

## Setup & Running Locally

1. **Install Dependencies**:
   ```bash
   cd Backend && npm install
   cd ../Frontend && npm install
   ```

2. **Database Migration & Client Generation**:
   ```bash
   cd Backend
   npx prisma migrate dev
   npx prisma generate
   ```

3. **Start Development Servers**:
   ```bash
   # Terminal 1 — Backend
   cd Backend && node server.js

   # Terminal 2 — Frontend
   cd Frontend && npm run dev
   ```
