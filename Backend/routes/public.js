const express = require('express')
const { getPublicStats } = require('../controllers/publicController')

const router = express.Router()

// Public stats used on the home page
router.get('/stats', getPublicStats)

module.exports = router
