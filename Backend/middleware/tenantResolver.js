const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const tenantsStore = require('../config/tenantsStore')

const clientCache = {}

function getPrismaClientForTenant(tenantId) {
  if (clientCache[tenantId]) {
    return clientCache[tenantId]
  }

  const tenant = tenantsStore.getTenant(tenantId)
  if (!tenant) {
    throw new Error(`Unknown tenant: ${tenantId}`)
  }

  const adapter = new PrismaPg({ connectionString: tenant.databaseUrl })
  const client = new PrismaClient({ adapter })

  clientCache[tenantId] = client
  return client
}

// Drops a cached Prisma client (e.g. after archiving/deleting a tenant) so a
// stale connection pool isn't kept open against a DB no one should touch.
async function evictTenantClient(tenantId) {
  const client = clientCache[tenantId]
  if (!client) return
  delete clientCache[tenantId]
  try { await client.$disconnect() } catch { /* best-effort */ }
}

// Whichever tenant is marked isPrimary is the one a bare host (no
// subdomain, e.g. plain `localhost`) resolves to. This is a slug, not a
// fixed key — the primary tenant's slug/clientName can be renamed via the
// Tenants admin UI, and isPrimary survives that rename.
function primaryTenantSlug() {
  const tenants = tenantsStore.getAllTenants()
  const entry = Object.entries(tenants).find(([, t]) => t.isPrimary) || Object.entries(tenants)[0]
  return entry ? entry[0] : null
}

// Resolves a tenant slug from the request's Host header. `<slug>.localhost`
// (dev) or `<slug>.yourdomain.com` (prod) both work the same way: take the
// first label. A bare host with no subdomain (e.g. `localhost`) resolves to
// the primary tenant.
function resolveTenantSlug(hostname) {
  if (!hostname) return primaryTenantSlug()
  const firstLabel = hostname.split('.')[0]
  if (!firstLabel || firstLabel === 'localhost' || firstLabel === 'www') return primaryTenantSlug()
  return firstLabel
}

function tenantResolver(req, res, next) {
  const slug = resolveTenantSlug(req.hostname)
  const tenant = slug ? tenantsStore.getTenant(slug) : null

  if (!tenant) {
    return res.status(404).json({ error: 'No agency found for this address.' })
  }

  if (tenant.status === 'ARCHIVED') {
    return res.status(403).json({ error: 'This agency is no longer active.', tenantArchived: true })
  }

  try {
    req.tenantId = slug
    req.prisma = getPrismaClientForTenant(slug)
    next()
  } catch (err) {
    res.status(500).json({ error: 'Tenant resolution failed', details: err.message })
  }
}

module.exports = tenantResolver
module.exports.getPrismaClientForTenant = getPrismaClientForTenant
module.exports.evictTenantClient = evictTenantClient
module.exports.resolveTenantSlug = resolveTenantSlug
