async function getSettings(req, res) {
  try {
    const settings = await req.prisma.settings.findFirst()
    if (!settings) return res.status(404).json({ error: 'Settings not found for this tenant.' })
    res.json(settings)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch settings', details: err.message })
  }
}

async function updateSettings(req, res) {
  const { agencyName, contactEmail, contactPhone, themePalette } = req.body
  try {
    const existing = await req.prisma.settings.findFirst()
    const settings = existing
      ? await req.prisma.settings.update({
        where: { id: existing.id }, data: { agencyName, contactEmail, contactPhone, themePalette },
      })
      : await req.prisma.settings.create({
        data: { agencyName, contactEmail, contactPhone, themePalette },
      })
    res.json(settings)
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings', details: err.message })
  }
}

module.exports = { getSettings, updateSettings }

async function getTheme(req, res) {
  try {
    const settings = await req.prisma.settings.findFirst()
    res.json({ themePalette: settings?.themePalette || 'default' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch theme', details: err.message })
  }
}

async function updateTheme(req, res) {
  try {
    const { themePalette } = req.body
    const existing = await req.prisma.settings.findFirst()
    if (!existing) {
      const created = await req.prisma.settings.create({ data: { agencyName: 'Unnamed Agency', contactEmail: 'admin@example.com', themePalette } })
      return res.json(created)
    }
    const updated = await req.prisma.settings.update({ where: { id: existing.id }, data: { themePalette } })
    res.json(updated)
  } catch (err) {
    res.status(500).json({ error: 'Failed to update theme', details: err.message })
  }
}

module.exports.getTheme = getTheme
module.exports.updateTheme = updateTheme
