// ============================================
// routes/analytics.js
// ============================================
const express4 = require('express');
const router4 = express4.Router();
const { protect: protect4, checkPermission } = require('../middleware/auth');

router4.use(protect4);
router4.use(checkPermission('view_reports'));

router4.get('/dashboard', async (req, res) => {
    const Attendance = require('../models/Attendance');
    const User = require('../models/User');
    const Service = require('../models/Service');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Today's attendance
    const todayAttendance = await Attendance.countDocuments({
        date: { $gte: today },
        isDeleted: false
    });

    // This week's attendance
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekAttendance = await Attendance.countDocuments({
        date: { $gte: weekStart },
        isDeleted: false
    });

    // Total members
    const totalMembers = await User.countDocuments({ isActive: true, role: { $ne: 'visitor' } });

    // Active services
    const activeServices = await Service.countDocuments({ isActive: true });

    // Attendance rate
    const totalAttendances = await Attendance.countDocuments({ isDeleted: false });
    const totalExpected = totalMembers * activeServices;
    const attendanceRate = totalExpected > 0 ? Math.round((totalAttendances / totalExpected) * 100) : 0;

    res.json({
        success: true,
        data: {
            todayAttendance,
            weekAttendance,
            totalMembers,
            activeServices,
            attendanceRate,
            timestamp: new Date()
        }
    });
});

router4.get('/trends', async (req, res) => {
    const Attendance = require('../models/Attendance');
    const { startDate, endDate, groupBy = 'day' } = req.query;

    const match = { isDeleted: false };
    if (startDate || endDate) {
        match.date = {};
        if (startDate) match.date.$gte = new Date(startDate);
        if (endDate) match.date.$lte = new Date(endDate);
    }

    let groupFormat;
    switch (groupBy) {
        case 'month':
            groupFormat = '%Y-%m';
            break;
        case 'week':
            groupFormat = '%Y-%U';
            break;
        default:
            groupFormat = '%Y-%m-%d';
    }

    const trends = await Attendance.aggregate([
        { $match: match },
        {
            $group: {
                _id: { $dateToString: { format: groupFormat, date: '$date' } },
                count: { $sum: 1 },
                late: { $sum: { $cond: ['$isLate', 1, 0] } }
            }
        },
        { $sort: { _id: 1 } },
        { $limit: 30 }
    ]);

    res.json({ success: true, data: { trends } });
});

module.exports = router4;