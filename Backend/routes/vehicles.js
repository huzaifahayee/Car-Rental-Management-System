const express = require('express')
const upload = require('../middleware/upload')
const { authenticate, authorize } = require('../middleware/auth')
const {
  getVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle,
   uploadVehicleImages,
} = require('../controllers/vehicleController')

const router = express.Router()

router.get('/', getVehicles)
router.get('/:id', getVehicleById)
router.post('/', authenticate, authorize('ADMIN', 'EMPLOYEE'), createVehicle)
router.put('/:id', authenticate, authorize('ADMIN', 'EMPLOYEE'), updateVehicle)
router.delete('/:id', authenticate, authorize('ADMIN'), deleteVehicle)
router.post('/:id/images', authenticate, authorize('ADMIN', 'EMPLOYEE'), upload.array('images', 5), uploadVehicleImages)

module.exports = router
