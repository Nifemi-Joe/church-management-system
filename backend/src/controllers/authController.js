const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');
const QRCode = require('qrcode');

// Generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE
    });
};

// Generate Refresh Token
const generateRefreshToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
        expiresIn: process.env.JWT_REFRESH_EXPIRE
    });
};

// @desc    Register new user
// @route   POST /api/v1/auth/register
// @access  Public (or Admin only for production)
exports.register = asyncHandler(async (req, res) => {
    const {
        firstName,
        lastName,
        middleName,
        email,
        phoneNumber,
        password,
        gender,
        dateOfBirth,
        role
    } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({
        $or: [{ email }, { phoneNumber }]
    });

    if (existingUser) {
        return res.status(400).json({
            success: false,
            message: 'User with this email or phone number already exists'
        });
    }

    // Create user
    const user = await User.create({
        firstName,
        lastName,
        middleName,
        email,
        phoneNumber,
        password,
        gender,
        dateOfBirth,
        role: role || 'member'
    });

    // Generate QR Code
    const qrData = JSON.stringify({
        userId: user._id,
        membershipId: user.membershipId,
        name: user.fullName
    });

    const qrCodeUrl = await QRCode.toDataURL(qrData);
    user.qrCode = {
        url: qrCodeUrl,
        data: qrData
    };
    await user.save();

    // Generate tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: {
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                fullName: user.fullName,
                email: user.email,
                phoneNumber: user.phoneNumber,
                role: user.role,
                membershipId: user.membershipId,
                qrCode: user.qrCode.url
            },
            token,
            refreshToken
        }
    });
});

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res) => {
    const { email, phoneNumber, password } = req.body;

    // Validate input
    if ((!email && !phoneNumber) || !password) {
        return res.status(400).json({
            success: false,
            message: 'Please provide email/phone number and password'
        });
    }

    // Find user and include password
    const user = await User.findOne({
        $or: [{ email }, { phoneNumber }]
    }).select('+password');

    if (!user) {
        return res.status(401).json({
            success: false,
            message: 'Invalid credentials'
        });
    }

    // Check if user is active
    if (!user.isActive) {
        return res.status(401).json({
            success: false,
            message: 'Your account has been deactivated. Please contact admin.'
        });
    }

    // Check password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
        return res.status(401).json({
            success: false,
            message: 'Invalid credentials'
        });
    }

    // Update last login
    user.lastLogin = Date.now();
    await user.save({ validateBeforeSave: false });

    // Generate tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                fullName: user.fullName,
                email: user.email,
                phoneNumber: user.phoneNumber,
                role: user.role,
                membershipId: user.membershipId,
                profilePicture: user.profilePicture?.url,
                departments: user.departments,
                isWorker: user.isWorker,
                isMinister: user.isMinister
            },
            token,
            refreshToken
        }
    });
});

// @desc    Get current logged in user
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id)
        .populate('departments', 'name code')
        .select('-password');

    res.status(200).json({
        success: true,
        data: { user }
    });
});

// @desc    Update user profile
// @route   PUT /api/v1/auth/profile
// @access  Private
exports.updateProfile = asyncHandler(async (req, res) => {
    const fieldsToUpdate = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        middleName: req.body.middleName,
        phoneNumber: req.body.phoneNumber,
        dateOfBirth: req.body.dateOfBirth,
        maritalStatus: req.body.maritalStatus,
        address: req.body.address,
        preferredLanguage: req.body.preferredLanguage,
        bio: req.body.bio,
        notifications: req.body.notifications
    };

    // Remove undefined fields
    Object.keys(fieldsToUpdate).forEach(key =>
        fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
    );

    const user = await User.findByIdAndUpdate(
        req.user.id,
        fieldsToUpdate,
        {
            new: true,
            runValidators: true
        }
    );

    res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: { user }
    });
});

// @desc    Change password
// @route   PUT /api/v1/auth/change-password
// @access  Private
exports.changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({
            success: false,
            message: 'Please provide current and new password'
        });
    }

    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
        return res.status(401).json({
            success: false,
            message: 'Current password is incorrect'
        });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Generate new token
    const token = generateToken(user._id);

    res.status(200).json({
        success: true,
        message: 'Password changed successfully',
        data: { token }
    });
});

// @desc    Refresh access token
// @route   POST /api/v1/auth/refresh
// @access  Public
exports.refreshToken = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({
            success: false,
            message: 'Refresh token required'
        });
    }

    try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const user = await User.findById(decoded.id);

        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Invalid refresh token'
            });
        }

        const newToken = generateToken(user._id);
        const newRefreshToken = generateRefreshToken(user._id);

        res.status(200).json({
            success: true,
            data: {
                token: newToken,
                refreshToken: newRefreshToken
            }
        });
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired refresh token'
        });
    }
});

// @desc    Logout user
// @route   POST /api/v1/auth/logout
// @access  Private
exports.logout = asyncHandler(async (req, res) => {
    // In a real app, you'd want to blacklist the token
    res.status(200).json({
        success: true,
        message: 'Logged out successfully'
    });
});

// @desc    Get user QR code
// @route   GET /api/v1/auth/qrcode
// @access  Private
exports.getQRCode = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);

    if (!user.qrCode || !user.qrCode.url) {
        // Regenerate QR code if missing
        const qrData = JSON.stringify({
            userId: user._id,
            membershipId: user.membershipId,
            name: user.fullName
        });

        const qrCodeUrl = await QRCode.toDataURL(qrData);
        user.qrCode = {
            url: qrCodeUrl,
            data: qrData
        };
        await user.save();
    }

    res.status(200).json({
        success: true,
        data: {
            qrCode: user.qrCode.url,
            membershipId: user.membershipId
        }
    });
});