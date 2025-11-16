const Service = require('../models/Service');
const Attendance = require('../models/Attendance');
const { asyncHandler } = require('../middleware/errorHandler');
const { SERVICE_TYPES, DAYS_OF_WEEK } = require('../config/constants');

// @desc    Create new service
// @route   POST /api/v1/services
// @access  Private/Admin
exports.createService = asyncHandler(async (req, res) => {
    const serviceData = {
        ...req.body,
        createdBy: req.user.id
    };

    const service = await Service.create(serviceData);

    res.status(201).json({
        success: true,
        message: 'Service created successfully',
        data: { service }
    });
});

// @desc    Get all services
// @route   GET /api/v1/services
// @access  Public
exports.getAllServices = asyncHandler(async (req, res) => {
    const {
        type,
        isActive,
        dayOfWeek,
        includeInactive = false,
        page = 1,
        limit = 20
    } = req.query;

    const query = {};

    if (type) query.type = type;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (!includeInactive) query.isActive = true;
    if (dayOfWeek !== undefined) {
        query['recurrence.daysOfWeek'] = parseInt(dayOfWeek);
    }

    const services = await Service.find(query)
        .populate('minister', 'firstName lastName')
        .populate('assistants', 'firstName lastName')
        .sort({ 'recurrence.daysOfWeek': 1, startTime: 1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

    const total = await Service.countDocuments(query);

    res.status(200).json({
        success: true,
        count: services.length,
        total,
        pages: Math.ceil(total / limit),
        data: { services }
    });
});

// @desc    Get service by ID
// @route   GET /api/v1/services/:id
// @access  Public
exports.getService = asyncHandler(async (req, res) => {
    const service = await Service.findById(req.params.id)
        .populate('minister', 'firstName lastName email phoneNumber')
        .populate('assistants', 'firstName lastName email phoneNumber')
        .populate('requiredFor.departments', 'name code');

    if (!service) {
        return res.status(404).json({
            success: false,
            message: 'Service not found'
        });
    }

    res.status(200).json({
        success: true,
        data: { service }
    });
});

// @desc    Update service
// @route   PUT /api/v1/services/:id
// @access  Private/Admin
exports.updateService = asyncHandler(async (req, res) => {
    let service = await Service.findById(req.params.id);

    if (!service) {
        return res.status(404).json({
            success: false,
            message: 'Service not found'
        });
    }

    service = await Service.findByIdAndUpdate(
        req.params.id,
        { ...req.body, updatedBy: req.user.id },
        { new: true, runValidators: true }
    );

    res.status(200).json({
        success: true,
        message: 'Service updated successfully',
        data: { service }
    });
});

// @desc    Delete service
// @route   DELETE /api/v1/services/:id
// @access  Private/Admin
exports.deleteService = asyncHandler(async (req, res) => {
    const service = await Service.findById(req.params.id);

    if (!service) {
        return res.status(404).json({
            success: false,
            message: 'Service not found'
        });
    }

    // Soft delete - mark as inactive instead of removing
    service.isActive = false;
    await service.save();

    res.status(200).json({
        success: true,
        message: 'Service deactivated successfully'
    });
});

// @desc    Get today's services
// @route   GET /api/v1/services/today
// @access  Public
exports.getTodayServices = asyncHandler(async (req, res) => {
    const today = new Date();
    const dayOfWeek = today.getDay();

    const services = await Service.find({
        isActive: true,
        'recurrence.isRecurring': true,
        'recurrence.daysOfWeek': dayOfWeek
    })
        .populate('minister', 'firstName lastName')
        .sort({ startTime: 1 });

    res.status(200).json({
        success: true,
        count: services.length,
        date: today.toISOString().split('T')[0],
        dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek],
        data: { services }
    });
});

// @desc    Get upcoming services
// @route   GET /api/v1/services/upcoming
// @access  Public
exports.getUpcomingServices = asyncHandler(async (req, res) => {
    const { days = 7 } = req.query;

    const services = await Service.find({
        isActive: true,
        'recurrence.isRecurring': true
    })
        .populate('minister', 'firstName lastName')
        .sort({ startTime: 1 });

    const upcomingSchedule = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < parseInt(days); i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        const dayOfWeek = date.getDay();

        const dayServices = services.filter(s =>
            s.recurrence.daysOfWeek.includes(dayOfWeek)
        );

        if (dayServices.length > 0) {
            upcomingSchedule.push({
                date: date.toISOString().split('T')[0],
                dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek],
                services: dayServices.map(s => ({
                    id: s._id,
                    name: s.name,
                    type: s.type,
                    startTime: s.startTime,
                    endTime: s.endTime,
                    venue: s.venue,
                    minister: s.minister
                }))
            });
        }
    }

    res.status(200).json({
        success: true,
        count: upcomingSchedule.length,
        data: { schedule: upcomingSchedule }
    });
});

// @desc    Get service calendar (month view)
// @route   GET /api/v1/services/calendar
// @access  Public
exports.getServiceCalendar = asyncHandler(async (req, res) => {
    const { year, month } = req.query;

    const targetYear = parseInt(year) || new Date().getFullYear();
    const targetMonth = parseInt(month) || new Date().getMonth() + 1;

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0);

    const services = await Service.find({
        isActive: true,
        'recurrence.isRecurring': true
    })
        .populate('minister', 'firstName lastName')
        .sort({ startTime: 1 });

    const calendar = [];

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay();
        const dateStr = d.toISOString().split('T')[0];

        const dayServices = services.filter(s =>
            s.recurrence.daysOfWeek.includes(dayOfWeek)
        );

        calendar.push({
            date: dateStr,
            dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek],
            hasServices: dayServices.length > 0,
            serviceCount: dayServices.length,
            services: dayServices.map(s => ({
                id: s._id,
                name: s.name,
                type: s.type,
                startTime: s.startTime,
                venue: s.venue
            }))
        });
    }

    res.status(200).json({
        success: true,
        month: targetMonth,
        year: targetYear,
        totalDays: calendar.length,
        daysWithServices: calendar.filter(d => d.hasServices).length,
        data: { calendar }
    });
});

// @desc    Get service statistics
// @route   GET /api/v1/services/:id/stats
// @access  Private
exports.getServiceStats = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    const service = await Service.findById(req.params.id);

    if (!service) {
        return res.status(404).json({
            success: false,
            message: 'Service not found'
        });
    }

    const query = {
        service: service._id,
        isDeleted: false
    };

    if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate);
        if (endDate) query.date.$lte = new Date(endDate);
    }

    // Get attendance summary
    const summary = await Attendance.getAttendanceSummary(query);

    // Get attendance by date
    const attendanceByDate = await Attendance.aggregate([
        { $match: query },
        {
            $group: {
                _id: {
                    $dateToString: { format: '%Y-%m-%d', date: '$date' }
                },
                count: { $sum: 1 },
                late: {
                    $sum: { $cond: ['$isLate', 1, 0] }
                },
                averageMinutesLate: { $avg: '$minutesLate' }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    // Get attendance trends
    const trends = await Attendance.aggregate([
        { $match: query },
        {
            $group: {
                _id: {
                    year: { $year: '$date' },
                    month: { $month: '$date' }
                },
                count: { $sum: 1 },
                avgDuration: { $avg: '$duration' }
            }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.status(200).json({
        success: true,
        data: {
            service: {
                id: service._id,
                name: service.name,
                type: service.type
            },
            summary,
            attendanceByDate,
            trends,
            serviceStats: service.stats
        }
    });
});

// @desc    Cancel service occurrence
// @route   POST /api/v1/services/:id/cancel
// @access  Private/Admin
exports.cancelService = asyncHandler(async (req, res) => {
    const { date, reason } = req.body;

    const service = await Service.findById(req.params.id);

    if (!service) {
        return res.status(404).json({
            success: false,
            message: 'Service not found'
        });
    }

    service.isCancelled = true;
    service.cancellationReason = reason;
    await service.save();

    // TODO: Send notifications to all expected attendees

    res.status(200).json({
        success: true,
        message: 'Service cancelled successfully',
        data: { service }
    });
});

// @desc    Get service types
// @route   GET /api/v1/services/types/list
// @access  Public
exports.getServiceTypes = asyncHandler(async (req, res) => {
    res.status(200).json({
        success: true,
        data: {
            types: Object.entries(SERVICE_TYPES).map(([key, value]) => ({
                key,
                value,
                label: value.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
            }))
        }
    });
});