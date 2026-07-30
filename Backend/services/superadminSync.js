// SuperAdmin's account is duplicated (not shared) across every tenant's
// database. This fans out a profile/credential change to every ACTIVE
// tenant's SUPERADMIN row so they never drift out of sync. Matched by the
// SuperAdmin's current email — the one natural unique key available across
// independent per-tenant User tables.
//
// Best-effort: the caller's own tenant should already have committed the
// change before calling this. A tenant DB being unreachable here doesn't
// undo that — it's reported back so the SuperAdmin knows which tenants
// still need to catch up (they can retry manually, e.g. by editing their
// profile once from that tenant later, or a future retry job).

const tenantsStore = require('../config/tenantsStore')
const { getPrismaClientForTenant } = require('../middleware/tenantResolver')

// `updateData` may include fullName, phone, cnic, passwordHash, and email
// (for an email change — still matched against currentEmail in this pass).
// `excludeTenantId` skips the tenant the caller already updated directly.
async function propagateSuperAdminUpdate(currentEmail, updateData, { excludeTenantId } = {}) {
  const tenants = tenantsStore.getAllTenants()
  const succeeded = []
  const failed = []

  for (const [tenantId, tenant] of Object.entries(tenants)) {
    if (tenantId === excludeTenantId) continue
    if (tenant.status !== 'ACTIVE') continue

    try {
      const prisma = getPrismaClientForTenant(tenantId)
      const result = await prisma.user.updateMany({
        where: { email: currentEmail.toLowerCase(), role: 'SUPERADMIN' },
        data: updateData,
      })
      if (result.count > 0) {
        succeeded.push(tenantId)
      }
    } catch (err) {
      failed.push({ tenantId, error: err.message })
    }
  }

  return { succeeded, failed }
}

module.exports = { propagateSuperAdminUpdate }
