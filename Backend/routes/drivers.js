const express = require('express')
const { authenticate, authorize } = require('../middleware/auth')
const {
  getDrivers,
  getDriverById,
  createDriver,
  updateDriver,
  deleteDriver,
} = require('../controllers/driverController')

const router = express.Router()

router.get('/', authenticate, authorize('SUPERADMIN', 'ADMIN', 'EMPLOYEE'), getDrivers)
router.get('/:id', authenticate, authorize('SUPERADMIN', 'ADMIN', 'EMPLOYEE'), getDriverById)
router.post('/', authenticate, authorize('SUPERADMIN', 'ADMIN', 'EMPLOYEE'), createDriver)
router.put('/:id', authenticate, authorize('SUPERADMIN', 'ADMIN', 'EMPLOYEE'), updateDriver)
router.delete('/:id', authenticate, authorize('SUPERADMIN', 'ADMIN'), deleteDriver)

module.exports = router
