const express = require('express')
const { authenticate, authorize } = require('../middleware/auth')
const { getDashboardStats } = require('../controllers/dashboardController')

const router = express.Router()
router.get('/', authenticate, authorize('SUPERADMIN', 'ADMIN', 'EMPLOYEE'), getDashboardStats)

module.exports = router