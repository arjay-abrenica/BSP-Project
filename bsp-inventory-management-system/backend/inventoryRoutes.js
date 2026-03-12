const express = require('express');
const router = express.Router();
const inventoryController = require('./inventoryController');

// --- Item Management ---
router.get('/items', inventoryController.getAllItems);
router.post('/items', inventoryController.createItem);
router.put('/items/:id', inventoryController.updateItem);
router.delete('/items/:id', inventoryController.deleteItem);

// --- Transactions: Restocking (IN) ---
router.post('/transactions/restock', inventoryController.restockItems);

// --- Transactions: Issuance (OUT) ---
router.post('/transactions/issue', inventoryController.issueItems);

// --- Tracking & Scanners ---
// Example usage: /api/scan/item/494
router.get('/scan/item/:code', inventoryController.getItemByCode);
// Example usage: /api/scan/ris/24-05-0062
router.get('/scan/ris/:ris_no', inventoryController.getTransactionByRis);

module.exports = router;