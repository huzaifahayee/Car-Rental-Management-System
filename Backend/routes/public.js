const express = require('express')
const { getPublicStats, getDriverAvailability } = require('../controllers/publicController')

const router = express.Router()

// Public stats used on the home page
router.get('/stats', getPublicStats)

// Whether any driver is currently idle — used to gate the "With-Driver" option
// for signed-in and guest customers alike, before they've authenticated.
router.get('/driver-availability', getDriverAvailability)

module.exports = router
