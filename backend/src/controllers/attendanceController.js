const Attendance = require('../models/Attendance');
const Service = require('../models/Service');
const User = require('../models/User');
const FollowUp = require('../models/FollowUp');
const { asyncHandler } = require('../middleware/errorHandler');
const { ATTENDANCE_STATUS, CHECKIN_METHODS } = require('../config/constants');

// Helper function to calculate distance between two points
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
};

// @desc    Check-in to a service
// @route   POST /api/v1/attendance/checkin
// @access  Private
exports.checkIn = asyncHandler(async (req, res) => {
    const {
        serviceId,
        method = CHECKIN_METHODS.MANUAL,
        location,
        deviceInfo,
        qrData
    } = req.body;

    const userId = req.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find the service
    const service = await Service.findById(serviceId);
    if (!service || !service.isActive) {
        return res.status(404).json({
            success: false,
            message: 'Service not found or inactive'
        });
    }

    // Check if already checked in today for this service
    const existingAttendance = await Attendance.findOne({
        user: userId,
        service: serviceId,
        date: {
            $gte: today,
            $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        },
        isDeleted: false
    });

    if (existingAttendance) {
        return res.status(400).json({
            success: false,
            message: 'You have already checked in for this service today'
        });
    }

    const now = new Date();
    const [serviceHour, serviceMin] = service.startTime.split(':').map(Number);
    const serviceStart = new Date(now);
    serviceStart.setHours(serviceHour, serviceMin, 0, 0);

    // Calculate if late
    const minutesLate = Math.max(0, Math.floor((now - serviceStart) / (1000 * 60)));
    const isLate = minutesLate > service.lateThresholdMinutes;

    // Verify location if GPS is enabled
    let distanceFromVenue = 0;
    let withinGeofence = true;

    if (service.checkInSettings.enableGPS && location) {
        const [userLon, userLat] = location.coordinates;
        const [venueLon, venueLat] = service.location.coordinates;

        distanceFromVenue = calculateDistance(userLat, userLon, venueLat, venueLon);
        withinGeofence = distanceFromVenue <= service.geofenceRadius;

        if (!withinGeofence && !['admin', 'super_admin'].includes(req.user.role)) {
            return res.status(400).json({
                success: false,
                message: `You are ${Math.round(distanceFromVenue)}m away from the venue. Please move closer to check in.`,
                distance: Math.round(distanceFromVenue),
                required: service.geofenceRadius
            });
        }
    }

    // Create attendance record
    const attendance = await Attendance.create({
        user: userId,
        service: serviceId,
        date: today,
        checkInTime: now,
        status: isLate ? ATTENDANCE_STATUS.LATE : ATTENDANCE_STATUS.PRESENT,
        method,
        location: location || service.location,
        distanceFromVenue: Math.round(distanceFromVenue),
        withinGeofence,
        deviceInfo,
        isLate,
        minutesLate,
        createdBy: userId
    });

    // Update user attendance statistics
    const user = await User.findById(userId);
    user.attendanceStats.totalServices += 1;
    user.attendanceStats.totalPresent += 1;
    if (isLate) user.attendanceStats.totalLate += 1;
    user.attendanceStats.consecutiveAbsences = 0; // Reset consecutive absences
    user.attendanceStats.lastAttendance = now;
    user.attendanceStats.attendanceRate = Math.round(
        (user.attendanceStats.totalPresent / user.attendanceStats.totalServices) * 100
    );
    user.calculateEngagementScore();
    await user.save();

    // Update service statistics
    service.stats.totalOccurrences += 1;
    service.stats.lastOccurrence = today;
    await service.save();

    // Populate response
    await attendance.populate([
        { path: 'user', select: 'firstName lastName membershipId' },
        { path: 'service', select: 'name type startTime' }
    ]);

    res.status(201).json({
        success: true,
        message: `Successfully checked in${isLate ? ' (Late)' : ''}`,
        data: {
            attendance,
            stats: {
                totalPresent: user.attendanceStats.totalPresent,
                attendanceRate: user.attendanceStats.attendanceRate,
                engagementScore: user.attendanceStats.engagementScore
            }
        }
    });
});

// @desc    Check-out from a service
// @route   POST /api/v1/attendance/:id/checkout
// @access  Private
exports.checkOut = asyncHandler(async (req, res) => {
    const attendance = await Attendance.findById(req.params.id);

    if (!attendance) {
        return res.status(404).json({
            success: false,
            message: 'Attendance record not found'
        });
    }

    // Verify ownership or admin
    if (attendance.user.toString() !== req.user.id &&
        !['admin', 'super_admin'].includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: 'Not authorized to check out this attendance'
        });
    }

    if (attendance.checkOutTime) {
        return res.status(400).json({
            success: false,
            message: 'Already checked out'
        });
    }

    attendance.checkOutTime = new Date();
    attendance.calculateDuration();
    await attendance.save();

    res.status(200).json({
        success: true,
        message: 'Successfully checked out',
        data: { attendance }
    });
});

// @desc    Get user's attendance history
// @route   GET /api/v1/attendance/my-attendance
// @access  Private
exports.getMyAttendance = asyncHandler(async (req, res) => {
    const { startDate, endDate, serviceType, page = 1, limit = 20 } = req.query;

    const query = {
        user: req.user.id,
        isDeleted: false
    };

    // Date filter
    if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate);
        if (endDate) query.date.$lte = new Date(endDate);
    }

    const attendance = await Attendance.find(query)
        .populate('service', 'name type startTime venue')
        .sort({ date: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

    const total = await Attendance.countDocuments(query);

    res.status(200).json({
        success: true,
        count: attendance.length,
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
        data: { attendance }
    });
});

// @desc    Get all attendance records (Admin)
// @route   GET /api/v1/attendance
// @access  Private/Admin
exports.getAllAttendance = asyncHandler(async (req, res) => {
    const {
        serviceId,
        userId,
        startDate,
        endDate,
        status,
        method,
        page = 1,
        limit = 50
    } = req.query;

    const query = { isDeleted: false };

    if (serviceId) query.service = serviceId;
    if (userId) query.user = userId;
    if (status) query.status = status;
    if (method) query.method = method;

    if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate);
        if (endDate) query.date.$lte = new Date(endDate);
    }

    const attendance = await Attendance.find(query)
        .populate('user', 'firstName lastName membershipId email phoneNumber')
        .populate('service', 'name type startTime venue')
        .sort({ date: -1, checkInTime: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

    const total = await Attendance.countDocuments(query);

    // Get summary statistics
    const summary = await Attendance.getAttendanceSummary(query);

    res.status(200).json({
        success: true,
        count: attendance.length,
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
        summary,
        data: { attendance }
    });
});

// @desc    Get attendance for a specific service
// @route   GET /api/v1/attendance/service/:serviceId
// @access  Private
exports.getServiceAttendance = asyncHandler(async (req, res) => {
    const { serviceId } = req.params;
    const { date, page = 1, limit = 100 } = req.query;

    const service = await Service.findById(serviceId);
    if (!service) {
        return res.status(404).json({
            success: false,
            message: 'Service not found'
        });
    }

    const query = {
        service: serviceId,
        isDeleted: false
    };

    if (date) {
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);
        query.date = {
            $gte: targetDate,
            $lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000)
        };
    }

    const attendance = await Attendance.find(query)
        .populate('user', 'firstName lastName membershipId email phoneNumber profilePicture')
        .sort({ checkInTime: 1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

    const total = await Attendance.countDocuments(query);
    const summary = await Attendance.getAttendanceSummary(query);

    res.status(200).json({
        success: true,
        service: {
            id: service._id,
            name: service.name,
            type: service.type,
            expectedAttendance: service.expectedAttendance
        },
        count: attendance.length,
        total,
        pages: Math.ceil(total / limit),
        summary,
        data: { attendance }
    });
});

// @desc    Update attendance record (Admin)
// @route   PUT /api/v1/attendance/:id
// @access  Private/Admin
exports.updateAttendance = asyncHandler(async (req, res) => {
    const { status, notes, exceptionType, exceptionReason } = req.body;

    let attendance = await Attendance.findById(req.params.id);

    if (!attendance) {
        return res.status(404).json({
            success: false,
            message: 'Attendance record not found'
        });
    }

    if (status) attendance.status = status;
    if (notes) attendance.notes = notes;

    if (exceptionType) {
        attendance.isException = true;
        attendance.exceptionType = exceptionType;
        attendance.exceptionReason = exceptionReason;
        attendance.approvedBy = req.user.id;
    }

    attendance.updatedBy = req.user.id;
    await attendance.save();

    res.status(200).json({
        success: true,
        message: 'Attendance record updated',
        data: { attendance }
    });
});

// @desc    Delete attendance record (Soft delete)
// @route   DELETE /api/v1/attendance/:id
// @access  Private/Admin
exports.deleteAttendance = asyncHandler(async (req, res) => {
    const { reason } = req.body;

    const attendance = await Attendance.findById(req.params.id);

    if (!attendance) {
        return res.status(404).json({
            success: false,
            message: 'Attendance record not found'
        });
    }

    attendance.isDeleted = true;
    attendance.deletedBy = req.user.id;
    attendance.deletedAt = new Date();
    attendance.deleteReason = reason || 'Deleted by admin';
    await attendance.save();

    res.status(200).json({
        success: true,
        message: 'Attendance record deleted'
    });
});

// @desc    Check for absent members and create follow-ups
// @route   POST /api/v1/attendance/check-absences
// @access  Private/Admin
exports.checkAbsences = asyncHandler(async (req, res) => {
    const { serviceId, date } = req.body;

    const service = await Service.findById(serviceId);
    if (!service) {
        return res.status(404).json({
            success: false,
            message: 'Service not found'
        });
    }

    const targetDate = new Date(date || Date.now());
    targetDate.setHours(0, 0, 0, 0);

    // Get all users who should attend
    let expectedAttendees = [];

    if (service.requiredFor.allMembers) {
        expectedAttendees = await User.find({ isActive: true, role: { $ne: 'visitor' } });
    } else {
        const query = { isActive: true };
        if (service.requiredFor.workers) query.isWorker = true;
        if (service.requiredFor.ministers) query.isMinister = true;
        if (service.requiredFor.departments?.length > 0) {
            query.departments = { $in: service.requiredFor.departments };
        }
        expectedAttendees = await User.find(query);
    }

    // Get all who attended
    const attendedUserIds = await Attendance.find({
        service: serviceId,
        date: {
            $gte: targetDate,
            $lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000)
        },
        isDeleted: false
    }).distinct('user');

    // Find absentees
    const absentees = expectedAttendees.filter(
        user => !attendedUserIds.some(id => id.toString() === user._id.toString())
    );

    // Update consecutive absences and create follow-ups
    const followUpsCreated = [];

    for (const user of absentees) {
        user.attendanceStats.consecutiveAbsences += 1;
        user.attendanceStats.totalAbsent += 1;
        await user.save();

        // Create follow-up if 2 or more consecutive absences
        if (user.attendanceStats.consecutiveAbsences >= 2) {
            const recentAbsences = await Service.find({
                _id: serviceId
            }).limit(user.attendanceStats.consecutiveAbsences);

            const followUp = await FollowUp.createAutoFollowUp(
                user._id,
                recentAbsences.map(s => ({ service: s._id, date: targetDate }))
            );

            followUpsCreated.push(followUp);
        }
    }

    res.status(200).json({
        success: true,
        message: 'Absence check completed',
        data: {
            totalExpected: expectedAttendees.length,
            totalAttended: attendedUserIds.length,
            totalAbsent: absentees.length,
            followUpsCreated: followUpsCreated.length,
            absentees: absentees.map(u => ({
                id: u._id,
                name: u.fullName,
                consecutiveAbsences: u.attendanceStats.consecutiveAbsences
            }))
        }
    });
});

// @desc    Scan QR code for check-in
// @route   POST /api/v1/attendance/qr-checkin
// @access  Private
exports.qrCheckIn = asyncHandler(async (req, res) => {
    const { qrData, serviceId, location, deviceInfo } = req.body;

    if (!qrData) {
        return res.status(400).json({
            success: false,
            message: 'QR code data required'
        });
    }

    let parsedData;
    try {
        parsedData = JSON.parse(qrData);
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: 'Invalid QR code format'
        });
    }

    const { userId, membershipId } = parsedData;

    // Verify user exists
    const user = await User.findById(userId);
    if (!user || user.membershipId !== membershipId) {
        return res.status(400).json({
            success: false,
            message: 'Invalid QR code'
        });
    }

    // Temporarily set req.user to the scanned user for check-in
    req.user = user;
    req.body.method = CHECKIN_METHODS.QR_CODE;

    // Call the regular check-in function
    return exports.checkIn(req, res);
});

// @desc    Bulk check-in (Admin)
// @route   POST /api/v1/attendance/bulk-checkin
// @access  Private/Admin
exports.bulkCheckIn = asyncHandler(async (req, res) => {
    const { userIds, serviceId, date, notes } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'User IDs array required'
        });
    }

    const service = await Service.findById(serviceId);
    if (!service) {
        return res.status(404).json({
            success: false,
            message: 'Service not found'
        });
    }

    const targetDate = new Date(date || Date.now());
    targetDate.setHours(0, 0, 0, 0);

    const results = {
        success: [],
        failed: []
    };

    for (const userId of userIds) {
        try {
            // Check if already exists
            const existing = await Attendance.findOne({
                user: userId,
                service: serviceId,
                date: {
                    $gte: targetDate,
                    $lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000)
                },
                isDeleted: false
            });

            if (existing) {
                results.failed.push({ userId, reason: 'Already checked in' });
                continue;
            }

            const attendance = await Attendance.create({
                user: userId,
                service: serviceId,
                date: targetDate,
                checkInTime: new Date(),
                status: ATTENDANCE_STATUS.PRESENT,
                method: CHECKIN_METHODS.MANUAL,
                isManualEntry: true,
                manualEntryReason: notes || 'Bulk check-in',
                enteredBy: req.user.id,
                createdBy: req.user.id,
                location: service.location
            });

            // Update user stats
            const user = await User.findById(userId);
            if (user) {
                user.attendanceStats.totalServices += 1;
                user.attendanceStats.totalPresent += 1;
                user.attendanceStats.consecutiveAbsences = 0;
                user.attendanceStats.lastAttendance = new Date();
                user.attendanceStats.attendanceRate = Math.round(
                    (user.attendanceStats.totalPresent / user.attendanceStats.totalServices) * 100
                );
                user.calculateEngagementScore();
                await user.save();
            }

            results.success.push({ userId, attendanceId: attendance._id });
        } catch (error) {
            results.failed.push({ userId, reason: error.message });
        }
    }

    res.status(200).json({
        success: true,
        message: `Bulk check-in completed. ${results.success.length} successful, ${results.failed.length} failed`,
        data: results
    });
});