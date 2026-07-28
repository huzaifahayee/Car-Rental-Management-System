// Shared driver-availability logic — used by both the drivers list endpoint
// (GET /drivers?available=true&...) and driver assignment on bookings, so
// "available" means the same thing in both places: not already assigned to
// another active (PENDING/CONFIRMED) booking whose time range overlaps the
// requested pickup/return window.
//
// Two ranges [aStart, aEnd) and [bStart, bEnd) overlap iff
// aStart < bEnd && bStart < aEnd — expressed below as a Prisma where clause
// rather than pulled into JS, so the DB does the filtering.

const ACTIVE_BOOKING_STATUSES = ['PENDING', 'CONFIRMED']

async function getBusyDriverIds(prisma, pickupDateTime, returnDateTime, excludeBookingId) {
  const pickup = new Date(pickupDateTime)
  const returnTime = new Date(returnDateTime)

  const overlapping = await prisma.booking.findMany({
    where: {
      driverId: { not: null },
      status: { in: ACTIVE_BOOKING_STATUSES },
      ...(excludeBookingId ? { id: { not: Number(excludeBookingId) } } : {}),
      pickupDateTime: { lt: returnTime },
      returnDateTime: { gt: pickup },
    },
    select: { driverId: true },
  })

  return new Set(overlapping.map((booking) => booking.driverId))
}

async function isDriverAvailable(prisma, driverId, pickupDateTime, returnDateTime, excludeBookingId) {
  const driver = await prisma.driver.findUnique({ where: { id: Number(driverId) } })
  if (!driver || driver.status !== 'ACTIVE') return false

  const busyDriverIds = await getBusyDriverIds(prisma, pickupDateTime, returnDateTime, excludeBookingId)
  return !busyDriverIds.has(driver.id)
}

module.exports = { getBusyDriverIds, isDriverAvailable }
