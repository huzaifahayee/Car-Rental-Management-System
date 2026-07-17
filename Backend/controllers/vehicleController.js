async function getVehicles(req, res) {
  const { pickupCity, category, transmission, hasAC, minPrice, maxPrice, status } = req.query

  const where = {}

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

  try {
    const vehicles = await req.prisma.vehiclePackage.findMany({ where })
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
  const { category, make, model, seatingCapacity, transmission, hasAC, driverOption, pricePerDay, pickupCity, dropoffCity } = req.body
  if (!category || !make || !model || !seatingCapacity || !transmission || pricePerDay == null || !pickupCity || !dropoffCity) {
    return res.status(400).json({ error: 'Missing required vehicle fields.' })
  }
  try {
    const vehicle = await req.prisma.vehiclePackage.create({
      data: { category, make, model, seatingCapacity, transmission, hasAC, driverOption, pricePerDay, pickupCity, dropoffCity },
    })

async function updateVehicle(req, res) {
  const { category, make, model, seatingCapacity, transmission, hasAC, driverOption, pricePerDay, pickupCity, dropoffCity, status } = req.body
  try {
    const vehicle = await req.prisma.vehiclePackage.update({
      where: { id: Number(req.params.id) },
      data: { category, make, model, seatingCapacity, transmission, hasAC, driverOption, pricePerDay, pickupCity, dropoffCity, status },
    })

async function deleteVehicle(req, res) {
  try {
    await req.prisma.vehiclePackage.delete({ where: { id: Number(req.params.id) } })
    res.status(204).send()
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete vehicle', details: err.message })
  }
}

module.exports = { getVehicles, getVehicleById, createVehicle, updateVehicle, deleteVehicle }
