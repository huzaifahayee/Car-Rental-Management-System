const { hashPassword, comparePassword } = require('../utils/auth')
const { normalizeCnic, isValidCnic } = require('../utils/validators')
const { propagateSuperAdminUpdate } = require('../services/superadminSync')

const VALID_ROLES = ['SUPERADMIN', 'ADMIN', 'EMPLOYEE', 'CUSTOMER']
const NAME_REGEX = /^[\p{L}][\p{L}\s.'-]*$/u
const PHONE_REGEX = /^(\+92|92|0)3\d{9}$/

const PROFILE_SELECT = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  cnic: true,
  role: true,
  createdAt: true,
}

async function getUsers(req, res) {
  const { role } = req.query
  const where = {}
  if (role && VALID_ROLES.includes(role)) {
    where.role = role
  }

  try {
    const users = await req.prisma.user.findMany({
      where,
      select: PROFILE_SELECT,
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
      select: PROFILE_SELECT,
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
      select: PROFILE_SELECT,
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

// ── Self-service profile endpoints (any authenticated role: Customer, ──────
// ── Employee, Admin, SuperAdmin — everyone manages their own profile) ──────

async function getMe(req, res) {
  try {
    const me = await req.prisma.user.findUnique({
      where: { id: req.user.userId },
      select: PROFILE_SELECT,
    })
    if (!me) {
      return res.status(404).json({ error: 'User not found.' })
    }
    res.json(me)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile', details: err.message })
  }
}

async function updateMe(req, res) {
  const { fullName, phone, cnic } = req.body

  const data = {}

  if (fullName !== undefined) {
    const trimmedName = fullName.trim().replace(/\s+/g, ' ')
    if (!trimmedName) {
      return res.status(400).json({ error: 'Full name cannot be empty.' })
    }
    if (trimmedName.length < 2 || trimmedName.length > 100 || !NAME_REGEX.test(trimmedName)) {
      return res.status(400).json({ error: 'Full name must be 2-100 characters and use letters, spaces, apostrophes, or hyphens only.' })
    }
    data.fullName = trimmedName
  }

  if (phone !== undefined) {
    const trimmedPhone = phone ? phone.toString().trim() : ''
    if (!trimmedPhone) {
      return res.status(400).json({ error: 'Phone number cannot be empty.' })
    }
    const strippedPhone = trimmedPhone.replace(/[\s()-]/g, '')
    if (!PHONE_REGEX.test(strippedPhone)) {
      return res.status(400).json({ error: 'Enter a valid Pakistani mobile number (e.g. 03001234567 or +923001234567).' })
    }
    data.phone = trimmedPhone
  }

  if (cnic !== undefined) {
    const trimmedCnic = cnic ? cnic.toString().trim() : ''
    if (!trimmedCnic) {
      return res.status(400).json({ error: 'CNIC cannot be empty.' })
    }
    if (!isValidCnic(trimmedCnic)) {
      return res.status(400).json({ error: 'Enter a valid 13-digit CNIC (e.g. 12345-1234567-1).' })
    }
    data.cnic = normalizeCnic(trimmedCnic)
  }

  if (Object.keys(data).length === 0) {
    return res.status(400).json({ error: 'Provide at least one field to update: fullName, phone, or cnic.' })
  }

  try {
    if (data.cnic) {
      const existingCnic = await req.prisma.user.findUnique({ where: { cnic: data.cnic } })
      if (existingCnic && existingCnic.id !== req.user.userId) {
        return res.status(409).json({ error: 'This CNIC is already registered to another account.' })
      }
    }

    const updated = await req.prisma.user.update({
      where: { id: req.user.userId },
      data,
      select: PROFILE_SELECT,
    })

    let syncWarnings
    // SuperAdmin's account is duplicated across every tenant DB — keep the
    // duplicates in sync rather than only updating the tenant they're
    // currently acting from.
    if (updated.role === 'SUPERADMIN') {
      const { failed } = await propagateSuperAdminUpdate(updated.email, data, { excludeTenantId: req.tenantId })
      if (failed.length > 0) {
        syncWarnings = failed.map(f => `Could not sync this change to tenant "${f.tenantId}": ${f.error}`)
      }
    }

    res.json({ ...updated, ...(syncWarnings ? { syncWarnings } : {}) })
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile', details: err.message })
  }
}

async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'currentPassword and newPassword are required.' })
  }
  if (newPassword.length < 8 || newPassword.length > 72) {
    return res.status(400).json({ error: 'New password must be 8-72 characters.' })
  }

  try {
    const user = await req.prisma.user.findUnique({ where: { id: req.user.userId } })
    if (!user) return res.status(404).json({ error: 'User not found.' })

    const matches = await comparePassword(currentPassword, user.passwordHash)
    if (!matches) {
      return res.status(401).json({ error: 'Current password is incorrect.' })
    }

    const passwordHash = await hashPassword(newPassword)
    await req.prisma.user.update({ where: { id: user.id }, data: { passwordHash } })

    let syncWarnings
    if (user.role === 'SUPERADMIN') {
      const { failed } = await propagateSuperAdminUpdate(user.email, { passwordHash }, { excludeTenantId: req.tenantId })
      if (failed.length > 0) {
        syncWarnings = failed.map(f => `Could not sync this change to tenant "${f.tenantId}": ${f.error}`)
      }
    }

    res.json({ message: 'Password updated successfully.', ...(syncWarnings ? { syncWarnings } : {}) })
  } catch (err) {
    res.status(500).json({ error: 'Failed to change password', details: err.message })
  }
}

module.exports = { getUsers, createUser, updateUserRole, deleteUser, getMe, updateMe, changePassword }
