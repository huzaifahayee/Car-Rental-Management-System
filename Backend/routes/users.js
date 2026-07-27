const express = require('express')
const { authenticate, authorize } = require('../middleware/auth')
const { getUsers, createUser, updateUserRole, deleteUser, getMe, updateMe } = require('../controllers/userController')

const router = express.Router()

// Self-service profile — any authenticated user (Customer, Employee, Admin, SuperAdmin)
router.get('/me', authenticate, getMe)
router.put('/me', authenticate, updateMe)

router.get('/', authenticate, authorize('SUPERADMIN', 'ADMIN', 'EMPLOYEE'), getUsers)
router.post('/', authenticate, authorize('SUPERADMIN', 'ADMIN'), createUser)
router.put('/:id/role', authenticate, authorize('SUPERADMIN', 'ADMIN'), updateUserRole)
router.delete('/:id', authenticate, authorize('SUPERADMIN', 'ADMIN'), deleteUser)

module.exports = router
