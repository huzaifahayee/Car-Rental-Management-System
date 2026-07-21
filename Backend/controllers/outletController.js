const { validateCoordinates } = require('../utils/geocoding')

// ── Validation helpers ──────────────────────────────────────────────────────

const NAME_MAX_LENGTH = 100
const CITY_MAX_LENGTH = 60
const ADDRESS_MAX_LENGTH = 255

function validateOutletPayload({ name, city, addressText, latitude, longitude }) {
  const errors = []

  // name
  if (!name || typeof name !== 'string' || !name.trim()) {
    errors.push('Outlet name is required.')
  } else if (name.trim().length > NAME_MAX_LENGTH) {
    errors.push(`Outlet name must be ${NAME_MAX_LENGTH} characters or fewer.`)
  }

  // city
  if (!city || typeof city !== 'string' || !city.trim()) {
    errors.push('City is required.')
  } else if (city.trim().length > CITY_MAX_LENGTH) {
    errors.push(`City must be ${CITY_MAX_LENGTH} characters or fewer.`)
  }

  // addressText
  if (!addressText || typeof addressText !== 'string' || !addressText.trim()) {
    errors.push('Address text is required.')
  } else if (addressText.trim().length > ADDRESS_MAX_LENGTH) {
    errors.push(`Address must be ${ADDRESS_MAX_LENGTH} characters or fewer.`)
  }

  // coordinates
  if (latitude == null || longitude == null) {
    errors.push('Latitude and longitude are required.')
  } else {
    const coordCheck = validateCoordinates(Number(latitude), Number(longitude))
    if (!coordCheck.valid) {
      errors.push(coordCheck.message)
    }
  }

  return errors
}

// ── Controllers ─────────────────────────────────────────────────────────────

async function getOutlets(req, res) {
  const { city, isActive } = req.query

  const where = {}
  // Default to active-only for public consumers; allow explicit ?isActive=false for admins
  if (isActive === 'false') {
    where.isActive = false
  } else if (isActive === 'all') {
    // no filter — return both active and inactive
  } else {
    where.isActive = true
  }
  if (city) where.city = city

  try {
    const outlets = await req.prisma.outlet.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })
    res.json(outlets)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch outlets', details: err.message })
  }
}

async function getOutletById(req, res) {
  try {
    const outlet = await req.prisma.outlet.findUnique({
      where: { id: Number(req.params.id) },
    })
    if (!outlet) return res.status(404).json({ error: 'Outlet not found.' })
    res.json(outlet)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch outlet', details: err.message })
  }
}

async function createOutlet(req, res) {
  const { name, city, addressText, latitude, longitude } = req.body

  const errors = validateOutletPayload({ name, city, addressText, latitude, longitude })
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(' ') })
  }

  try {
    const outlet = await req.prisma.outlet.create({
      data: {
        name: name.trim(),
        city: city.trim(),
        addressText: addressText.trim(),
        latitude: Number(latitude),
        longitude: Number(longitude),
      },
    })
    res.status(201).json(outlet)
  } catch (err) {
    res.status(500).json({ error: 'Failed to create outlet', details: err.message })
  }
}

async function updateOutlet(req, res) {
  const { name, city, addressText, latitude, longitude, isActive } = req.body

  const errors = validateOutletPayload({ name, city, addressText, latitude, longitude })
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(' ') })
  }

  try {
    const outlet = await req.prisma.outlet.update({
      where: { id: Number(req.params.id) },
      data: {
        name: name.trim(),
        city: city.trim(),
        addressText: addressText.trim(),
        latitude: Number(latitude),
        longitude: Number(longitude),
        ...(typeof isActive === 'boolean' ? { isActive } : {}),
      },
    })
    res.json(outlet)
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Outlet not found.' })
    }
    res.status(500).json({ error: 'Failed to update outlet', details: err.message })
  }
}

async function deleteOutlet(req, res) {
  try {
    // Soft-delete: deactivate instead of removing rows (preserves booking FK refs)
    const outlet = await req.prisma.outlet.update({
      where: { id: Number(req.params.id) },
      data: { isActive: false },
    })
    res.json({ message: 'Outlet deactivated.', outlet })
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Outlet not found.' })
    }
    res.status(500).json({ error: 'Failed to deactivate outlet', details: err.message })
  }
}

module.exports = { getOutlets, getOutletById, createOutlet, updateOutlet, deleteOutlet }
