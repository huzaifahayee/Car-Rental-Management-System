async function getDashboardStats(req, res) {
  try {
    const bookingCounts = await req.prisma.booking.groupBy({
      by: ['status'],
      _count: true,
    })

    const vehicleCounts = await req.prisma.vehiclePackage.groupBy({
      by: ['status'],
      _count: true,
    })

    const bookingStatuses = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']
    const vehicleStatuses = ['AVAILABLE', 'BOOKED', 'MAINTENANCE', 'INACTIVE']

    const bookings = Object.fromEntries(bookingStatuses.map((s) => [s, 0]))
    bookingCounts.forEach((row) => {
      bookings[row.status] = row._count
    })

    const vehicles = Object.fromEntries(vehicleStatuses.map((s) => [s, 0]))
    vehicleCounts.forEach((row) => {
      vehicles[row.status] = row._count
    })

    res.json({ bookings, vehicles })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch dashboard stats', details: err.message })
  }
}

module.exports = { getDashboardStats }