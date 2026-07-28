const { getBusyDriverIds } = require('../utils/driverAvailability')

// Same conventions as userController.js's fullName/phone validation
const NAME_REGEX = /^[\p{L}][\p{L}\s.'-]*$/u
const PHONE_REGEX = /^(\+92|92|0)3\d{9}$/
const VALID_STATUSES = ['ACTIVE', 'INACTIVE']

function validateDriverPayload({ fullName, phone }) {
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

  return errors
}

async function getDrivers(req, res) {
  const { status, available, pickupDateTime, returnDateTime } = req.query

  const where = {}
  if (status && VALID_STATUSES.includes(status)) where.status = status

  try {
    let drivers = await req.prisma.driver.findMany({ where, orderBy: { createdAt: 'desc' } })

    if (available === 'true') {
      if (!pickupDateTime || !returnDateTime) {
        return res.status(400).json({ error: 'pickupDateTime and returnDateTime are required to filter by availability.' })
      }
      const busyDriverIds = await getBusyDriverIds(req.prisma, pickupDateTime, returnDateTime)
      drivers = drivers.filter((driver) => driver.status === 'ACTIVE' && !busyDriverIds.has(driver.id))
    }

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
  const { fullName, phone } = req.body

  const errors = validateDriverPayload({ fullName, phone })
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(' ') })
  }

  try {
    const driver = await req.prisma.driver.create({
      data: {
        fullName: fullName.trim().replace(/\s+/g, ' '),
        phone: phone.trim(),
      },
    })
    res.status(201).json(driver)
  } catch (err) {
    res.status(500).json({ error: 'Failed to create driver', details: err.message })
  }
}

async function updateDriver(req, res) {
  const { fullName, phone, status } = req.body

  const errors = validateDriverPayload({ fullName, phone })
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
        ...(status !== undefined ? { status } : {}),
      },
    })
    res.json(driver)
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Driver not found.' })
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
