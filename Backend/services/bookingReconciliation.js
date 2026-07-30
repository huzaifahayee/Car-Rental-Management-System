// Releases vehicles from CONFIRMED bookings whose return time has passed,
// marking the booking COMPLETED. Runs on a timer (server.js) across every
// ACTIVE tenant, and can also be triggered on demand (see
// POST /tenants/reconcile) for testing/ops without waiting on the timer.

const tenantsStore = require('../config/tenantsStore')
const tenantResolver = require('../middleware/tenantResolver')

async function reconcileOverdueBookingsForTenant(tenantId, prisma) {
  const now = new Date()
  const overdueConfirmedBookings = await prisma.booking.findMany({
    where: { status: 'CONFIRMED', returnDateTime: { lte: now } },
    select: { id: true, vehiclePackageId: true },
  })

  if (!overdueConfirmedBookings.length) {
    return { tenantId, reconciledCount: 0 }
  }

  const bookingIds = overdueConfirmedBookings.map((booking) => booking.id)
  const vehicleIds = [...new Set(overdueConfirmedBookings.map((booking) => booking.vehiclePackageId))]

  await prisma.$transaction([
    prisma.booking.updateMany({ where: { id: { in: bookingIds } }, data: { status: 'COMPLETED' } }),
    prisma.vehiclePackage.updateMany({ where: { id: { in: vehicleIds } }, data: { status: 'AVAILABLE' } }),
  ])

  console.log(`[${tenantId}] Reconciled ${bookingIds.length} overdue booking(s) at ${now.toISOString()}`)
  return { tenantId, reconciledCount: bookingIds.length }
}

// Re-reads the tenant list on every call (cheap — in-memory) so tenants
// created/archived after boot are picked up without a server restart.
// Returns a per-tenant summary so callers (the timer, or the manual
// endpoint) can see exactly what happened.
async function reconcileOverdueBookingsAllTenants() {
  const tenants = tenantsStore.getAllTenants()
  const results = []

  for (const [tenantId, tenant] of Object.entries(tenants)) {
    if (tenant.status !== 'ACTIVE') {
      results.push({ tenantId, skipped: true, reason: `status is ${tenant.status}` })
      continue
    }
    try {
      const prisma = tenantResolver.getPrismaClientForTenant(tenantId)
      results.push(await reconcileOverdueBookingsForTenant(tenantId, prisma))
    } catch (err) {
      console.error(`[${tenantId}] Failed to reconcile overdue bookings:`, err.message)
      results.push({ tenantId, error: err.message })
    }
  }

  return results
}

module.exports = { reconcileOverdueBookingsForTenant, reconcileOverdueBookingsAllTenants }
