const express = require('express')
const { authenticate, authorize } = require('../middleware/auth')
const { createBooking, getBookings, updateBookingStatus } = require('../controllers/bookingController')

const router = express.Router()

router.post('/', authenticate, authorize('CUSTOMER'), createBooking)
router.get('/', authenticate, getBookings)
router.put('/:id/status', authenticate, authorize('ADMIN', 'EMPLOYEE'), updateBookingStatus)

module.exports = router
