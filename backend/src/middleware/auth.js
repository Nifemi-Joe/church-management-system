const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - verify JWT token
exports.protect = async (req, res, next) => {
    try {
        let token;

        // Check for token in headers
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to access this route. Please login.'
            });
        }

        try {
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Check if user still exists
            const user = await User.findById(decoded.id).select('+password');

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'User belonging to this token no longer exists'
                });
            }

            // Check if user is active
            if (!user.isActive) {
                return res.status(401).json({
                    success: false,
                    message: 'Your account has been deactivated. Please contact admin.'
                });
            }

            // Check if user changed password after token was issued
            if (user.changedPasswordAfter(decoded.iat)) {
                return res.status(401).json({
                    success: false,
                    message: 'Password recently changed. Please login again.'
                });
            }

            // Grant access to protected route
            req.user = user;
            next();
        } catch (error) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Authentication error',
            error: error.message
        });
    }
};

// Optional authentication - doesn't fail if no token
exports.optionalAuth = async (req, res, next) => {
    try {
        let token;

        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const user = await User.findById(decoded.id);

                if (user && user.isActive) {
                    req.user = user;
                }
            } catch (error) {
                // Token invalid, but continue without user
            }
        }

        next();
    } catch (error) {
        next();
    }
};

// Check if user has required role(s)
exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `User role '${req.user.role}' is not authorized to access this route`
            });
        }

        next();
    };
};

// Check if user has required permission
exports.checkPermission = (permission) => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized'
            });
        }

        // Super admins have all permissions
        if (req.user.role === 'super_admin') {
            return next();
        }

        // Define role-based permissions
        const rolePermissions = {
            admin: [
                'view_all_attendance',
                'edit_attendance',
                'manage_users',
                'manage_services',
                'view_reports',
                'export_data',
                'send_notifications'
            ],
            pastor: [
                'view_all_attendance',
                'view_reports',
                'send_notifications',
                'manage_followups'
            ],
            department_head: [
                'view_department_attendance',
                'view_reports',
                'manage_followups'
            ],
            minister: [
                'view_attendance',
                'manage_followups'
            ],
            worker: ['view_own_attendance'],
            member: ['view_own_attendance'],
            visitor: []
        };

        const userPermissions = rolePermissions[req.user.role] || [];

        if (!userPermissions.includes(permission)) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to perform this action'
            });
        }

        next();
    };
};

// Verify user owns the resource or is admin
exports.verifyOwnership = (modelName, paramName = 'id') => {
    return async (req, res, next) => {
        try {
            const Model = require(`../models/${modelName}`);
            const resource = await Model.findById(req.params[paramName]);

            if (!resource) {
                return res.status(404).json({
                    success: false,
                    message: `${modelName} not found`
                });
            }

            // Admins and super_admins can access any resource
            if (['admin', 'super_admin', 'pastor'].includes(req.user.role)) {
                return next();
            }

            // Check if user owns the resource
            if (resource.user && resource.user.toString() !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'You do not have permission to access this resource'
                });
            }

            next();
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Error verifying ownership',
                error: error.message
            });
        }
    };
};