const { uploadBufferToCloudinary } = require('../utils/cloudinaryUpload')

const PLATE_REGEX = /^[A-Z]{3}-\d{4}$/

function validatePlateAndImages({ registrationPlate, imageUrls }) {
  const errors = []
  if (!registrationPlate || typeof registrationPlate !== 'string' || !PLATE_REGEX.test(registrationPlate.trim())) {
    errors.push('Registration plate is required and must be 3 letters followed by 4 digits, e.g. ABC-1234.')
  }
  if (!Array.isArray(imageUrls) || imageUrls.filter(url => typeof url === 'string' && url.trim()).length === 0) {
    errors.push('At least one vehicle image (uploaded file or image URL) is required.')
  }
  return errors
}
async function reconcileVehicleStatuses(req, res, next) {
  try {
    const confirmedBookings = await req.prisma.booking.findMany({
      where: { status: 'CONFIRMED' },
      select: { vehiclePackageId: true },
    })

    const confirmedVehicleIds = [...new Set(confirmedBookings.map((booking) => booking.vehiclePackageId))]

    await req.prisma.vehiclePackage.updateMany({
      where: { id: { in: confirmedVehicleIds }, status: 'AVAILABLE' },
      data: { status: 'BOOKED' },
    })
  } catch (err) {
    console.error('Failed to reconcile vehicle statuses:', err.message)
  }
  next()
}

async function getVehicles(req, res) {
  await reconcileVehicleStatuses(req, res, () => {})
  const { pickupCity, category, transmission, hasAC, minPrice, maxPrice, status, sort } = req.query

  const where = { isArchived: false }

  if (pickupCity) where.pickupCity = pickupCity
  if (category) where.category = category
  if (transmission) where.transmission = transmission
  if (hasAC !== undefined) where.hasAC = hasAC === 'true'
  if (status) where.status = status

  if (minPrice || maxPrice) {
    where.pricePerDay = {}
    if (minPrice) where.pricePerDay.gte = Number(minPrice)
    if (maxPrice) where.pricePerDay.lte = Number(maxPrice)
  }

  let orderBy = { createdAt: 'desc' }
  if (sort === 'price_asc') orderBy = { pricePerDay: 'asc' }
  if (sort === 'price_desc') orderBy = { pricePerDay: 'desc' }

  try {
    const vehicles = await req.prisma.vehiclePackage.findMany({ where, orderBy })
    res.json(vehicles)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch vehicles', details: err.message })
  }
}

async function getVehicleById(req, res) {
  try {
    const vehicle = await req.prisma.vehiclePackage.findUnique({ where: { id: Number(req.params.id) } })
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found.' })
    res.json(vehicle)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch vehicle', details: err.message })
  }
}

async function createVehicle(req, res) {
  const { category, make, model, variant, year, registrationPlate, seatingCapacity, transmission, hasAC, driverOption, pricePerDay, pickupCity, dropoffCity, imageUrls } = req.body
  if (!category || !make || !model || !seatingCapacity || !transmission || pricePerDay == null || !pickupCity || !dropoffCity) {
    return res.status(400).json({ error: 'Missing required vehicle fields.' })
  }

  const errors = validatePlateAndImages({ registrationPlate, imageUrls })
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(' ') })
  }

  try {
    const vehicle = await req.prisma.vehiclePackage.create({
      data: {
        category,
        make,
        model,
        variant: variant || null,
        year: year != null ? Number(year) : null,
        registrationPlate: registrationPlate.trim().toUpperCase(),
        seatingCapacity,
        transmission,
        hasAC,
        driverOption,
        pricePerDay,
        pickupCity,
        dropoffCity,
        imageUrls: Array.isArray(imageUrls) ? imageUrls : [],
      },
    })
    res.status(201).json(vehicle)
  } catch (err) {
    res.status(500).json({ error: 'Failed to create vehicle', details: err.message })
  }
}

async function updateVehicle(req, res) {
  const { category, make, model, variant, year, registrationPlate, seatingCapacity, transmission, hasAC, driverOption, pricePerDay, pickupCity, dropoffCity, status, imageUrls } = req.body

  const errors = []
  if (registrationPlate !== undefined && (!registrationPlate || !PLATE_REGEX.test(registrationPlate.trim()))) {
    errors.push('Registration plate is required and must be 3 letters followed by 4 digits, e.g. ABC-1234.')
  }
  if (imageUrls !== undefined && (!Array.isArray(imageUrls) || imageUrls.filter(url => typeof url === 'string' && url.trim()).length === 0)) {
    errors.push('At least one vehicle image (uploaded file or image URL) is required.')
  }
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(' ') })
  }

  try {
    const updateData = {
      category, make, model,
      variant: variant !== undefined ? (variant || null) : undefined,
      year: year !== undefined ? (year != null ? Number(year) : null) : undefined,
      registrationPlate: registrationPlate !== undefined ? registrationPlate.trim().toUpperCase() : undefined,
      seatingCapacity, transmission, hasAC, driverOption, pricePerDay, pickupCity, dropoffCity, status,
    }
    if (Array.isArray(imageUrls)) {
      updateData.imageUrls = imageUrls
    }
    const vehicle = await req.prisma.vehiclePackage.update({
      where: { id: Number(req.params.id) },
      data: updateData,
    })
    res.json(vehicle)
  } catch (err) {
    res.status(500).json({ error: 'Failed to update vehicle', details: err.message })
  }
}

async function deleteVehicle(req, res) {
  try {
    const vehicle = await req.prisma.vehiclePackage.findUnique({
      where: { id: Number(req.params.id) },
    })
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found.' })

    if (vehicle.status !== 'AVAILABLE') {
      return res.status(400).json({
        error: 'Only available vehicles can be deleted. Booked or unavailable vehicles must stay in the fleet.',
      })
    }

    const activeBooking = await req.prisma.booking.findFirst({
      where: {
        vehiclePackageId: vehicle.id,
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
    })
    if (activeBooking) {
      return res.status(400).json({ error: 'Cannot delete a vehicle with active bookings.' })
    }

    await req.prisma.vehiclePackage.update({
      where: { id: vehicle.id },
      data: { isArchived: true },
    })
    res.status(204).send()
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete vehicle', details: err.message })
  }
}
async function uploadVehicleImages(req, res) {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No images uploaded.' })
  }
  try {
    const uploadResults = await Promise.all(
      req.files.map((file) => uploadBufferToCloudinary(file.buffer, 'garitrip/vehicles'))
    )
    const newUrls = uploadResults.map((result) => result.secure_url)
    const vehicle = await req.prisma.vehiclePackage.update({
      where: { id: Number(req.params.id) },
      data: { imageUrls: { push: newUrls } },
    })
    res.json(vehicle)
  } catch (err) {
    console.error('Vehicle image upload failed:', err)
    res.status(500).json({ error: 'Failed to upload images', details: err.message })
  }
}

// Uploads a single image ahead of vehicle create/update (no vehicle id needed
// yet) so the resulting URL can be included in the same create/update
// request — letting that request validate "image required" atomically
// instead of relying on a second follow-up call.
async function uploadVehicleImageStandalone(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'No image uploaded.' })
  }
  try {
    const result = await uploadBufferToCloudinary(req.file.buffer, 'garitrip/vehicles')
    res.json({ url: result.secure_url })
  } catch (err) {
    console.error('Vehicle image upload failed:', err)
    res.status(500).json({ error: 'Failed to upload image', details: err.message })
  }
}

module.exports = { getVehicles, getVehicleById, createVehicle, updateVehicle, deleteVehicle, uploadVehicleImages, uploadVehicleImageStandalone }