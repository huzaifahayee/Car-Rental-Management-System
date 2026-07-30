// Single source of truth for reading/writing config/tenants.json in-process.
// Writes are read-modify-write against an in-memory copy, persisted via a
// temp-file-then-rename (atomic on POSIX) so a crash mid-write can't corrupt
// the file. Every write immediately updates the in-memory copy too, so
// tenantResolver picks up new/archived tenants without a server restart.

const fs = require('fs')
const path = require('path')

const tenantsConfigPath = path.join(__dirname, 'tenants.json')

let tenants = loadFromDisk()

function loadFromDisk() {
  return JSON.parse(fs.readFileSync(tenantsConfigPath, 'utf-8'))
}

// Returns the live in-memory config. Callers must not mutate the returned
// object directly — go through writeTenants so writes persist to disk.
function getAllTenants() {
  return tenants
}

function getTenant(slug) {
  return tenants[slug]
}

function reload() {
  tenants = loadFromDisk()
  return tenants
}

function writeTenants(nextTenants) {
  const tmpPath = `${tenantsConfigPath}.tmp`
  fs.writeFileSync(tmpPath, JSON.stringify(nextTenants, null, 2))
  fs.renameSync(tmpPath, tenantsConfigPath)
  tenants = nextTenants
}

module.exports = { getAllTenants, getTenant, reload, writeTenants, tenantsConfigPath }
