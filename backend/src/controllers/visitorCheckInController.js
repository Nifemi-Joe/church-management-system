const User = require('../models/User');
const Attendance = require('../models/Attendance');
const VisitorRecord = require('../models/VisitorRecord');
const Service = require('../models/Service');
const { asyncHandler } = require('../middleware/errorHandler');
const { sendWelcomeEmail, sendRegistrationInvite } = require('../services/emailService');
const QRCode = require('qrcode');
const crypto = require('crypto');

// @desc    Quick check-in (No authentication required)
// @route   POST /api/v1/public/quick-checkin
// @access  Public
exports.quickCheckIn = asyncHandler(async (req, res) => {
    const {
        firstName,
        lastName,
        phoneNumber,
        email,
        serviceId,
        qrToken,
        location,
        deviceInfo
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !phoneNumber) {
        return res.status(400).json({
            success: false,
            message: 'First name, last name, and phone number are required'
        });
    }

    // Find the service
    const service = await Service.findById(serviceId);
    if (!service || !service.isActive) {
        return res.status(404).json({
            success: false,
            message: 'Service not found or inactive'
        });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // STEP 1: Check if user exists (by phone or email)
    let existingUser = null;
    const searchQuery = { $or: [{ phoneNumber }] };
    if (email) searchQuery.$or.push({ email });

    existingUser = await User.findOne(searchQuery);

    if (existingUser) {
        // USER EXISTS - Check if already checked in today
        const existingAttendance = await Attendance.findOne({
            user: existingUser._id,
            service: serviceId,
            date: {
                $gte: today,
                $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
            },
            isDeleted: false
        });

        if (existingAttendance) {
            return res.status(200).json({
                success: true,
                message: 'You have already checked in for this service today!',
                data: {
                    attendance: existingAttendance,
                    userExists: true,
                    alreadyCheckedIn: true
                }
            });
        }

        // Create attendance for existing user
        const attendance = await Attendance.create({
            user: existingUser._id,
            service: serviceId,
            date: today,
            checkInTime: new Date(),
            status: 'present',
            method: qrToken ? 'qr_code' : 'manual',
            location: location || service.location,
            deviceInfo,
            isManualEntry: false,
            createdBy: existingUser._id
        });

        // Update user attendance statistics
        existingUser.attendanceStats.totalServices += 1;
        existingUser.attendanceStats.totalPresent += 1;
        existingUser.attendanceStats.consecutiveAbsences = 0;
        existingUser.attendanceStats.lastAttendance = new Date();
        existingUser.attendanceStats.attendanceRate = Math.round(
            (existingUser.attendanceStats.totalPresent / existingUser.attendanceStats.totalServices) * 100
        );
        existingUser.calculateEngagementScore();
        await existingUser.save();

        return res.status(201).json({
            success: true,
            message: `Welcome back, ${existingUser.firstName}! You've been checked in successfully.`,
            data: {
                attendance,
                userExists: true,
                isRegisteredUser: true,
                user: {
                    id: existingUser._id,
                    name: existingUser.fullName,
                    membershipId: existingUser.membershipId,
                    attendanceRate: existingUser.attendanceStats.attendanceRate
                }
            }
        });
    }

    // STEP 2: User doesn't exist - Check visitor records (by phone)
    let visitorRecord = await VisitorRecord.findOne({ phoneNumber });

    if (visitorRecord) {
        // RETURNING VISITOR (not registered as user yet)
        // Check if already checked in today
        if (visitorRecord.attendances.some(a =>
            a.serviceId.toString() === serviceId &&
            new Date(a.date).toDateString() === today.toDateString()
        )) {
            return res.status(200).json({
                success: true,
                message: 'You have already checked in for this service today!',
                data: {
                    userExists: false,
                    alreadyCheckedIn: true,
                    visitorRecord
                }
            });
        }

        // Add new attendance to visitor record
        visitorRecord.attendances.push({
            serviceId,
            date: today,
            checkInTime: new Date()
        });
        visitorRecord.visitCount += 1;
        visitorRecord.lastVisit = new Date();

        // Update visitor info if provided
        if (email && !visitorRecord.email) {
            visitorRecord.email = email;
        }

        await visitorRecord.save();

        // If email provided and hasn't been invited, send registration invite
        if (email && !visitorRecord.registrationInviteSent) {
            const inviteToken = crypto.randomBytes(32).toString('hex');
            visitorRecord.registrationInviteToken = inviteToken;
            visitorRecord.registrationInviteSent = true;
            await visitorRecord.save();

            // Send registration invite email (async, don't wait)
            sendRegistrationInvite({
                email,
                firstName,
                lastName,
                token: inviteToken,
                visitCount: visitorRecord.visitCount
            }).catch(err => console.error('Email send failed:', err));
        }

        return res.status(201).json({
            success: true,
            message: `Welcome back, ${firstName}! This is your ${visitorRecord.visitCount}${getOrdinalSuffix(visitorRecord.visitCount)} visit.`,
            data: {
                userExists: false,
                isReturningVisitor: true,
                visitCount: visitorRecord.visitCount,
                emailInviteSent: email && visitorRecord.registrationInviteSent,
                visitorRecord: {
                    id: visitorRecord._id,
                    name: `${firstName} ${lastName}`,
                    visitCount: visitorRecord.visitCount
                }
            }
        });
    }

    // STEP 3: First-time visitor - Create new visitor record
    const newVisitorRecord = await VisitorRecord.create({
        firstName,
        lastName,
        phoneNumber,
        email: email || null,
        attendances: [{
            serviceId,
            date: today,
            checkInTime: new Date()
        }],
        visitCount: 1,
        firstVisit: new Date(),
        lastVisit: new Date(),
        source: qrToken ? 'qr_scan' : 'manual',
        deviceInfo
    });

    // Send welcome email if email provided
    if (email) {
        const inviteToken = crypto.randomBytes(32).toString('hex');
        newVisitorRecord.registrationInviteToken = inviteToken;
        newVisitorRecord.registrationInviteSent = true;
        await newVisitorRecord.save();

        // Send welcome + registration invite email
        sendRegistrationInvite({
            email,
            firstName,
            lastName,
            token: inviteToken,
            visitCount: 1,
            isFirstVisit: true
        }).catch(err => console.error('Email send failed:', err));
    }

    return res.status(201).json({
        success: true,
        message: `Welcome to RCCG He Reigns, ${firstName}! You've been checked in successfully.`,
        data: {
            userExists: false,
            isFirstTimeVisitor: true,
            emailInviteSent: !!email,
            visitorRecord: {
                id: newVisitorRecord._id,
                name: `${firstName} ${lastName}`,
                visitCount: 1
            },
            nextSteps: email
                ? 'Check your email to complete your registration and unlock member benefits!'
                : 'Provide your email next time to complete registration and access member features.'
        }
    });
});

// @desc    Complete registration from invite link
// @route   POST /api/v1/public/complete-registration
// @access  Public
exports.completeRegistration = asyncHandler(async (req, res) => {
    const { token, password, additionalInfo } = req.body;

    if (!token || !password) {
        return res.status(400).json({
            success: false,
            message: 'Token and password are required'
        });
    }

    // Find visitor record by token
    const visitorRecord = await VisitorRecord.findOne({
        registrationInviteToken: token
    });

    if (!visitorRecord) {
        return res.status(400).json({
            success: false,
            message: 'Invalid or expired registration token'
        });
    }

    // Check if already converted to user
    if (visitorRecord.convertedToUser) {
        return res.status(400).json({
            success: false,
            message: 'This invitation has already been used. Please login instead.'
        });
    }

    // Create full user account
    const newUser = await User.create({
        firstName: visitorRecord.firstName,
        lastName: visitorRecord.lastName,
        phoneNumber: visitorRecord.phoneNumber,
        email: visitorRecord.email,
        password,
        gender: additionalInfo?.gender || 'male',
        role: 'member',
        isVerified: true,
        dateOfBirth: additionalInfo?.dateOfBirth,
        address: additionalInfo?.address,
        // Transfer attendance stats
        attendanceStats: {
            totalServices: visitorRecord.attendances.length,
            totalPresent: visitorRecord.attendances.length,
            lastAttendance: visitorRecord.lastVisit
        }
    });

    // Generate QR Code for new user
    const qrData = JSON.stringify({
        userId: newUser._id,
        membershipId: newUser.membershipId,
        name: newUser.fullName
    });
    const qrCodeUrl = await QRCode.toDataURL(qrData);
    newUser.qrCode = { url: qrCodeUrl, data: qrData };
    await newUser.save();

    // Convert all visitor attendances to user attendances
    for (const visitorAttendance of visitorRecord.attendances) {
        await Attendance.create({
            user: newUser._id,
            service: visitorAttendance.serviceId,
            date: visitorAttendance.date,
            checkInTime: visitorAttendance.checkInTime,
            status: 'present',
            method: 'manual',
            notes: 'Migrated from visitor record',
            createdBy: newUser._id
        });
    }

    // Mark visitor record as converted
    visitorRecord.convertedToUser = true;
    visitorRecord.userId = newUser._id;
    visitorRecord.conversionDate = new Date();
    await visitorRecord.save();

    // Send welcome email
    sendWelcomeEmail({
        email: newUser.email,
        name: newUser.fullName,
        membershipId: newUser.membershipId,
        qrCode: qrCodeUrl
    }).catch(err => console.error('Email send failed:', err));

    res.status(201).json({
        success: true,
        message: 'Registration completed successfully! Welcome to the family!',
        data: {
            user: {
                id: newUser._id,
                name: newUser.fullName,
                email: newUser.email,
                membershipId: newUser.membershipId,
                qrCode: qrCodeUrl,
                attendanceHistory: visitorRecord.attendances.length
            }
        }
    });
});

// @desc    Check if phone/email exists
// @route   POST /api/v1/public/check-existence
// @access  Public
exports.checkExistence = asyncHandler(async (req, res) => {
    const { phoneNumber, email } = req.body;

    if (!phoneNumber && !email) {
        return res.status(400).json({
            success: false,
            message: 'Phone number or email required'
        });
    }

    const query = { $or: [] };
    if (phoneNumber) query.$or.push({ phoneNumber });
    if (email) query.$or.push({ email });

    // Check registered users
    const user = await User.findOne(query).select('firstName lastName membershipId email phoneNumber role');

    if (user) {
        return res.status(200).json({
            success: true,
            exists: true,
            isRegisteredUser: true,
            data: {
                name: user.fullName,
                membershipId: user.membershipId,
                needsLogin: true
            }
        });
    }

    // Check visitor records
    const visitor = await VisitorRecord.findOne(query).select('firstName lastName visitCount email phoneNumber');

    if (visitor) {
        return res.status(200).json({
            success: true,
            exists: true,
            isRegisteredUser: false,
            isReturningVisitor: true,
            data: {
                name: `${visitor.firstName} ${visitor.lastName}`,
                visitCount: visitor.visitCount,
                hasEmail: !!visitor.email,
                canQuickCheckIn: true
            }
        });
    }

    // New person
    res.status(200).json({
        success: true,
        exists: false,
        isFirstTimeVisitor: true,
        message: 'Welcome! Please provide your details to check in.'
    });
});

// Helper function
function getOrdinalSuffix(num) {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
}

module.exports = exports;