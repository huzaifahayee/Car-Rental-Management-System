const { hashPassword, comparePassword, signToken } = require('../utils/auth')
const { normalizeCnic, isValidCnic } = require('../utils/validators')

async function register(req, res) {
  const { fullName, email, phone, cnic, password } = req.body

  if (!fullName || !email || !password) {
    return res.status(400).json({ error: 'fullName, email, and password are required.' })
  }

  if (!cnic || !cnic.toString().trim()) {
    return res.status(400).json({ error: 'CNIC is required.' })
  }
  if (!isValidCnic(cnic)) {
    return res.status(400).json({ error: 'Enter a valid 13-digit CNIC (e.g. 12345-1234567-1).' })
  }
  const normalizedCnic = normalizeCnic(cnic)

  try {
    const existingEmail = await req.prisma.user.findUnique({ where: { email } })
    if (existingEmail) {
      return res.status(409).json({ error: 'An account with this email already exists.' })
    }

    const existingCnic = await req.prisma.user.findUnique({ where: { cnic: normalizedCnic } })
    if (existingCnic) {
      return res.status(409).json({ error: 'An account with this CNIC already exists.' })
    }

    const passwordHash = await hashPassword(password)
    const user = await req.prisma.user.create({
      data: { fullName, email, phone, cnic: normalizedCnic, passwordHash, role: 'CUSTOMER' },
    })
    const token = signToken({ userId: user.id, role: user.role, tenantId: req.tenantId })

    res.status(201).json({
      token,
      user: { id: user.id, fullName: user.fullName, email: user.email, phone: user.phone, cnic: user.cnic, role: user.role },
    })
  } catch (err) {
    res.status(500).json({ error: 'Registration failed', details: err.message })
  }
}

async function login(req, res) {
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
      user: { id: user.id, fullName: user.fullName, email: user.email, phone: user.phone, cnic: user.cnic, role: user.role },
    })
  } catch (err) {
    res.status(500).json({ error: 'Login failed', details: err.message })
  }
}

module.exports = { register, login }
