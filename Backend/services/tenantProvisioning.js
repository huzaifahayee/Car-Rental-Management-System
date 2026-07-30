// Orchestrates creating a brand-new tenant: a real Postgres database,
// migrated to the current schema, seeded with the initial Admin + a synced
// SuperAdmin row, and only then registered in tenants.json. Any failure
// along the way rolls back the database so a tenant entry never exists
// without a fully working DB behind it.

const util = require('util')
const { exec } = require('child_process')
const path = require('path')
const { Client } = require('pg')
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const tenantsStore = require('../config/tenantsStore')
const { hashPassword } = require('../utils/auth')

const execAsync = util.promisify(exec)
const BACKEND_ROOT = path.join(__dirname, '..')

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_REGEX = /^(\+92|92|0)3\d{9}$/

function isValidEmailFormat(value) {
  return typeof value === 'string' && EMAIL_REGEX.test(value.trim())
}

function isValidPhoneFormat(value) {
  if (typeof value !== 'string' || !value.trim()) return false
  return PHONE_REGEX.test(value.trim().replace(/[\s()-]/g, ''))
}

function isValidUrlFormat(value) {
  if (typeof value !== 'string' || !value.trim()) return true // optional
  try {
    const parsed = new URL(value.trim())
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function slugify(name) {
  return String(name)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function isValidSlug(slug) {
  return typeof slug === 'string' && SLUG_REGEX.test(slug)
}

function slugToDbName(slug) {
  return `garitrip_${slug.replace(/-/g, '_')}`
}

// Same host/port/user/password as POSTGRES_ADMIN_URL, different database name.
function buildTenantDatabaseUrl(dbName) {
  const adminUrl = new URL(process.env.POSTGRES_ADMIN_URL)
  adminUrl.pathname = `/${dbName}`
  adminUrl.searchParams.set('schema', 'public')
  return adminUrl.toString()
}

async function withAdminClient(fn) {
  const client = new Client({ connectionString: process.env.POSTGRES_ADMIN_URL })
  await client.connect()
  try {
    return await fn(client)
  } finally {
    await client.end()
  }
}

// dbName is always derived from a validated slug (see slugToDbName), never
// taken directly from user input, so it's safe to interpolate into DDL —
// Postgres doesn't support parameterized identifiers.
async function createDatabase(dbName) {
  await withAdminClient(async (client) => {
    await client.query(`CREATE DATABASE "${dbName}"`)
  })
}

async function dropDatabase(dbName) {
  await withAdminClient(async (client) => {
    // Terminate any lingering connections (e.g. our own migration/seed
    // client not yet fully closed) — DROP DATABASE fails if any exist.
    await client.query(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
      [dbName]
    )
    await client.query(`DROP DATABASE IF EXISTS "${dbName}"`)
  })
}

async function runMigrations(databaseUrl) {
  await execAsync('npx prisma migrate deploy', {
    cwd: BACKEND_ROOT,
    env: { ...process.env, DATABASE_URL: databaseUrl },
  })
}

async function seedTenantData(databaseUrl, { clientName, contactEmail, contactPhone, logoUrl, admin, superadmin }) {
  const adapter = new PrismaPg({ connectionString: databaseUrl })
  const prisma = new PrismaClient({ adapter })
  try {
    const adminPasswordHash = await hashPassword(admin.password)
    await prisma.user.create({
      data: {
        fullName: admin.fullName,
        email: admin.email.toLowerCase(),
        phone: admin.phone || null,
        passwordHash: adminPasswordHash,
        role: 'ADMIN',
      },
    })

    await prisma.user.create({
      data: {
        fullName: superadmin.fullName,
        email: superadmin.email.toLowerCase(),
        phone: superadmin.phone || null,
        passwordHash: superadmin.passwordHash,
        role: 'SUPERADMIN',
      },
    })

    await prisma.settings.create({
      data: {
        agencyName: clientName,
        contactEmail: contactEmail || admin.email.toLowerCase(),
        contactPhone: contactPhone || null,
        logoUrl: logoUrl || null,
      },
    })
  } finally {
    await prisma.$disconnect()
  }
}

// `superadmin` here is the calling SuperAdmin's own identity (fullName,
// email, phone, passwordHash) — pulled from whichever tenant DB they're
// currently acting from, so the seeded row matches their real credentials
// rather than a placeholder that would immediately be out of sync.
async function provisionTenant({ name, slug: requestedSlug, contactEmail, contactPhone, logoUrl, admin, superadmin }) {
  if (!name || !name.trim()) {
    throw new ProvisioningError('Tenant name is required.')
  }
  if (name.trim().length < 2 || name.trim().length > 100) {
    throw new ProvisioningError('Tenant name must be 2-100 characters.')
  }
  if (!admin || !admin.email || !admin.password || !admin.fullName) {
    throw new ProvisioningError('Initial Admin full name, email, and password are required.')
  }
  if (!isValidEmailFormat(admin.email)) {
    throw new ProvisioningError('Enter a valid Initial Admin email address.')
  }
  if (admin.password.length < 8 || admin.password.length > 72) {
    throw new ProvisioningError('Initial Admin password must be 8-72 characters.')
  }
  if (admin.phone && !isValidPhoneFormat(admin.phone)) {
    throw new ProvisioningError('Enter a valid Pakistani mobile number for the Initial Admin (e.g. 03001234567 or +923001234567).')
  }
  if (contactEmail && !isValidEmailFormat(contactEmail)) {
    throw new ProvisioningError('Enter a valid contact email address.')
  }
  if (contactPhone && !isValidPhoneFormat(contactPhone)) {
    throw new ProvisioningError('Enter a valid Pakistani mobile number for the contact phone (e.g. 03001234567 or +923001234567).')
  }
  if (logoUrl && !isValidUrlFormat(logoUrl)) {
    throw new ProvisioningError('Logo URL must be a valid http(s) URL.')
  }

  const slug = requestedSlug ? slugify(requestedSlug) : slugify(name)
  if (!isValidSlug(slug)) {
    throw new ProvisioningError('Slug must be 3-63 characters, lowercase letters/digits/hyphens only, and not start or end with a hyphen.')
  }

  const existingTenants = tenantsStore.getAllTenants()
  if (existingTenants[slug]) {
    throw new ProvisioningError(`A tenant with the slug "${slug}" already exists. Please choose a different name or edit the slug.`)
  }

  const dbName = slugToDbName(slug)
  const databaseUrl = buildTenantDatabaseUrl(dbName)

  let dbCreated = false
  try {
    await createDatabase(dbName)
    dbCreated = true

    await runMigrations(databaseUrl)

    await seedTenantData(databaseUrl, {
      clientName: name.trim(),
      contactEmail,
      contactPhone,
      logoUrl,
      admin,
      superadmin,
    })

    const nextTenants = {
      ...existingTenants,
      [slug]: {
        slug,
        clientName: name.trim(),
        databaseUrl,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
      },
    }
    tenantsStore.writeTenants(nextTenants)

    return { slug, clientName: name.trim(), status: 'ACTIVE' }
  } catch (err) {
    if (dbCreated) {
      try {
        await dropDatabase(dbName)
      } catch (rollbackErr) {
        console.error(`Failed to roll back database "${dbName}" after provisioning failure:`, rollbackErr.message)
      }
    }
    if (err instanceof ProvisioningError) throw err
    throw new ProvisioningError(`Tenant provisioning failed and was rolled back: ${err.message}`)
  }
}

class ProvisioningError extends Error {}

module.exports = {
  slugify,
  isValidSlug,
  isValidEmailFormat,
  isValidPhoneFormat,
  isValidUrlFormat,
  provisionTenant,
  dropDatabase,
  ProvisioningError,
}
