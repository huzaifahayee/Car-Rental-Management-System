// Same conventions as userController.js's fullName/phone validation
const NAME_REGEX = /^[\p{L}][\p{L}\s.'-]*$/u
const PHONE_REGEX = /^(\+92|92|0)3\d{9}$/
const CNIC_REGEX = /^\d{5}-\d{7}-\d{1}$/
// City/authority code - 4-digit year - 4-7 digit sequence, e.g. LHR-2024-123456
const LICENSE_REGEX = /^[A-Za-z]{3}-\d{4}-\d{4,7}$/
const VALID_STATUSES = ['IDLE', 'ASSIGNED', 'INACTIVE']

function validateDriverPayload({ fullName, phone, cnic, licenseNumber, licenseExpiry }) {
  const errors = []

  if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
    errors.push('Full name is required.')
  } else {
    const trimmedName = fullName.trim().replace(/\s+/g, ' ')
    if (trimmedName.length < 2 || trimmedName.length > 100 || !NAME_REGEX.test(trimmedName)) {
      errors.push('Full name must be 2-100 characters and use letters, spaces, apostrophes, or hyphens only.')
    }
  }

  if (!phone || typeof phone !== 'string' || !phone.trim()) {
    errors.push('Phone number is required.')
  } else {
    const strippedPhone = phone.trim().replace(/[\s()-]/g, '')
    if (!PHONE_REGEX.test(strippedPhone)) {
      errors.push('Enter a valid Pakistani mobile number (e.g. 03001234567 or +923001234567).')
    }
  }

  if (!cnic || typeof cnic !== 'string' || !CNIC_REGEX.test(cnic.trim())) {
    errors.push('Enter a valid CNIC in the format 12345-1234567-1.')
  }

  if (!licenseNumber || typeof licenseNumber !== 'string' || !LICENSE_REGEX.test(licenseNumber.trim())) {
    errors.push('Enter a valid license number in the format LHR-2024-123456 (city code-year-sequence).')
  }

  if (!licenseExpiry || isNaN(new Date(licenseExpiry).getTime())) {
    errors.push('A valid license expiry date is required.')
  }

  return errors
}

async function getDrivers(req, res) {
  const { status } = req.query

  const where = {}
  if (status && VALID_STATUSES.includes(status)) where.status = status

  try {
    const drivers = await req.prisma.driver.findMany({ where, orderBy: { createdAt: 'desc' } })
    res.json(drivers)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch drivers', details: err.message })
  }
}

async function getDriverById(req, res) {
  try {
    const driver = await req.prisma.driver.findUnique({ where: { id: Number(req.params.id) } })
    if (!driver) return res.status(404).json({ error: 'Driver not found.' })
    res.json(driver)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch driver', details: err.message })
  }
}

async function createDriver(req, res) {
  const { fullName, phone, cnic, licenseNumber, licenseExpiry } = req.body

  const errors = validateDriverPayload({ fullName, phone, cnic, licenseNumber, licenseExpiry })
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(' ') })
  }

  try {
    const driver = await req.prisma.driver.create({
      data: {
        fullName: fullName.trim().replace(/\s+/g, ' '),
        phone: phone.trim(),
        cnic: cnic.trim(),
        licenseNumber: licenseNumber.trim().toUpperCase(),
        licenseExpiry: new Date(licenseExpiry),
      },
    })
    res.status(201).json(driver)
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'A driver with this CNIC or license number already exists.' })
    }
    res.status(500).json({ error: 'Failed to create driver', details: err.message })
  }
}

async function updateDriver(req, res) {
  const { fullName, phone, cnic, licenseNumber, licenseExpiry, status } = req.body

  const errors = validateDriverPayload({ fullName, phone, cnic, licenseNumber, licenseExpiry })
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(' ') })
  }

  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` })
  }

  try {
    const driver = await req.prisma.driver.update({
      where: { id: Number(req.params.id) },
      data: {
        fullName: fullName.trim().replace(/\s+/g, ' '),
        phone: phone.trim(),
        cnic: cnic.trim(),
        licenseNumber: licenseNumber.trim().toUpperCase(),
        licenseExpiry: new Date(licenseExpiry),
        ...(status !== undefined ? { status } : {}),
      },
    })
    res.json(driver)
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Driver not found.' })
    }
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'A driver with this CNIC or license number already exists.' })
    }
    res.status(500).json({ error: 'Failed to update driver', details: err.message })
  }
}

async function deleteDriver(req, res) {
  try {
    const activeAssignment = await req.prisma.booking.findFirst({
      where: {
        driverId: Number(req.params.id),
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
    })
    if (activeAssignment) {
      return res.status(400).json({ error: 'Cannot delete a driver with active booking assignments. Set them to inactive instead.' })
    }

    await req.prisma.driver.delete({ where: { id: Number(req.params.id) } })
    res.status(204).send()
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Driver not found.' })
    }
    res.status(500).json({ error: 'Failed to delete driver', details: err.message })
  }
}

module.exports = { getDrivers, getDriverById, createDriver, updateDriver, deleteDriver }
