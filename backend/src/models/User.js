const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES, GENDER, MARITAL_STATUS, LANGUAGES, SUNDAY_SCHOOL_CLASSES } = require('../config/constants');

const userSchema = new mongoose.Schema({
    // Basic Information
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
        maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
        maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    middleName: {
        type: String,
        trim: true,
        maxlength: [50, 'Middle name cannot exceed 50 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
    },
    phoneNumber: {
        type: String,
        required: [true, 'Phone number is required'],
        unique: true,
        match: [/^[0-9+\-\s()]+$/, 'Please provide a valid phone number']
    },

    // Authentication
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters'],
        select: false
    },
    role: {
        type: String,
        enum: Object.values(ROLES),
        default: ROLES.MEMBER
    },

    // Personal Details
    dateOfBirth: {
        day: { type: Number, min: 1, max: 31 },
        month: { type: Number, min: 1, max: 12 }
    },
    gender: {
        type: String,
        enum: Object.values(GENDER),
        required: true
    },
    maritalStatus: {
        type: String,
        enum: Object.values(MARITAL_STATUS)
    },

    // Church Information
    membershipId: {
        type: String,
        unique: true,
        sparse: true
    },
    joinedDate: {
        type: Date,
        default: Date.now
    },
    sundaySchoolClass: {
        type: String,
        enum: Object.values(SUNDAY_SCHOOL_CLASSES)
    },
    naturalGroup: {
        type: String,
        trim: true
    },
    departments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department'
    }],
    isWorker: {
        type: Boolean,
        default: false
    },
    isMinister: {
        type: Boolean,
        default: false
    },

    // Location
    address: {
        street: String,
        city: String,
        state: String,
        country: { type: String, default: 'Nigeria' }
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number],
            default: [0, 0]
        }
    },

    // Preferences
    preferredLanguage: {
        type: String,
        enum: Object.values(LANGUAGES),
        default: LANGUAGES.ENGLISH
    },
    notifications: {
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: true },
        push: { type: Boolean, default: true }
    },

    // Profile
    profilePicture: {
        url: String,
        publicId: String
    },
    bio: {
        type: String,
        maxlength: [500, 'Bio cannot exceed 500 characters']
    },

    // QR Code
    qrCode: {
        url: String,
        data: String
    },

    // Attendance Statistics
    attendanceStats: {
        totalServices: { type: Number, default: 0 },
        totalPresent: { type: Number, default: 0 },
        totalAbsent: { type: Number, default: 0 },
        totalLate: { type: Number, default: 0 },
        attendanceRate: { type: Number, default: 0 },
        consecutiveAbsences: { type: Number, default: 0 },
        lastAttendance: Date,
        engagementScore: { type: Number, default: 0 }
    },

    // Status
    isActive: {
        type: Boolean,
        default: true
    },
    isVerified: {
        type: Boolean,
        default: false
    },

    // Security
    lastLogin: Date,
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,

    // Audit
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ phoneNumber: 1 });
userSchema.index({ membershipId: 1 });
userSchema.index({ role: 1 });
userSchema.index({ location: '2dsphere' });
userSchema.index({ firstName: 'text', lastName: 'text', email: 'text' });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.middleName ? this.middleName + ' ' : ''}${this.lastName}`;
});

// Virtual for age (approximate)
userSchema.virtual('age').get(function() {
    if (!this.dateOfBirth || !this.dateOfBirth.day || !this.dateOfBirth.month) return null;
    const today = new Date();
    const birthDate = new Date(today.getFullYear(), this.dateOfBirth.month - 1, this.dateOfBirth.day);
    let age = today.getFullYear() - birthDate.getFullYear();
    if (today < new Date(today.getFullYear(), this.dateOfBirth.month - 1, this.dateOfBirth.day)) {
        age--;
    }
    return age;
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();

    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    this.passwordChangedAt = Date.now() - 1000;
    next();
});

// Generate membership ID
userSchema.pre('save', async function(next) {
    if (this.isNew && !this.membershipId) {
        const year = new Date().getFullYear().toString().slice(-2);
        const count = await this.constructor.countDocuments();
        this.membershipId = `RCCG-HR-${year}-${String(count + 1).padStart(5, '0')}`;
    }
    next();
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Method to check if password was changed after token was issued
userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
    if (this.passwordChangedAt) {
        const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
        return JWTTimestamp < changedTimestamp;
    }
    return false;
};

// Method to calculate engagement score
userSchema.methods.calculateEngagementScore = function() {
    const rate = this.attendanceStats.attendanceRate || 0;
    const recency = this.attendanceStats.lastAttendance
        ? Math.max(0, 100 - Math.floor((Date.now() - this.attendanceStats.lastAttendance) / (1000 * 60 * 60 * 24)))
        : 0;

    this.attendanceStats.engagementScore = Math.round((rate * 0.7) + (recency * 0.3));
    return this.attendanceStats.engagementScore;
};

const User = mongoose.model('User', userSchema);

module.exports = User;