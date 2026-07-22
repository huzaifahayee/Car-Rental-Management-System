/**
 * CLI Script to provision an initial SuperAdmin or Admin user for a tenant database.
 *
 * Usage:
 *   node scripts/createAdmin.js <email> <password> "<full_name>" [role: SUPERADMIN|ADMIN] [phone]
 *
 * Example:
 *   node scripts/createAdmin.js superadmin@garitrip.com SuperPass123! "Super Admin" SUPERADMIN
 */

require('dotenv').config()
const { getPrismaClientForTenant } = require('../middleware/tenantResolver')
const { hashPassword } = require('../utils/auth')

async function createAdmin() {
  const args = process.argv.slice(2)
  const email = args[0]
  const password = args[1]
  const fullName = args[2] || 'Super Admin'
  const roleArg = (args[3] || 'SUPERADMIN').toUpperCase()
  const phone = args[4] || null

  const validRoles = ['SUPERADMIN', 'ADMIN', 'EMPLOYEE', 'CUSTOMER']
  const role = validRoles.includes(roleArg) ? roleArg : 'SUPERADMIN'

  if (!email || !password) {
    console.error('Usage: node scripts/createAdmin.js <email> <password> "[full_name]" [role: SUPERADMIN|ADMIN] [phone]')
    process.exit(1)
  }

  const tenantId = 'default'
  const prisma = getPrismaClientForTenant(tenantId)

  try {
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { role },
      })
      console.log(`✅ Updated existing user ${email} to ${role} role.`)
      process.exit(0)
    }

    const passwordHash = await hashPassword(password)
    const adminUser = await prisma.user.create({
      data: {
        fullName,
        email: email.toLowerCase(),
        phone,
        passwordHash,
        role,
      },
    })

    console.log('✅ Admin user created successfully!')
    console.log(`   ID: ${adminUser.id}`)
    console.log(`   Email: ${adminUser.email}`)
    console.log(`   Role: ${adminUser.role}`)
    process.exit(0)
  } catch (err) {
    console.error('Failed to create admin user:', err.message)
    process.exit(1)
  }
}

createAdmin()
