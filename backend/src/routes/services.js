const express = require('express');
const router = express.Router();
const {
    createService,
    getAllServices,
    getService,
    updateService,
    deleteService,
    getTodayServices,
    getUpcomingServices,
    getServiceCalendar,
    getServiceStats,
    cancelService,
    getServiceTypes
} = require('../controllers/serviceController');
const { protect, authorize, optionalAuth } = require('../middleware/auth');

// Public routes
router.get('/types/list', getServiceTypes);
router.get('/today', optionalAuth, getTodayServices);
router.get('/upcoming', optionalAuth, getUpcomingServices);
router.get('/calendar', optionalAuth, getServiceCalendar);
router.get('/:id', optionalAuth, getService);

// Protected routes
router.use(protect);

router.get('/', getAllServices);
router.get('/:id/stats', getServiceStats);

// Admin only routes
router.post('/', authorize('admin', 'super_admin'), createService);
router.put('/:id', authorize('admin', 'super_admin'), updateService);
router.delete('/:id', authorize('admin', 'super_admin'), deleteService);
router.post('/:id/cancel', authorize('admin', 'super_admin'), cancelService);

module.exports = router;