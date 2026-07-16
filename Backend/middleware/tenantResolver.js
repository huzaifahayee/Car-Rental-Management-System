const fs = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')

const tenantsConfigPath = path.join(__dirname, '../config/tenants.json')
const tenants = JSON.parse(fs.readFileSync(tenantsConfigPath, 'utf-8'))

const clientCache = {}

function getPrismaClientForTenant(tenantId) {
  if (clientCache[tenantId]) {
    return clientCache[tenantId]
  }

  const tenant = tenants[tenantId]
  if (!tenant) {
    throw new Error(`Unknown tenant: ${tenantId}`)
  }

  const adapter = new PrismaPg({ connectionString: tenant.databaseUrl })
  const client = new PrismaClient({ adapter })

  clientCache[tenantId] = client
  return client
}

function tenantResolver(req, res, next) {
  // TODO: derive this from req.hostname (subdomain) once real
  // multi-tenant routing is in place. Hardcoded for now.
  const tenantId = 'default'

  try {
    req.tenantId = tenantId
    req.prisma = getPrismaClientForTenant(tenantId)
    next()
  } catch (err) {
    res.status(500).json({ error: 'Tenant resolution failed', details: err.message })
  }
}

module.exports = tenantResolver
module.exports.getPrismaClientForTenant = getPrismaClientForTenant