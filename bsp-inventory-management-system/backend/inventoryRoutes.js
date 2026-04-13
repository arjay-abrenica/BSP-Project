const express = require('express');
const router = express.Router();
const inventoryController = require('./inventoryController');
const multer = require('multer');

// --- Multer Configuration for Item Images ---
const storage = multer.memoryStorage();

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed!'), false);
    }
  }
});

// --- Item Management ---
router.get('/offices', inventoryController.getAllOffices);
router.get('/suppliers', inventoryController.getAllSuppliers);
router.get('/items', inventoryController.getAllItems);
router.post('/items', upload.single('image'), inventoryController.createItem);
router.put('/items/:id', upload.single('image'), inventoryController.updateItem);
router.delete('/items/:id', inventoryController.deleteItem);

// --- Transactions: Restocking (IN) ---
router.post('/transactions/restock', inventoryController.restockItems);

// --- Transactions: Issuance (OUT) ---
router.post('/transactions/issue', inventoryController.issueItems);
router.get('/transactions/next-ris/:officeId', inventoryController.getNextRisNo);

// --- Requests ---
router.get('/requests/pending', inventoryController.getPendingRequests);
router.get('/requests/approved', inventoryController.getApprovedRequests);
router.get('/requests/my', inventoryController.getMyRequests);
router.get('/requests/:id/details', inventoryController.getRequestDetails);
router.post('/requests', inventoryController.createRequest);
router.put('/requests/:id/status', inventoryController.updateRequestStatus);
router.put('/requests/:id/reject', inventoryController.rejectRequest);

// --- Tracking & Scanners ---
// Example usage: /api/scan/item/494
router.get('/scan/item/:code', inventoryController.getItemByCode);
// Example usage: /api/scan/ris/24-05-0062
router.get('/scan/ris/:ris_no', inventoryController.getTransactionByRis);

// --- History & Activity Log ---
router.get('/history/requests', inventoryController.getRequestsHistory);
router.get('/history/activity', inventoryController.getActivityLog);
router.get('/history/audit-logs', inventoryController.getAuditLogs);
router.get('/items/:id/history', inventoryController.getItemTransactionHistory);
router.get('/items/:id/latest-intake', inventoryController.getLatestIntakeForItem);
router.get('/items/:id/allocation', inventoryController.getItemAllocationPerOffice);

// --- Reports & Analysis ---
router.get('/reports/low-stock', inventoryController.getLowStockItems);
router.get('/reports/issuance-summary', inventoryController.getIssuanceSummary);
router.get('/reports/stock-distribution', inventoryController.getStockDistribution);
router.get('/reports/usage-trend', inventoryController.getUsageTrend);
router.get('/reports/category-breakdown', inventoryController.getCategoryBreakdown);
router.get('/reports/allocation-efficiency', inventoryController.getAllocationEfficiency);

module.exports = router;