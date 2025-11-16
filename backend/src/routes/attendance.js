const express = require('express');
const router = express.Router();
const {
    checkIn,
    checkOut,
    getMyAttendance,
    getAllAttendance,
    getServiceAttendance,
    updateAttendance,
    deleteAttendance,
    checkAbsences,
    qrCheckIn,
    bulkCheckIn
} = require('../controllers/attendanceController');
const { protect, authorize, checkPermission } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Member routes
router.post('/checkin', checkIn);
router.post('/qr-checkin', qrCheckIn);
router.post('/:id/checkout', checkOut);
router.get('/my-attendance', getMyAttendance);

// Admin routes
router.get('/', checkPermission('view_all_attendance'), getAllAttendance);
router.get('/service/:serviceId', getServiceAttendance);
router.put('/:id', authorize('admin', 'super_admin'), updateAttendance);
router.delete('/:id', authorize('admin', 'super_admin'), deleteAttendance);
router.post('/check-absences', authorize('admin', 'super_admin'), checkAbsences);
router.post('/bulk-checkin', authorize('admin', 'super_admin'), bulkCheckIn);

module.exports = router;