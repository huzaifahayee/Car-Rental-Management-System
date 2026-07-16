const express = require('express')
const { hashPassword, comparePassword, signToken } = require('../utils/auth')

const router = express.Router()

router.post('/register', async (req, res) => {
  const { fullName, email, phone, password } = req.body

  if (!fullName || !email || !password) {
    return res.status(400).json({ error: 'fullName, email, and password are required.' })
  }

  try {
    const existingUser = await req.prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists.' })
    }

    const passwordHash = await hashPassword(password)

    const user = await req.prisma.user.create({
      data: {
        fullName,
        email,
        phone,
        passwordHash,
        role: 'CUSTOMER', // hardcoded — public registration is Customer-only
      },
    })

    const token = signToken({ userId: user.id, role: user.role, tenantId: req.tenantId })

    res.status(201).json({
      token,
      user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role },
    })
  } catch (err) {
    res.status(500).json({ error: 'Registration failed', details: err.message })
  }
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required.' })
  }

  try {
    const user = await req.prisma.user.findUnique({ where: { email } })
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' })
    }

    const passwordMatches = await comparePassword(password, user.passwordHash)
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid email or password.' })
    }

    const token = signToken({ userId: user.id, role: user.role, tenantId: req.tenantId })

    res.json({
      token,
      user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role },
    })
  } catch (err) {
    res.status(500).json({ error: 'Login failed', details: err.message })
  }
})

module.exports = router