const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const tenantsStore = require('../config/tenantsStore')
const tenantResolver = require('../middleware/tenantResolver')
const { provisionTenant, isValidSlug, slugify, isValidEmailFormat, isValidPhoneFormat, isValidUrlFormat, ProvisioningError } = require('../services/tenantProvisioning')
const { reconcileOverdueBookingsAllTenants } = require('../services/bookingReconciliation')

// Never expose databaseUrl (contains DB credentials) to the frontend.
function toPublicTenant(tenant) {
  const { databaseUrl, ...publicFields } = tenant
  return publicFields
}

function withTenantDbClient(databaseUrl, fn) {
  const adapter = new PrismaPg({ connectionString: databaseUrl })
  const prisma = new PrismaClient({ adapter })
  return fn(prisma).finally(() => prisma.$disconnect())
}

async function listTenants(req, res) {
  const tenants = tenantsStore.getAllTenants()
  res.json(Object.values(tenants).map(toPublicTenant))
}

async function createTenant(req, res) {
  const { name, slug, contactEmail, contactPhone, logoUrl, adminEmail, adminPassword, adminFullName, adminPhone } = req.body

  if (!adminEmail || !adminPassword || !adminFullName) {
    return res.status(400).json({ error: 'Initial Admin full name, email, and password are required.' })
  }

  try {
    // Duplicate the *acting* SuperAdmin's real current identity into the new
    // tenant DB, so the seeded row isn't a placeholder that's immediately
    // out of sync with their actual credentials.
    const actingSuperAdmin = await req.prisma.user.findUnique({ where: { id: req.user.userId } })
    if (!actingSuperAdmin || actingSuperAdmin.role !== 'SUPERADMIN') {
      return res.status(403).json({ error: 'Only a SuperAdmin can create tenants.' })
    }

    const result = await provisionTenant({
      name,
      slug,
      contactEmail,
      contactPhone,
      logoUrl,
      admin: { email: adminEmail, password: adminPassword, fullName: adminFullName, phone: adminPhone },
      superadmin: {
        email: actingSuperAdmin.email,
        fullName: actingSuperAdmin.fullName,
        phone: actingSuperAdmin.phone,
        passwordHash: actingSuperAdmin.passwordHash,
      },
    })

    res.status(201).json(result)
  } catch (err) {
    if (err instanceof ProvisioningError) {
      return res.status(400).json({ error: err.message })
    }
    res.status(500).json({ error: 'Failed to create tenant', details: err.message })
  }
}

async function getTenantDetail(req, res) {
  const tenant = tenantsStore.getTenant(req.params.slug)
  if (!tenant) return res.status(404).json({ error: 'Tenant not found.' })

  try {
    const settings = await withTenantDbClient(tenant.databaseUrl, (prisma) => prisma.settings.findFirst())
    res.json({
      ...toPublicTenant(tenant),
      contactEmail: settings?.contactEmail || '',
      contactPhone: settings?.contactPhone || '',
      logoUrl: settings?.logoUrl || '',
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tenant details', details: err.message })
  }
}

async function updateTenant(req, res) {
  const currentSlug = req.params.slug
  const { name, slug: nextSlugInput, contactEmail, contactPhone, logoUrl } = req.body

  const tenants = tenantsStore.getAllTenants()
  const tenant = tenants[currentSlug]
  if (!tenant) return res.status(404).json({ error: 'Tenant not found.' })

  const nextSlug = nextSlugInput ? slugify(nextSlugInput) : currentSlug
  if (!isValidSlug(nextSlug)) {
    return res.status(400).json({ error: 'Slug must be 3-63 characters, lowercase letters/digits/hyphens only, and not start or end with a hyphen.' })
  }
  if (nextSlug !== currentSlug && tenants[nextSlug]) {
    return res.status(409).json({ error: `A tenant with the slug "${nextSlug}" already exists.` })
  }
  if (contactEmail && !isValidEmailFormat(contactEmail)) {
    return res.status(400).json({ error: 'Enter a valid contact email address.' })
  }
  if (contactPhone && !isValidPhoneFormat(contactPhone)) {
    return res.status(400).json({ error: 'Enter a valid Pakistani mobile number for the contact phone (e.g. 03001234567 or +923001234567).' })
  }
  if (logoUrl && !isValidUrlFormat(logoUrl)) {
    return res.status(400).json({ error: 'Logo URL must be a valid http(s) URL.' })
  }
  if (name && name.trim() && (name.trim().length < 2 || name.trim().length > 100)) {
    return res.status(400).json({ error: 'Tenant name must be 2-100 characters.' })
  }

  const clientName = name && name.trim() ? name.trim() : tenant.clientName

  try {
    // Branding/contact info lives in the tenant's own Settings table, not
    // tenants.json — update it there directly via a standalone client.
    await withTenantDbClient(tenant.databaseUrl, async (prisma) => {
      const existing = await prisma.settings.findFirst()
      const data = {
        agencyName: clientName,
        ...(contactEmail !== undefined ? { contactEmail } : {}),
        ...(contactPhone !== undefined ? { contactPhone } : {}),
        ...(logoUrl !== undefined ? { logoUrl } : {}),
      }
      if (existing) {
        await prisma.settings.update({ where: { id: existing.id }, data })
      } else {
        await prisma.settings.create({ data: { agencyName: clientName, contactEmail: contactEmail || '', contactPhone, logoUrl } })
      }
    })

    const updatedTenant = { ...tenant, slug: nextSlug, clientName }
    const nextTenants = { ...tenants }
    delete nextTenants[currentSlug]
    nextTenants[nextSlug] = updatedTenant
    tenantsStore.writeTenants(nextTenants)

    if (nextSlug !== currentSlug) {
      await tenantResolver.evictTenantClient(currentSlug)
    }

    res.json(toPublicTenant(updatedTenant))
  } catch (err) {
    res.status(500).json({ error: 'Failed to update tenant', details: err.message })
  }
}

async function setTenantStatus(req, res) {
  const { slug } = req.params
  const { status, confirmName } = req.body

  if (!['ACTIVE', 'ARCHIVED'].includes(status)) {
    return res.status(400).json({ error: 'status must be ACTIVE or ARCHIVED.' })
  }

  const tenants = tenantsStore.getAllTenants()
  const tenant = tenants[slug]
  if (!tenant) return res.status(404).json({ error: 'Tenant not found.' })

  if (slug === 'default' && status === 'ARCHIVED') {
    return res.status(400).json({ error: 'The default tenant cannot be archived.' })
  }

  // Server-side enforcement of the "type the tenant name to confirm" flow —
  // don't rely on the frontend alone to gate an archive action.
  if (status === 'ARCHIVED' && confirmName !== tenant.clientName) {
    return res.status(400).json({ error: 'Confirmation name does not match this tenant\'s name.' })
  }

  const nextTenants = { ...tenants, [slug]: { ...tenant, status } }
  tenantsStore.writeTenants(nextTenants)

  res.json(toPublicTenant(nextTenants[slug]))
}

// Manual trigger for the overdue-booking reconciliation sweep — same logic
// the server runs on a 5-minute timer, run on demand so it can be verified
// without waiting on the timer. Useful as an ops tool beyond just testing.
async function reconcileNow(req, res) {
  try {
    const results = await reconcileOverdueBookingsAllTenants()
    res.json({ results })
  } catch (err) {
    res.status(500).json({ error: 'Failed to run reconciliation', details: err.message })
  }
}

module.exports = { listTenants, createTenant, getTenantDetail, updateTenant, setTenantStatus, reconcileNow }
