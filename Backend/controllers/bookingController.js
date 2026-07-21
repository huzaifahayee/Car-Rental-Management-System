const crypto = require('crypto')
const { geocodeAddress, validateCoordinates } = require('../utils/geocoding')

function generateBookingReference() {
  return `GT-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
}

const VALID_RENTAL_MODES = ['WITH_DRIVER', 'SELF_DRIVE']
const ADDRESS_MAX_LENGTH = 255

async function createBooking(req, res) {
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

async function getBookings(req, res) {
  try {
    const where = req.user.role === 'CUSTOMER' ? { customerId: req.user.userId } : {}
    const bookings = await req.prisma.booking.findMany({
      where,
      include: {
        vehiclePackage: true,
        customer: { select: { fullName: true, phone: true } },
        outlet: true,
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
    const booking = await req.prisma.booking.update({
      where: { id: Number(req.params.id) }, data: { status },
    })
    res.json(booking)
  } catch (err) {
    res.status(500).json({ error: 'Failed to update booking status', details: err.message })
  }
}

module.exports = { createBooking, getBookings, updateBookingStatus }
