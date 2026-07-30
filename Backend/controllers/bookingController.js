const crypto = require('crypto')
const { geocodeAddress, validateCoordinates } = require('../utils/geocoding')

function generateBookingReference() {
  return `GT-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
}

const VALID_RENTAL_MODES = ['WITH_DRIVER', 'SELF_DRIVE']
const ADDRESS_MAX_LENGTH = 255

function getVehicleStatusForBookingStatus(status, booking) {
  const now = new Date()
  if (status === 'COMPLETED') return 'AVAILABLE'
  if (status === 'CANCELLED') {
    const pickup = new Date(booking.pickupDateTime)
    const returnTime = new Date(booking.returnDateTime)
    if (now < pickup || now >= returnTime) return 'AVAILABLE'
    return 'BOOKED'
  }
  return 'BOOKED'
}

async function reconcileOverdueBookings(prisma) {
  const now = new Date()
  const overdueConfirmedBookings = await prisma.booking.findMany({
    where: {
      status: 'CONFIRMED',
      returnDateTime: { lte: now },
    },
    select: {
      id: true,
      vehiclePackageId: true,
      driverId: true,
    },
  })

  if (!overdueConfirmedBookings.length) return

  const bookingIds = overdueConfirmedBookings.map((booking) => booking.id)
  const vehicleIds = [...new Set(overdueConfirmedBookings.map((booking) => booking.vehiclePackageId))]
  const driverIds = [...new Set(overdueConfirmedBookings.map((booking) => booking.driverId).filter(Boolean))]

  await prisma.$transaction([
    prisma.booking.updateMany({
      where: { id: { in: bookingIds } },
      data: { status: 'COMPLETED' },
    }),
    prisma.vehiclePackage.updateMany({
      where: { id: { in: vehicleIds } },
      data: { status: 'AVAILABLE' },
    }),
    ...(driverIds.length ? [prisma.driver.updateMany({
      where: { id: { in: driverIds } },
      data: { status: 'IDLE' },
    })] : []),
  ])
}

async function createBooking(req, res) {
  await reconcileOverdueBookings(req.prisma)

  const {
    vehiclePackageId, pickupDateTime, returnDateTime,
    paymentMethod, paymentReference,
    // New rental-mode fields
    rentalMode,
    pickupAddress, pickupLat, pickupLng,
    dropoffAddress, dropoffLat, dropoffLng,
    outletId,
  } = req.body

  // ── Existing required-field validation (unchanged) ──────────────────────
  if (!vehiclePackageId || !pickupDateTime || !returnDateTime || !paymentMethod) {
    return res.status(400).json({ error: 'vehiclePackageId, pickupDateTime, returnDateTime, and paymentMethod are required.' })
  }

  // ── CNIC required to book ────────────────────────────────────────────────
  // Accounts created before this field existed may not have a CNIC yet, so
  // we check it here rather than at the DB/JWT level, and point the user to
  // their profile instead of hard-blocking them at login.
  const requestingUser = await req.prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { cnic: true },
  })
  if (!requestingUser?.cnic) {
    return res.status(403).json({ error: 'Please add your CNIC to your profile before booking a vehicle.' })
  }

  // ── Rental mode validation ──────────────────────────────────────────────
  if (!rentalMode || !VALID_RENTAL_MODES.includes(rentalMode)) {
    return res.status(400).json({ error: `rentalMode is required and must be one of: ${VALID_RENTAL_MODES.join(', ')}` })
  }

  // Fields that will be spread into the Prisma create
  let locationData = {}

  if (rentalMode === 'WITH_DRIVER') {
    // ── With-Driver: validate geocoded pickup address ────────────────────
    if (!pickupAddress || typeof pickupAddress !== 'string' || !pickupAddress.trim()) {
      return res.status(400).json({ error: 'Pickup address is required for With-Driver bookings.' })
    }
    if (pickupAddress.trim().length > ADDRESS_MAX_LENGTH) {
      return res.status(400).json({ error: `Pickup address must be ${ADDRESS_MAX_LENGTH} characters or fewer.` })
    }
    if (pickupLat == null || pickupLng == null) {
      return res.status(400).json({ error: 'Pickup latitude and longitude are required for With-Driver bookings.' })
    }
    const pickupCoordCheck = validateCoordinates(Number(pickupLat), Number(pickupLng))
    if (!pickupCoordCheck.valid) {
      return res.status(400).json({ error: `Pickup coordinates invalid: ${pickupCoordCheck.message}` })
    }

    // Validate dropoff if provided
    if (dropoffAddress) {
      if (typeof dropoffAddress !== 'string' || dropoffAddress.trim().length > ADDRESS_MAX_LENGTH) {
        return res.status(400).json({ error: `Dropoff address must be a string of ${ADDRESS_MAX_LENGTH} characters or fewer.` })
      }
      if (dropoffLat == null || dropoffLng == null) {
        return res.status(400).json({ error: 'Dropoff latitude and longitude are required when a dropoff address is provided.' })
      }
      const dropoffCoordCheck = validateCoordinates(Number(dropoffLat), Number(dropoffLng))
      if (!dropoffCoordCheck.valid) {
        return res.status(400).json({ error: `Dropoff coordinates invalid: ${dropoffCoordCheck.message}` })
      }
    }

    // Server-side geocoding verification (pickup)
    try {
      const geoResult = await geocodeAddress(pickupAddress.trim())
      if (!geoResult) {
        return res.status(400).json({ error: 'Pickup address could not be verified via geocoding. Please provide a valid, resolvable address.' })
      }
    } catch (geoErr) {
      // If the geocoding API key isn't configured, log and continue with
      // client-supplied coordinates — don't block bookings in dev.
      console.warn('Geocoding verification skipped:', geoErr.message)
    }

    locationData = {
      rentalMode: 'WITH_DRIVER',
      pickupAddress: pickupAddress.trim(),
      pickupLat: Number(pickupLat),
      pickupLng: Number(pickupLng),
      ...(dropoffAddress ? {
        dropoffAddress: dropoffAddress.trim(),
        dropoffLat: Number(dropoffLat),
        dropoffLng: Number(dropoffLng),
      } : {}),
    }
  } else {
    // ── Self-Drive: validate outlet ──────────────────────────────────────
    if (!outletId) {
      return res.status(400).json({ error: 'outletId is required for Self-Drive bookings.' })
    }

    const outlet = await req.prisma.outlet.findUnique({ where: { id: Number(outletId) } })
    if (!outlet) {
      return res.status(400).json({ error: 'Outlet not found.' })
    }
    if (!outlet.isActive) {
      return res.status(400).json({ error: 'The selected outlet is currently inactive.' })
    }

    locationData = {
      rentalMode: 'SELF_DRIVE',
      outletId: Number(outletId),
    }
  }

  // ── Vehicle availability check (unchanged) ─────────────────────────────
  try {
    const vehicle = await req.prisma.vehiclePackage.findUnique({ where: { id: Number(vehiclePackageId) } })
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found.' })
    if (vehicle.status !== 'AVAILABLE') {
      return res.status(409).json({ error: 'This vehicle is not currently available.' })
    }

    const booking = await req.prisma.booking.create({
      data: {
        bookingReference: generateBookingReference(),
        customerId: req.user.userId,
        vehiclePackageId: Number(vehiclePackageId),
        pickupDateTime: new Date(pickupDateTime),
        returnDateTime: new Date(returnDateTime),
        paymentMethod,
        paymentReference,
        ...locationData,
      },
    })
    res.status(201).json(booking)
  } catch (err) {
    res.status(500).json({ error: 'Failed to create booking', details: err.message })
  }
}

// Lightweight polling endpoint for the staff new-booking-request popup —
// returns only PENDING bookings newer than `sinceId`, with minimal fields,
// so the frontend isn't re-fetching the full booking list every few seconds.
async function getNewPendingBookings(req, res) {
  const sinceId = Number(req.query.sinceId) || 0
  try {
    const bookings = await req.prisma.booking.findMany({
      where: { status: 'PENDING', id: { gt: sinceId } },
      select: {
        id: true,
        bookingReference: true,
        createdAt: true,
        customer: { select: { fullName: true } },
        vehiclePackage: { select: { make: true, model: true } },
      },
      orderBy: { id: 'asc' },
    })
    res.json(bookings)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch new bookings', details: err.message })
  }
}

async function getBookings(req, res) {
  try {
    await reconcileOverdueBookings(req.prisma)
    const where = req.user.role === 'CUSTOMER' ? { customerId: req.user.userId } : {}
    const bookings = await req.prisma.booking.findMany({
      where,
      include: {
        vehiclePackage: true,
        customer: { select: { fullName: true, email: true, phone: true, cnic: true } },
        outlet: true,
        driver: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    res.json(bookings)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch bookings', details: err.message })
  }
}

async function updateBookingStatus(req, res) {
  const { status } = req.body
  const validStatuses = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` })
  }

  try {
    await reconcileOverdueBookings(req.prisma)
    const booking = await req.prisma.booking.findUnique({ where: { id: Number(req.params.id) } })
    if (!booking) return res.status(404).json({ error: 'Booking not found.' })

    const vehicleStatus = getVehicleStatusForBookingStatus(status, booking)
    const releaseDriver = ['CANCELLED', 'COMPLETED'].includes(status) && booking.driverId

    const [updatedBooking] = await req.prisma.$transaction([
      req.prisma.booking.update({
        where: { id: Number(req.params.id) },
        data: { status },
        include: {
          customer: { select: { id: true, fullName: true, email: true, phone: true, cnic: true } },
          vehiclePackage: true,
          outlet: true,
          driver: true,
        },
      }),
      req.prisma.vehiclePackage.update({
        where: { id: booking.vehiclePackageId },
        data: { status: vehicleStatus },
      }),
      ...(releaseDriver ? [req.prisma.driver.update({ where: { id: booking.driverId }, data: { status: 'IDLE' } })] : []),
    ])

    res.json(updatedBooking)
  } catch (err) {
    res.status(500).json({ error: 'Failed to update booking status', details: err.message })
  }
}

async function cancelBooking(req, res) {
  try {
    await reconcileOverdueBookings(req.prisma)
    const id = Number(req.params.id)
    const booking = await req.prisma.booking.findUnique({ where: { id } })
    if (!booking) return res.status(404).json({ error: 'Booking not found.' })

    // Only the owning customer may cancel their booking via this endpoint
    if (booking.customerId !== req.user.userId) {
      return res.status(403).json({ error: 'You do not have permission to cancel this booking.' })
    }

    if (['CANCELLED', 'COMPLETED'].includes(booking.status)) {
      return res.status(400).json({ error: `Cannot cancel a booking with status ${booking.status}.` })
    }

    const vehicleStatus = getVehicleStatusForBookingStatus('CANCELLED', booking)
    const [updated] = await req.prisma.$transaction([
      req.prisma.booking.update({
        where: { id },
        data: { status: 'CANCELLED' },
        include: {
          customer: { select: { id: true, fullName: true, email: true, phone: true, cnic: true } },
          vehiclePackage: true,
          outlet: true,
          driver: true,
        },
      }),
      req.prisma.vehiclePackage.update({
        where: { id: booking.vehiclePackageId },
        data: { status: vehicleStatus },
      }),
      ...(booking.driverId ? [req.prisma.driver.update({ where: { id: booking.driverId }, data: { status: 'IDLE' } })] : []),
    ])

    res.json(updated)
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel booking', details: err.message })
  }
}

async function assignDriver(req, res) {
  const { driverId } = req.body
  const id = Number(req.params.id)

  if (!driverId) {
    return res.status(400).json({ error: 'driverId is required.' })
  }

  try {
    const booking = await req.prisma.booking.findUnique({ where: { id } })
    if (!booking) return res.status(404).json({ error: 'Booking not found.' })

    if (booking.rentalMode !== 'WITH_DRIVER') {
      return res.status(400).json({ error: 'A driver can only be assigned to With-Driver bookings.' })
    }
    if (['CANCELLED', 'COMPLETED'].includes(booking.status)) {
      return res.status(400).json({ error: `Cannot assign a driver to a booking with status ${booking.status}.` })
    }

    const driver = await req.prisma.driver.findUnique({ where: { id: Number(driverId) } })
    if (!driver) return res.status(404).json({ error: 'Driver not found.' })
    if (driver.status !== 'IDLE') {
      return res.status(409).json({ error: 'This driver is not currently available.' })
    }

    // Freeing up a previously-assigned driver on this booking (reassignment)
    // so they don't stay stuck as ASSIGNED once replaced.
    const previousDriverId = booking.driverId

    const ops = []
    if (previousDriverId) {
      ops.push(req.prisma.driver.update({ where: { id: previousDriverId }, data: { status: 'IDLE' } }))
    }
    ops.push(req.prisma.driver.update({ where: { id: driver.id }, data: { status: 'ASSIGNED' } }))
    ops.push(req.prisma.booking.update({
      where: { id },
      data: { driverId: driver.id },
      include: {
        customer: { select: { id: true, fullName: true, email: true, phone: true, cnic: true } },
        vehiclePackage: true,
        outlet: true,
        driver: true,
      },
    }))

    const results = await req.prisma.$transaction(ops)
    res.json(results[results.length - 1])
  } catch (err) {
    res.status(500).json({ error: 'Failed to assign driver', details: err.message })
  }
}

async function deleteBooking(req, res) {
  try {
    const id = Number(req.params.id)
    const booking = await req.prisma.booking.findUnique({ where: { id } })
    if (!booking) return res.status(404).json({ error: 'Booking not found.' })

    // Only allow deletion of bookings that are CANCELLED
    if (booking.status !== 'CANCELLED') {
      return res.status(400).json({ error: 'Only bookings with status CANCELLED can be deleted.' })
    }

    await req.prisma.booking.delete({ where: { id } })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete booking', details: err.message })
  }
}

module.exports = { createBooking, getBookings, getNewPendingBookings, updateBookingStatus, cancelBooking, deleteBooking, assignDriver }
