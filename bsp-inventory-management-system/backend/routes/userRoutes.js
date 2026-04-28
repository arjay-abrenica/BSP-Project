const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', authorizeRoles('SUPERADMIN'), userController.getAllUsers);
router.post('/', authorizeRoles('SUPERADMIN'), userController.createUser);
router.put('/:id', authorizeRoles('SUPERADMIN'), userController.updateUser);
router.put('/:id/change-password', userController.changePassword);

module.exports = router;
