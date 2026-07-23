const express = require('express')
const { authenticate, authorize } = require('../middleware/auth')
const { getSettings, updateSettings, getTheme, updateTheme } = require('../controllers/settingsController')

const router = express.Router()

router.get('/', getSettings)
router.put('/', authenticate, authorize('ADMIN'), updateSettings)

// Theme endpoints
router.get('/theme', getTheme)
router.put('/theme', authenticate, authorize('SUPERADMIN', 'ADMIN'), updateTheme)

module.exports = router
