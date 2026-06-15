const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { authenticateToken } = require('../middleware/auth');

// Using auth middleware for these routes
router.get('/', authenticateToken, employeeController.getAllEmployees);
router.post('/', authenticateToken, employeeController.createEmployee);

module.exports = router;
