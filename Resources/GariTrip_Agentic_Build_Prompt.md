# GariTrip — Agentic Build Prompt: Rental Mode, Maps & Outlet Locations

> **How to use this file:** Paste this whole document as the task prompt into an
> agentic coding tool (Claude Code, Cursor agent, etc.) with the GariTrip repo
> open as the working directory. It gives the agent the current state, the
> target state, and an ordered execution plan. Work through the phases in
> order — don't skip validation or the migration-safety steps.

---

## 1. Project Context (current state — verified against the repo)

**Repo:** `Car-Rental-Management-System` (GariTrip) — multi-tenant car rental
SaaS. Solo-developer internship project, PERN stack.

- **Stack:** React + Vite (frontend), Express + Node (backend), PostgreSQL via
  Prisma (`Backend/prisma/schema.prisma`), JWT auth (`{ userId, role, tenantId }`).
- **Multi-tenancy:** database-per-tenant. `Backend/middleware/tenantResolver.js`
  resolves `req.tenantId` and hands each request a per-tenant `PrismaClient`
  built from `Backend/config/tenants.json`. **Note:** tenant resolution is
  currently hardcoded to `'default'` (there's a `TODO` to derive it from
  subdomain) — don't "fix" this as a side effect of this feature unless asked;
  just build on top of `req.tenantId` / `req.prisma` as they exist.
- **Roles:** `ADMIN`, `EMPLOYEE`, `CUSTOMER` (enum `Role`).
- **Current Prisma models:** `User`, `VehiclePackage` (category, make, model,
  seatingCapacity, transmission, hasAC, `driverOption: Boolean`, pricePerDay,
  pickupCity, dropoffCity, status, imageUrls), `Booking` (bookingReference,
  status, pickupDateTime, returnDateTime, paymentMethod, paymentReference,
  customerId, vehiclePackageId), `Settings` (agency profile + theme palette).
- **Frontend pages:** `Home.jsx` (hero search card with a `tripType` radio —
  `within` / `out` — plus pickup/dropoff text inputs and datetime pickers),
  `SearchResults.jsx`, `BookVehicle.jsx` (booking form: dates, payment method),
  `AdminPanel.jsx`, `MyBookings.jsx`, `Login.jsx` / `Register.jsx`.
- **Validation today:** `Frontend/src/lib/validation.js` has email/phone/password
  checks. Backend validation is done ad hoc per controller. There is **no**
  geocoding, no maps SDK, and no outlet/branch-location concept anywhere in the
  codebase yet.
- **Governing spec:** `GariTrip_System_SRS_v3.1.docx` (just updated). This
  prompt implements SRS sections 3.8, 4.2.11, 4.2.12, 4.3.5 (FR-5.5), 4.3.6
  (FR-6.1/FR-6.4), 4.3.11, 4.3.12.

---

## 2. What Changes — Target State

Add a **second toggle** on the home page, alongside the existing
Within City / Out of City `tripType`:

**Rental Mode: With-Driver ⟷ Self-Drive**

- **With-Driver** — customer types *any* pickup location and (optionally)
  drop-off location — not restricted to a city name (e.g. their home address).
  Location is captured via **map-based autocomplete + geocoding** so it's
  accurate (resolved to lat/lng), not just free text. Date/time fields stay
  as they are today.
- **Self-Drive (Without Driver)** — customer does **not** type a free address.
  Instead they pick one of the tenant's own **outlet/branch locations**
  (e.g. "Lahore – DHA Branch", "Lahore – Gulberg Branch", "Karachi – Clifton
  Branch"), which the Client Admin/Employee configures ahead of time. Each
  outlet is shown on a map with a "Get Directions" link.

This requires:
1. A new **Outlet** entity (per-tenant), with full CRUD for Admin/Employee.
2. **Booking** gains a `rentalMode` and either a geocoded address pair
   (With-Driver) or an `outletId` reference (Self-Drive).
3. A **maps/geocoding integration** (Google Maps Platform: Places
   Autocomplete + Geocoding API + Maps JavaScript API, or an equivalent —
   pick one and be consistent).
4. Field-level validation on every new input, front **and** back — this is a
   standing priority for this project, not just a nice-to-have for this
   feature.

---

## 3. Non-Negotiable Constraints

- Do **not** change the multi-tenant, database-per-tenant architecture, or
  the JWT payload shape.
- Do **not** remove or break the existing `tripType` (Within City / Out of
  City) toggle, the existing booking flow, or existing endpoints — this is
  additive.
- Match existing code conventions: controller/route/middleware split on the
  backend, Prisma for all DB access, inline style objects in JSX on the
  frontend (don't introduce a new styling system for this feature alone),
  `apiFetch` wrapper for API calls.
- Every new field needs **format, strength/sanity, and presence** validation
  on both frontend and backend — not just "is it present." (E.g., lat/lng
  must be in valid ranges; an address must actually resolve via geocoding
  before a booking is accepted; outlet names have sane length limits.)
- Secrets (maps API key) go in `.env` / `.env.example`, never hardcoded.
- Prisma schema changes must be additive, nullable-first migrations (mirror
  the pattern already used for `bookingReference`/`paymentMethod`: add
  nullable → backfill/default → tighten later if needed) so existing data
  and existing bookings aren't broken.

---

## 4. Step-by-Step Execution Plan

Work phase by phase. Each phase should end in a working, testable state —
don't move on with a broken build.

### Phase 0 — Setup & decisions
1. Confirm which maps provider to use (default assumption: **Google Maps
   Platform** — Places Autocomplete for input, Geocoding API for server-side
   verification, Maps JavaScript API for display). Add `GOOGLE_MAPS_API_KEY`
   (frontend, restricted by HTTP referrer) and `GOOGLE_GEOCODING_API_KEY`
   (backend, restricted by API + IP if possible) to `.env.example` for both
   `Backend/` and `Frontend/`.
2. Add the JS SDK dependency to `Frontend/package.json` (e.g.
   `@react-google-maps/api`) and a lightweight geocoding HTTP client on the
   backend (plain `fetch` to the Geocoding REST endpoint is fine — no need
   for a heavy SDK).

### Phase 1 — Data model (`Backend/prisma/schema.prisma`)
1. Add enum `RentalMode { WITH_DRIVER SELF_DRIVE }`.
2. Add model `Outlet`:
   - `id`, `name`, `city`, `addressText`, `latitude Float`, `longitude Float`,
     `isActive Boolean @default(true)`, `createdAt`.
   - Relation: `bookings Booking[]` (optional back-reference).
3. Extend `Booking`:
   - `rentalMode RentalMode` (default `SELF_DRIVE` on the nullable-first pass
     if backfilling existing rows, then tighten).
   - `pickupAddress String?`, `pickupLat Float?`, `pickupLng Float?`,
     `dropoffAddress String?`, `dropoffLat Float?`, `dropoffLng Float?`
     (used when `rentalMode = WITH_DRIVER`).
   - `outletId Int?` + relation to `Outlet` (used when
     `rentalMode = SELF_DRIVE`).
4. Write the migration following the existing nullable-first → backfill →
   tighten pattern used for `bookingReference`/`paymentMethod`. Run
   `prisma migrate dev` locally and verify against a dev DB before touching
   anything else.
5. Add a DB-level (or application-level, documented either way) check that
   exactly one of `{pickup/dropoff address fields}` or `{outletId}` is
   populated depending on `rentalMode` — enforce this in the controller layer
   at minimum (Phase 3), since Postgres CHECK constraints across nullable
   groups add complexity you may not want mid-sprint.

### Phase 2 — Backend: Outlet management
1. `Backend/controllers/outletController.js`: `getOutlets` (public, filter by
   `isActive` and optionally `city`), `getOutletById`, `createOutlet`,
   `updateOutlet`, `deleteOutlet` (or soft-delete via `isActive = false`).
2. `Backend/routes/outlets.js`: `GET /` and `GET /:id` open; `POST`, `PUT
   /:id`, `DELETE /:id` behind `authenticate, authorize('ADMIN','EMPLOYEE')`
   — mirror `routes/vehicles.js` exactly for consistency.
3. Validation in the controller: `name` and `city` required, reasonable
   length caps; `addressText` required; `latitude` in `[-90, 90]`,
   `longitude` in `[-180, 180]`; reject if missing/out of range with a clear
   error message (match the style of existing error responses).
4. Register the route in `Backend/server.js` alongside the other routers.

### Phase 3 — Backend: Booking creation updated for rental mode
1. In `bookingController.createBooking`, accept `rentalMode` and, depending
   on its value, either the `{pickupAddress, pickupLat, pickupLng,
   dropoffAddress?, dropoffLat?, dropoffLng?}` group or `{outletId}`.
2. **Server-side geocoding verification for With-Driver:** don't trust
   client-supplied coordinates blindly — call the Geocoding API server-side
   to confirm the submitted address resolves, and reject the booking with a
   clear validation error if it doesn't (mirrors SRS FR-11.2/FR-11.3). If you
   already trust the frontend's Places Autocomplete `place_id` /
   `geometry.location`, at minimum validate the payload shape and coordinate
   ranges; server-side re-geocoding is the stronger option and matches the
   SRS — prefer it if time allows.
3. For Self-Drive, validate `outletId` exists, belongs to the resolved
   tenant, and `isActive === true`; reject otherwise.
4. Keep all existing date/time and payment validation as-is; just extend the
   payload and the Prisma `create` call.

### Phase 4 — Frontend: Home page rental-mode toggle
1. In `Home.jsx`, add a second radio group next to the existing `tripType`
   one: `rentalMode` state (`'withDriver' | 'selfDrive'`), styled consistently
   with the existing pill/radio pattern.
2. **With-Driver branch:** replace the plain pickup/drop-off text `<input>`s
   with a Places Autocomplete-backed input (keep the same visual card/field
   layout). On selection, store `{address, lat, lng}` in state instead of a
   raw string. Keep the existing datetime fields unchanged.
3. **Self-Drive branch:** replace the free-text location inputs with a
   dropdown/selector populated from `GET /outlets?city=...` (fetched via
   `apiFetch`), showing outlet name + city. Selecting one stores `outletId`.
4. Carry the chosen `rentalMode` (and its resolved location data) forward
   into the `/search` navigation — either via route state or query params,
   consistent with however `tripType` is currently passed (check
   `SearchResults.jsx` for the existing pattern and match it).

### Phase 5 — Frontend: Search & booking flow
1. `SearchResults.jsx`: read `rentalMode` from the incoming search
   params/state; if `withDriver`, show the resolved pickup/drop-off text and
   a small confirmation map; if `selfDrive`, show the selected outlet name
   and an embedded map pin with a "Get Directions" link (deep link to
   `https://www.google.com/maps/dir/?api=1&destination=lat,lng`).
2. `BookVehicle.jsx`: extend the booking submission payload to include
   `rentalMode` and the corresponding location fields/`outletId` collected
   upstream, then send them in the `POST /bookings` call. Add matching
   client-side validation (don't submit if a With-Driver address wasn't
   resolved to coordinates, or a Self-Drive outlet wasn't selected) with
   inline error messages consistent with the existing `error` state pattern
   in that file.

### Phase 6 — Frontend: Admin outlet management
1. Add an "Outlets" section to `AdminPanel.jsx` (or a new
   `pages/AdminOutlets.jsx` if `AdminPanel.jsx` is already large — match
   whichever pattern the file's current size suggests): list, create, edit,
   deactivate outlets. Include a small embedded map for picking
   latitude/longitude when creating/editing (Places Autocomplete search box
   over a draggable map marker is the standard UX for this).
2. Client-side validation mirroring the backend rules from Phase 2 (name/city
   presence + length, address presence, marker must be placed before save).

### Phase 7 — Validation pass (do this even though earlier phases include
inline validation — this is a dedicated review pass)
1. Walk every new field added in Phases 1–6 and confirm it has: presence
   check, format/type check, and a sanity/range check where applicable
   (coordinates, string lengths, enum membership) — on **both** frontend and
   backend, not just one side.
2. Confirm error messages are specific and actionable (matches this
   project's existing standard, e.g. the phone/password validators in
   `validation.js`).
3. Confirm tenant scoping: outlet endpoints and booking creation must only
   ever read/write within `req.tenantId`'s database — no cross-tenant leakage.

### Phase 8 — Manual QA checklist
- [ ] Within City + With-Driver: enter a home address, confirm autocomplete
      suggestions appear, confirm booking stores lat/lng + formatted address.
- [ ] Out of City + With-Driver: same, with a drop-off in a different city.
- [ ] Self-Drive with no outlets configured for the tenant: UI shows a clear
      "no outlets available" state, doesn't crash, booking is blocked.
- [ ] Self-Drive with outlets configured: selecting one shows it on the map,
      "Get Directions" opens correctly, booking stores `outletId`.
- [ ] Attempt to submit a With-Driver booking with an unresolvable address →
      rejected with a clear error, no booking created.
- [ ] Attempt to hit `POST /outlets` as a `CUSTOMER` role → 403.
- [ ] Attempt to hit `POST /outlets` with out-of-range latitude/longitude →
      400 with a clear message.
- [ ] Existing Within/Out-of-City booking flow (pre-existing behavior) still
      works unchanged.
- [ ] Run `prisma migrate dev` against a fresh DB and against a DB with
      existing bookings — confirm no data loss/errors either way.

### Phase 9 — Docs & tracking
1. Update `Backend/config/tenants.example.json` / README if new env vars are
   required for local setup.
2. Add/adjust JIRA subtasks under the relevant Feature to reflect Phases
   0–8 above (Outlet CRUD, Maps integration, Rental mode toggle, Booking
   payload extension, Validation pass), matching the existing Feature →
   Story → Subtask hierarchy.
3. Cross-check the finished implementation against `GariTrip_System_SRS_v3.1.docx`
   sections 4.2.11, 4.2.12, 4.3.5, 4.3.6, 4.3.11, 4.3.12 — every MLR/FR in
   those sections should map to something you built.

---

## 5. Definition of Done

- A customer can complete a booking end-to-end in both With-Driver and
  Self-Drive modes, for both Within-City and Out-of-City trip types.
- An Admin/Employee can create, edit, and deactivate outlets, and those
  changes are immediately reflected in the Self-Drive picker.
- No unvalidated input reaches the database on any new endpoint.
- No existing feature (theming, auth, existing booking flow, dashboard)
  regresses.
- Migration is safe to run against the existing dev database.
