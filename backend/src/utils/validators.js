const { body, param, query, validationResult } = require('express-validator');

/**
 * Validation middleware
 */
exports.validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }
    next();
};

/**
 * User registration validation
 */
exports.validateRegistration = [
    body('firstName')
        .trim()
        .notEmpty().withMessage('First name is required')
        .isLength({ min: 2, max: 50 }).withMessage('First name must be 2-50 characters'),

    body('lastName')
        .trim()
        .notEmpty().withMessage('Last name is required')
        .isLength({ min: 2, max: 50 }).withMessage('Last name must be 2-50 characters'),

    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Must be a valid email')
        .normalizeEmail(),

    body('phoneNumber')
        .trim()
        .notEmpty().withMessage('Phone number is required')
        .matches(/^(\+234|0)[789][01]\d{8}$/).withMessage('Must be a valid Nigerian phone number'),

    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain uppercase, lowercase, and number'),

    body('gender')
        .notEmpty().withMessage('Gender is required')
        .isIn(['male', 'female']).withMessage('Gender must be male or female'),

    exports.validate
];

/**
 * Login validation
 */
exports.validateLogin = [
    body('email').optional().isEmail().withMessage('Must be a valid email'),
    body('phoneNumber').optional().matches(/^(\+234|0)[789][01]\d{8}$/),
    body('password').notEmpty().withMessage('Password is required'),
    exports.validate
];

/**
 * Service creation validation
 */
exports.validateService = [
    body('name')
        .trim()
        .notEmpty().withMessage('Service name is required')
        .isLength({ max: 100 }).withMessage('Service name too long'),

    body('type')
        .notEmpty().withMessage('Service type is required'),

    body('startTime')
        .notEmpty().withMessage('Start time is required')
        .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid time format (HH:mm)'),

    body('endTime')
        .notEmpty().withMessage('End time is required')
        .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid time format (HH:mm)'),

    body('recurrence.daysOfWeek')
        .optional()
        .isArray().withMessage('Days of week must be an array')
        .custom((days) => {
            return days.every(day => day >= 0 && day <= 6);
        }).withMessage('Invalid day of week'),

    exports.validate
];

/**
 * Check-in validation
 */
exports.validateCheckIn = [
    body('serviceId')
        .notEmpty().withMessage('Service ID is required')
        .isMongoId().withMessage('Invalid service ID'),

    body('method')
        .optional()
        .isIn(['qr_code', 'manual', 'nfc', 'gps', 'facial_recognition', 'auto'])
        .withMessage('Invalid check-in method'),

    body('location.coordinates')
        .optional()
        .isArray({ min: 2, max: 2 }).withMessage('Coordinates must be [longitude, latitude]'),

    exports.validate
];

/**
 * Quick check-in validation (public)
 */
exports.validateQuickCheckIn = [
    body('firstName')
        .trim()
        .notEmpty().withMessage('First name is required')
        .isLength({ min: 2, max: 50 }).withMessage('First name must be 2-50 characters'),

    body('lastName')
        .trim()
        .notEmpty().withMessage('Last name is required')
        .isLength({ min: 2, max: 50 }).withMessage('Last name must be 2-50 characters'),

    body('phoneNumber')
        .trim()
        .notEmpty().withMessage('Phone number is required')
        .matches(/^(\+234|0)[789][01]\d{8}$/).withMessage('Must be a valid Nigerian phone number'),

    body('email')
        .optional()
        .trim()
        .isEmail().withMessage('Must be a valid email')
        .normalizeEmail(),

    body('serviceId')
        .notEmpty().withMessage('Service ID is required')
        .isMongoId().withMessage('Invalid service ID'),

    exports.validate
];

/**
 * Update user profile validation
 */
exports.validateProfileUpdate = [
    body('firstName')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 }).withMessage('First name must be 2-50 characters'),

    body('lastName')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 }).withMessage('Last name must be 2-50 characters'),

    body('phoneNumber')
        .optional()
        .matches(/^(\+234|0)[789][01]\d{8}$/).withMessage('Must be a valid Nigerian phone number'),

    body('email')
        .optional()
        .isEmail().withMessage('Must be a valid email'),

    body('bio')
        .optional()
        .isLength({ max: 500 }).withMessage('Bio cannot exceed 500 characters'),

    exports.validate
];

/**
 * Change password validation
 */
exports.validatePasswordChange = [
    body('currentPassword')
        .notEmpty().withMessage('Current password is required'),

    body('newPassword')
        .notEmpty().withMessage('New password is required')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain uppercase, lowercase, and number'),

    body('confirmPassword')
        .notEmpty().withMessage('Please confirm password')
        .custom((value, { req }) => value === req.body.newPassword)
        .withMessage('Passwords do not match'),

    exports.validate
];

/**
 * Department validation
 */
exports.validateDepartment = [
    body('name')
        .trim()
        .notEmpty().withMessage('Department name is required')
        .isLength({ max: 100 }).withMessage('Department name too long'),

    body('code')
        .trim()
        .notEmpty().withMessage('Department code is required')
        .isLength({ max: 10 }).withMessage('Department code too long')
        .matches(/^[A-Z0-9]+$/).withMessage('Code must be uppercase letters and numbers only'),

    body('description')
        .optional()
        .isLength({ max: 500 }).withMessage('Description too long'),

    exports.validate
];

/**
 * Follow-up validation
 */
exports.validateFollowUp = [
    body('member')
        .notEmpty().withMessage('Member ID is required')
        .isMongoId().withMessage('Invalid member ID'),

    body('assignedTo')
        .notEmpty().withMessage('Assigned to is required')
        .isMongoId().withMessage('Invalid user ID'),

    body('reason')
        .notEmpty().withMessage('Reason is required')
        .isIn([
            'consecutive_absences',
            'low_engagement',
            'first_time_visitor',
            'returning_member',
            'special_needs',
            'birthday',
            'anniversary',
            'prayer_request',
            'custom'
        ]).withMessage('Invalid reason'),

    body('priority')
        .optional()
        .isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),

    body('dueDate')
        .notEmpty().withMessage('Due date is required')
        .isISO8601().withMessage('Invalid date format'),

    exports.validate
];

/**
 * MongoDB ID validation
 */
exports.validateMongoId = (paramName = 'id') => [
    param(paramName)
        .isMongoId().withMessage(`Invalid ${paramName}`),
    exports.validate
];

/**
 * Date range validation
 */
exports.validateDateRange = [
    query('startDate')
        .optional()
        .isISO8601().withMessage('Invalid start date format'),

    query('endDate')
        .optional()
        .isISO8601().withMessage('Invalid end date format')
        .custom((endDate, { req }) => {
            if (req.query.startDate && new Date(endDate) < new Date(req.query.startDate)) {
                throw new Error('End date must be after start date');
            }
            return true;
        }),

    exports.validate
];

/**
 * Pagination validation
 */
exports.validatePagination = [
    query('page')
        .optional()
        .isInt({ min: 1 }).withMessage('Page must be a positive integer')
        .toInt(),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
        .toInt(),

    exports.validate
];

/**
 * Bulk check-in validation
 */
exports.validateBulkCheckIn = [
    body('userIds')
        .isArray({ min: 1 }).withMessage('User IDs array is required')
        .custom((ids) => {
            return ids.every(id => /^[0-9a-fA-F]{24}$/.test(id));
        }).withMessage('All user IDs must be valid'),

    body('serviceId')
        .notEmpty().withMessage('Service ID is required')
        .isMongoId().withMessage('Invalid service ID'),

    body('date')
        .optional()
        .isISO8601().withMessage('Invalid date format'),

    exports.validate
];

/**
 * Complete registration validation
 */
exports.validateCompleteRegistration = [
    body('token')
        .notEmpty().withMessage('Registration token is required'),

    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain uppercase, lowercase, and number'),

    body('additionalInfo.gender')
        .optional()
        .isIn(['male', 'female']).withMessage('Gender must be male or female'),

    exports.validate
];

/**
 * Search validation
 */
exports.validateSearch = [
    query('search')
        .optional()
        .trim()
        .isLength({ min: 2 }).withMessage('Search term must be at least 2 characters'),

    query('role')
        .optional()
        .isIn(['super_admin', 'admin', 'pastor', 'department_head', 'minister', 'worker', 'member', 'visitor'])
        .withMessage('Invalid role'),

    exports.validate
];

/**
 * Export validation
 */
exports.validateExport = [
    query('format')
        .optional()
        .isIn(['csv', 'excel', 'pdf', 'json']).withMessage('Invalid export format'),

    query('startDate')
        .optional()
        .isISO8601().withMessage('Invalid start date'),

    query('endDate')
        .optional()
        .isISO8601().withMessage('Invalid end date'),

    exports.validate
];