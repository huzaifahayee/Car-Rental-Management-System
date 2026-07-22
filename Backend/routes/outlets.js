const express = require('express')
const { authenticate, authorize } = require('../middleware/auth')
const {
  getOutlets,
  getOutletById,
  createOutlet,
  updateOutlet,
  deleteOutlet,
} = require('../controllers/outletController')

const router = express.Router()

router.get('/', getOutlets)
router.get('/:id', getOutletById)
router.post('/', authenticate, authorize('SUPERADMIN', 'ADMIN', 'EMPLOYEE'), createOutlet)
router.put('/:id', authenticate, authorize('SUPERADMIN', 'ADMIN', 'EMPLOYEE'), updateOutlet)
router.delete('/:id', authenticate, authorize('SUPERADMIN', 'ADMIN', 'EMPLOYEE'), deleteOutlet)

module.exports = router
