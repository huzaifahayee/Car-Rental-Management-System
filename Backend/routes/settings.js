const express = require('express')
const { authenticate, authorize } = require('../middleware/auth')
const { getSettings, updateSettings } = require('../controllers/settingsController')

const router = express.Router()

router.get('/', getSettings)
router.put('/', authenticate, authorize('ADMIN'), updateSettings)

module.exports = router
