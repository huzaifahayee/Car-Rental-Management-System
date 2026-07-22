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
router.post('/', authenticate, authorize('SUPERADMIN', 'ADMIN', 'EMPLOYEE'), createVehicle)
router.put('/:id', authenticate, authorize('SUPERADMIN', 'ADMIN', 'EMPLOYEE'), updateVehicle)
router.delete('/:id', authenticate, authorize('SUPERADMIN', 'ADMIN'), deleteVehicle)
router.post('/:id/images', authenticate, authorize('SUPERADMIN', 'ADMIN', 'EMPLOYEE'), upload.array('images', 5), uploadVehicleImages)

module.exports = router
