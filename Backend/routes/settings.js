const express = require('express')
const { authenticate, authorize } = require('../middleware/auth')

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const settings = await req.prisma.settings.findFirst()
    if (!settings) {
      return res.status(404).json({ error: 'Settings not found for this tenant.' })
    }
    res.json(settings)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch settings', details: err.message })
  }
})

router.put('/', authenticate, authorize('ADMIN'), async (req, res) => {
  const { agencyName, contactEmail, contactPhone, themePalette } = req.body

  try {
    const existing = await req.prisma.settings.findFirst()

    let settings
    if (existing) {
      settings = await req.prisma.settings.update({
        where: { id: existing.id },
        data: { agencyName, contactEmail, contactPhone, themePalette },
      })
    } else {
      settings = await req.prisma.settings.create({
        data: { agencyName, contactEmail, contactPhone, themePalette },
      })
    }

    res.json(settings)
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings', details: err.message })
  }
})

module.exports = router