const express = require('express');
const router = express.Router();
const inventoryController = require('./inventoryController');
const multer = require('multer');
const { authenticateToken, authorizeRoles } = require('./middleware/auth');

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

// --- Middleware: Apply authentication to all inventory routes ---
router.use(authenticateToken);

// --- Item Management ---
router.get('/offices', inventoryController.getAllOffices);
router.get('/suppliers', inventoryController.getAllSuppliers);
router.get('/items', inventoryController.getAllItems);
router.get('/items/next-sku', authorizeRoles('SUPERADMIN', 'SUPPLY_OFFICER'), inventoryController.getNextSku);
router.post('/items', authorizeRoles('SUPERADMIN', 'SUPPLY_OFFICER'), upload.single('image'), inventoryController.createItem);
router.put('/items/:id', authorizeRoles('SUPERADMIN', 'SUPPLY_OFFICER'), upload.single('image'), inventoryController.updateItem);
router.delete('/items/:id', authorizeRoles('SUPERADMIN', 'SUPPLY_OFFICER'), inventoryController.deleteItem);

// --- Transactions: Restocking (IN) ---
router.post('/transactions/restock', authorizeRoles('SUPERADMIN', 'SUPPLY_OFFICER'), inventoryController.restockItems);

// --- Transactions: Issuance (OUT) ---
router.post('/transactions/issue', authorizeRoles('SUPERADMIN', 'SUPPLY_OFFICER'), inventoryController.issueItems);
router.get('/transactions/next-ris/:officeId', inventoryController.getNextRisNo);

// --- Requests ---
router.get('/requests/pending', authorizeRoles('SUPERADMIN', 'SUPPLY_OFFICER', 'FOCAL_OFFICER'), inventoryController.getPendingRequests);
router.get('/requests/approved', authorizeRoles('SUPERADMIN', 'SUPPLY_OFFICER', 'FOCAL_OFFICER'), inventoryController.getApprovedRequests);
router.get('/requests/my', inventoryController.getMyRequests);
router.get('/requests/:id/details', inventoryController.getRequestDetails);
router.post('/requests', authorizeRoles('SUPERADMIN', 'SUPPLY_OFFICER', 'FOCAL_OFFICER'), inventoryController.createRequest);
router.put('/requests/:id/status', authorizeRoles('SUPERADMIN', 'SUPPLY_OFFICER'), inventoryController.updateRequestStatus);
router.put('/requests/:id/reject', authorizeRoles('SUPERADMIN', 'SUPPLY_OFFICER'), inventoryController.rejectRequest);

// --- Tracking & Scanners ---
router.get('/scan/item/:code', inventoryController.getItemByCode);
router.get('/scan/ris/:ris_no', inventoryController.getTransactionByRis);

// --- History & Activity Log ---
router.get('/history/requests', inventoryController.getRequestsHistory);
router.get('/history/activity', authorizeRoles('SUPERADMIN', 'SUPPLY_OFFICER'), inventoryController.getActivityLog);
router.get('/history/audit-logs', authorizeRoles('SUPERADMIN'), inventoryController.getAuditLogs);
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
router.get('/reports/monthly-inventory', inventoryController.getMonthlyInventoryReport);
router.get('/reports/monthly-rsmi', inventoryController.getMonthlyRSMIReport);

// --- Generated Reports Storage ---
router.get('/reports/generated', inventoryController.getGeneratedReports);
router.post('/reports/generated', inventoryController.saveGeneratedReport);
router.delete('/reports/generated/:id', inventoryController.deleteGeneratedReport);

// --- Notifications ---
router.get('/notifications', inventoryController.getNotifications);
router.put('/notifications/:id/read', inventoryController.markNotificationRead);
router.put('/notifications/mark-all-read', inventoryController.markAllRead);

module.exports = router;