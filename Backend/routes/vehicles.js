const express = require('express')
const { authenticate, authorize } = require('../middleware/auth')
const {
  getVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle,
} = require('../controllers/vehicleController')

const router = express.Router()

router.get('/', getVehicles)
router.get('/:id', getVehicleById)
router.post('/', authenticate, authorize('ADMIN'), createVehicle)
router.put('/:id', authenticate, authorize('ADMIN'), updateVehicle)
router.delete('/:id', authenticate, authorize('ADMIN'), deleteVehicle)

module.exports = router
