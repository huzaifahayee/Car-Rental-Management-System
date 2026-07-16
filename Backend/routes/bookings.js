const express = require('express')
const { authenticate, authorize } = require('../middleware/auth')

const router = express.Router()

router.post('/', authenticate, authorize('CUSTOMER'), async (req, res) => {
  const { vehiclePackageId, pickupDateTime, returnDateTime, paymentReference } = req.body

  if (!vehiclePackageId || !pickupDateTime || !returnDateTime) {
    return res.status(400).json({ error: 'vehiclePackageId, pickupDateTime, and returnDateTime are required.' })
  }

  try {
    const vehicle = await req.prisma.vehiclePackage.findUnique({
      where: { id: Number(vehiclePackageId) },
    })

    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found.' })
    }

    if (vehicle.status !== 'AVAILABLE') {
      return res.status(409).json({ error: 'This vehicle is not currently available.' })
    }

    const booking = await req.prisma.booking.create({
      data: {
        customerId: req.user.userId,
        vehiclePackageId: Number(vehiclePackageId),
        pickupDateTime: new Date(pickupDateTime),
        returnDateTime: new Date(returnDateTime),
        paymentReference,
      },
    })

    res.status(201).json(booking)
  } catch (err) {
    res.status(500).json({ error: 'Failed to create booking', details: err.message })
  }
})

router.get('/', authenticate, async (req, res) => {
  try {
    const where = req.user.role === 'CUSTOMER' ? { customerId: req.user.userId } : {}

    const bookings = await req.prisma.booking.findMany({
      where,
      include: { vehiclePackage: true },
    })

    res.json(bookings)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch bookings', details: err.message })
  }
})

router.put('/:id/status', authenticate, authorize('ADMIN', 'EMPLOYEE'), async (req, res) => {
  const { status } = req.body
  const validStatuses = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` })
  }

  try {
    const booking = await req.prisma.booking.update({
      where: { id: Number(req.params.id) },
      data: { status },
    })
    res.json(booking)
  } catch (err) {
    res.status(500).json({ error: 'Failed to update booking status', details: err.message })
  }
})

module.exports = router