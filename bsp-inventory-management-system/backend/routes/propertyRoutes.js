const express = require('express');
const router = express.Router();
const propertyController = require('../controllers/propertyController');

router.post('/', propertyController.createIar);
router.get('/', propertyController.getAllProperties);
router.get('/analytics', propertyController.getPropertyAnalytics);
router.get('/reports/physical-count', propertyController.getPropertyReportsCount);
router.get('/reports/physical-count/excel', propertyController.exportPhysicalCountExcel);
router.get('/next-iar-no', propertyController.getNextIarNo);
router.get('/iars', propertyController.getAllIars);
router.get('/iars/:id', propertyController.getIarDetails);
router.get('/iars/:id/excel', propertyController.exportIarExcel);
router.post('/iars/preview-excel', propertyController.previewIarExcel);
router.get('/:id/par', propertyController.exportParExcel);
router.get('/:id/ics', propertyController.exportIcsExcel);
router.get('/:id', propertyController.getPropertyDetails);
router.post('/transfers', propertyController.createPropertyTransfer);
router.get('/transfers/:id/excel', propertyController.exportPtrExcel);
router.post('/returns', propertyController.createPropertyReturn);

module.exports = router;
