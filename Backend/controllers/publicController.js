async function getPublicStats(req, res) {
  try {
    // total vehicle packages (used as 'Car Vendors' approximate)
    const vehiclesCount = await req.prisma.vehiclePackage.count()

    // distinct cities covered (groupBy city)
    const cityGroups = await req.prisma.outlet.groupBy({ by: ['city'] })
    const citiesCount = cityGroups.length

    // completed bookings as 'happy travelers' proxy
    const completedBookings = await req.prisma.booking.count({ where: { status: 'COMPLETED' } })

    res.json({ vehiclesCount, citiesCount, completedBookings })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch public stats', details: err.message })
  }
}

module.exports = { getPublicStats }
