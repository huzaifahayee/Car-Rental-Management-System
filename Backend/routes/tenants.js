const express = require('express')
const { authenticate, authorize } = require('../middleware/auth')
const { listTenants, createTenant, getTenantDetail, updateTenant, setTenantStatus, reconcileNow } = require('../controllers/tenantController')

const router = express.Router()

// Tenant management operates on tenants.json directly, not req.prisma, so
// it renders identically no matter which tenant subdomain SuperAdmin is
// currently browsing from.
router.get('/', authenticate, authorize('SUPERADMIN'), listTenants)
router.post('/', authenticate, authorize('SUPERADMIN'), createTenant)
// Manual trigger for the overdue-booking reconciliation sweep (see services/bookingReconciliation.js)
router.post('/reconcile', authenticate, authorize('SUPERADMIN'), reconcileNow)
router.get('/:slug', authenticate, authorize('SUPERADMIN'), getTenantDetail)
router.put('/:slug', authenticate, authorize('SUPERADMIN'), updateTenant)
router.put('/:slug/status', authenticate, authorize('SUPERADMIN'), setTenantStatus)

module.exports = router
