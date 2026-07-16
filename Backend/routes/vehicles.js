const express = require('express')
const { authenticate, authorize } = require('../middleware/auth')

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const vehicles = await req.prisma.vehiclePackage.findMany()
    res.json(vehicles)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch vehicles', details: err.message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const vehicle = await req.prisma.vehiclePackage.findUnique({
      where: { id: Number(req.params.id) },
    })
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found.' })
    }
    res.json(vehicle)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch vehicle', details: err.message })
  }
})

router.post('/', authenticate, authorize('ADMIN'), async (req, res) => {
  const { category, transmission, hasAC, driverOption, pricePerDay, pickupCity, dropoffCity } = req.body

  if (!category || !transmission || pricePerDay == null || !pickupCity || !dropoffCity) {
    return res.status(400).json({ error: 'Missing required vehicle fields.' })
  }

  try {
    const vehicle = await req.prisma.vehiclePackage.create({
      data: { category, transmission, hasAC, driverOption, pricePerDay, pickupCity, dropoffCity },
    })
    res.status(201).json(vehicle)
  } catch (err) {
    res.status(500).json({ error: 'Failed to create vehicle', details: err.message })
  }
})

router.put('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  const { category, transmission, hasAC, driverOption, pricePerDay, pickupCity, dropoffCity, status } = req.body

  try {
    const vehicle = await req.prisma.vehiclePackage.update({
      where: { id: Number(req.params.id) },
      data: { category, transmission, hasAC, driverOption, pricePerDay, pickupCity, dropoffCity, status },
    })
    res.json(vehicle)
  } catch (err) {
    res.status(500).json({ error: 'Failed to update vehicle', details: err.message })
  }
})

router.delete('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    await req.prisma.vehiclePackage.delete({
      where: { id: Number(req.params.id) },
    })
    res.status(204).send()
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete vehicle', details: err.message })
  }
})

module.exports = router