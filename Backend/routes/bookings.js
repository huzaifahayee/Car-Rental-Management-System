const express = require('express')
const { authenticate, authorize } = require('../middleware/auth')
const { createBooking, getBookings, updateBookingStatus, cancelBooking, deleteBooking, assignDriver } = require('../controllers/bookingController')

const router = express.Router()

router.post('/', authenticate, authorize('CUSTOMER'), createBooking)
router.get('/', authenticate, getBookings)
router.put('/:id/status', authenticate, authorize('SUPERADMIN', 'ADMIN', 'EMPLOYEE'), updateBookingStatus)
// Allow customers to cancel their own bookings
router.put('/:id/cancel', authenticate, authorize('CUSTOMER'), cancelBooking)
// Assign (or reassign) a driver to a With-Driver booking, with overlap checking
router.put('/:id/assign-driver', authenticate, authorize('SUPERADMIN', 'ADMIN', 'EMPLOYEE'), assignDriver)
// Allow admins to permanently remove cancelled booking logs
router.delete('/:id', authenticate, authorize('ADMIN'), deleteBooking)

module.exports = router
