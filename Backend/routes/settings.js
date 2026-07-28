const express = require('express')
const { authenticate, authorize } = require('../middleware/auth')
const { uploadLogo: uploadLogoMiddleware } = require('../middleware/upload')
const { getSettings, updateSettings, getTheme, updateTheme, uploadLogo } = require('../controllers/settingsController')

const router = express.Router()

router.get('/', getSettings)
router.put('/', authenticate, authorize('ADMIN'), updateSettings)
router.post('/logo', authenticate, authorize('SUPERADMIN', 'ADMIN'), uploadLogoMiddleware.single('logo'), uploadLogo)

// Theme endpoints
router.get('/theme', getTheme)
router.put('/theme', authenticate, authorize('SUPERADMIN', 'ADMIN'), updateTheme)

module.exports = router