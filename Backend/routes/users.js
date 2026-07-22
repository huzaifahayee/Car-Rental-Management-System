const express = require('express')
const { authenticate, authorize } = require('../middleware/auth')
const { getUsers, createUser, updateUserRole, deleteUser } = require('../controllers/userController')

const router = express.Router()

router.get('/', authenticate, authorize('SUPERADMIN', 'ADMIN', 'EMPLOYEE'), getUsers)
router.post('/', authenticate, authorize('SUPERADMIN', 'ADMIN'), createUser)
router.put('/:id/role', authenticate, authorize('SUPERADMIN', 'ADMIN'), updateUserRole)
router.delete('/:id', authenticate, authorize('SUPERADMIN', 'ADMIN'), deleteUser)

module.exports = router
