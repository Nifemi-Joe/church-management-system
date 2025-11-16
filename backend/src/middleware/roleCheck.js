const { ROLES, PERMISSIONS } = require('../config/constants');

/**
 * Define permissions for each role
 */
const ROLE_PERMISSIONS = {
    [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS),

    [ROLES.ADMIN]: [
        PERMISSIONS.VIEW_ALL_ATTENDANCE,
        PERMISSIONS.EDIT_ATTENDANCE,
        PERMISSIONS.DELETE_ATTENDANCE,
        PERMISSIONS.MANAGE_USERS,
        PERMISSIONS.MANAGE_SERVICES,
        PERMISSIONS.MANAGE_DEPARTMENTS,
        PERMISSIONS.VIEW_REPORTS,
        PERMISSIONS.EXPORT_DATA,
        PERMISSIONS.SEND_NOTIFICATIONS,
        PERMISSIONS.MANAGE_FOLLOWUPS
    ],

    [ROLES.PASTOR]: [
        PERMISSIONS.VIEW_ALL_ATTENDANCE,
        PERMISSIONS.VIEW_REPORTS,
        PERMISSIONS.SEND_NOTIFICATIONS,
        PERMISSIONS.MANAGE_FOLLOWUPS,
        PERMISSIONS.EXPORT_DATA
    ],

    [ROLES.DEPARTMENT_HEAD]: [
        PERMISSIONS.VIEW_REPORTS,
        PERMISSIONS.MANAGE_FOLLOWUPS,
        PERMISSIONS.EXPORT_DATA
    ],

    [ROLES.MINISTER]: [
        PERMISSIONS.VIEW_REPORTS,
        PERMISSIONS.MANAGE_FOLLOWUPS
    ],

    [ROLES.WORKER]: [],

    [ROLES.MEMBER]: [],

    [ROLES.VISITOR]: []
};

/**
 * Check if user has required role
 * @param {...string} roles - Required roles
 */
exports.requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions',
                required: roles,
                current: req.user.role
            });
        }

        next();
    };
};

/**
 * Check if user has specific permission
 * @param {string} permission - Required permission
 */
exports.requirePermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const userPermissions = ROLE_PERMISSIONS[req.user.role] || [];

        if (!userPermissions.includes(permission)) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to perform this action',
                required: permission,
                role: req.user.role
            });
        }

        next();
    };
};

/**
 * Check if user has any of the specified permissions
 * @param {...string} permissions - List of permissions
 */
exports.requireAnyPermission = (...permissions) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const userPermissions = ROLE_PERMISSIONS[req.user.role] || [];
        const hasPermission = permissions.some(p => userPermissions.includes(p));

        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                message: 'You do not have any of the required permissions',
                required: permissions,
                role: req.user.role
            });
        }

        next();
    };
};

/**
 * Check if user has all specified permissions
 * @param {...string} permissions - List of permissions
 */
exports.requireAllPermissions = (...permissions) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const userPermissions = ROLE_PERMISSIONS[req.user.role] || [];
        const hasAllPermissions = permissions.every(p => userPermissions.includes(p));

        if (!hasAllPermissions) {
            return res.status(403).json({
                success: false,
                message: 'You do not have all required permissions',
                required: permissions,
                role: req.user.role
            });
        }

        next();
    };
};

/**
 * Check if user can access department data
 */
exports.canAccessDepartment = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    // Super admin and admin can access all departments
    if ([ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PASTOR].includes(req.user.role)) {
        return next();
    }

    const departmentId = req.params.departmentId || req.body.departmentId || req.query.departmentId;

    if (!departmentId) {
        return res.status(400).json({
            success: false,
            message: 'Department ID required'
        });
    }

    // Check if user belongs to the department
    const userDepartments = req.user.departments.map(d => d.toString());

    if (!userDepartments.includes(departmentId)) {
        return res.status(403).json({
            success: false,
            message: 'You do not have access to this department'
        });
    }

    next();
};

/**
 * Check if user can manage other users
 */
exports.canManageUser = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    const targetUserId = req.params.id || req.params.userId;

    // Users can always manage themselves
    if (targetUserId === req.user.id) {
        return next();
    }

    // Super admin can manage everyone
    if (req.user.role === ROLES.SUPER_ADMIN) {
        return next();
    }

    // Admin can manage non-admin users
    if (req.user.role === ROLES.ADMIN) {
        const User = require('../models/User');
        const targetUser = await User.findById(targetUserId);

        if (!targetUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if ([ROLES.SUPER_ADMIN, ROLES.ADMIN].includes(targetUser.role)) {
            return res.status(403).json({
                success: false,
                message: 'Cannot manage admin users'
            });
        }

        return next();
    }

    // Department heads can manage their department members
    if (req.user.role === ROLES.DEPARTMENT_HEAD) {
        const Department = require('../models/Department');
        const User = require('../models/User');

        const targetUser = await User.findById(targetUserId);
        const userDepartments = await Department.find({ head: req.user.id });
        const departmentIds = userDepartments.map(d => d._id.toString());

        const canManage = targetUser.departments.some(d =>
            departmentIds.includes(d.toString())
        );

        if (!canManage) {
            return res.status(403).json({
                success: false,
                message: 'You can only manage members of your department'
            });
        }

        return next();
    }

    return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to manage users'
    });
};

/**
 * Get user permissions
 */
exports.getUserPermissions = (role) => {
    return ROLE_PERMISSIONS[role] || [];
};

/**
 * Check if role has permission
 */
exports.roleHasPermission = (role, permission) => {
    const permissions = ROLE_PERMISSIONS[role] || [];
    return permissions.includes(permission);
};

/**
 * Middleware to attach user permissions to request
 */
exports.attachPermissions = (req, res, next) => {
    if (req.user) {
        req.user.permissions = ROLE_PERMISSIONS[req.user.role] || [];
    }
    next();
};

/**
 * Check if user is department head
 */
exports.isDepartmentHead = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    if ([ROLES.SUPER_ADMIN, ROLES.ADMIN].includes(req.user.role)) {
        return next();
    }

    const Department = require('../models/Department');
    const isDepartmentHead = await Department.exists({ head: req.user.id });

    if (!isDepartmentHead) {
        return res.status(403).json({
            success: false,
            message: 'Only department heads can perform this action'
        });
    }

    next();
};

/**
 * Hierarchical role check - user can only manage users below their role
 */
const ROLE_HIERARCHY = {
    [ROLES.SUPER_ADMIN]: 7,
    [ROLES.ADMIN]: 6,
    [ROLES.PASTOR]: 5,
    [ROLES.DEPARTMENT_HEAD]: 4,
    [ROLES.MINISTER]: 3,
    [ROLES.WORKER]: 2,
    [ROLES.MEMBER]: 1,
    [ROLES.VISITOR]: 0
};

exports.canManageRole = (targetRole) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
        const targetLevel = ROLE_HIERARCHY[targetRole] || 0;

        if (userLevel <= targetLevel) {
            return res.status(403).json({
                success: false,
                message: 'You cannot manage users of equal or higher role',
                userRole: req.user.role,
                targetRole
            });
        }

        next();
    };
};