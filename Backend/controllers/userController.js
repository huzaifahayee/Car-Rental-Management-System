const { hashPassword } = require('../utils/auth')

const VALID_ROLES = ['SUPERADMIN', 'ADMIN', 'EMPLOYEE', 'CUSTOMER']

async function getUsers(req, res) {
  const { role } = req.query
  const where = {}
  if (role && VALID_ROLES.includes(role)) {
    where.role = role
  }

  try {
    const users = await req.prisma.user.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    res.json(users)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users', details: err.message })
  }
}

async function createUser(req, res) {
  const { fullName, email, phone, password, role } = req.body

  if (!fullName || !email || !password || !role) {
    return res.status(400).json({ error: 'fullName, email, password, and role are required.' })
  }

  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: `role must be one of: ${VALID_ROLES.join(', ')}` })
  }

  // Permission check: Only SUPERADMIN can create a SUPERADMIN
  if (role === 'SUPERADMIN' && req.user.role !== 'SUPERADMIN') {
    return res.status(403).json({ error: 'Only a SuperAdmin can create a SuperAdmin account.' })
  }

  try {
    const existingUser = await req.prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } })
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists.' })
    }

    const passwordHash = await hashPassword(password)
    const newUser = await req.prisma.user.create({
      data: {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone ? phone.trim() : null,
        passwordHash,
        role,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    })

    res.status(201).json(newUser)
  } catch (err) {
    res.status(500).json({ error: 'Failed to create user', details: err.message })
  }
}

async function updateUserRole(req, res) {
  const { role } = req.body
  const userId = Number(req.params.id)

  if (!role || !VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: `role is required and must be one of: ${VALID_ROLES.join(', ')}` })
  }

  try {
    const targetUser = await req.prisma.user.findUnique({ where: { id: userId } })
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found.' })
    }

    // Permission check: Non-SUPERADMIN cannot modify a SUPERADMIN user
    if (targetUser.role === 'SUPERADMIN' && req.user.role !== 'SUPERADMIN') {
      return res.status(403).json({ error: 'Only a SuperAdmin can modify another SuperAdmin.' })
    }

    // Permission check: Non-SUPERADMIN cannot grant SUPERADMIN role
    if (role === 'SUPERADMIN' && req.user.role !== 'SUPERADMIN') {
      return res.status(403).json({ error: 'Only a SuperAdmin can assign the SuperAdmin role.' })
    }

    const updatedUser = await req.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    })

    res.json(updatedUser)
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user role', details: err.message })
  }
}

async function deleteUser(req, res) {
  const userId = Number(req.params.id)

  try {
    const targetUser = await req.prisma.user.findUnique({ where: { id: userId } })
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found.' })
    }

    // Cannot delete yourself
    if (targetUser.id === req.user.id) {
      return res.status(403).json({ error: 'You cannot delete your own account.' })
    }

    // Only SUPERADMIN can delete another SUPERADMIN
    if (targetUser.role === 'SUPERADMIN' && req.user.role !== 'SUPERADMIN') {
      return res.status(403).json({ error: 'Only a SuperAdmin can delete another SuperAdmin.' })
    }

    // ADMIN cannot delete another ADMIN (only SUPERADMIN can)
    if (targetUser.role === 'ADMIN' && req.user.role !== 'SUPERADMIN') {
      return res.status(403).json({ error: 'Only a SuperAdmin can delete an Admin account.' })
    }

    await req.prisma.user.delete({ where: { id: userId } })
    res.json({ message: 'User deleted successfully.' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user', details: err.message })
  }
}

module.exports = { getUsers, createUser, updateUserRole, deleteUser }
