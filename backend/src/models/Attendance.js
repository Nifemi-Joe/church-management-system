const mongoose = require('mongoose');
const { ATTENDANCE_STATUS, CHECKIN_METHODS } = require('../config/constants');

const attendanceSchema = new mongoose.Schema({
    // References
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    service: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service',
        required: true
    },

    // Attendance Details
    date: {
        type: Date,
        required: true,
        index: true
    },
    checkInTime: {
        type: Date,
        required: true
    },
    checkOutTime: Date,

    status: {
        type: String,
        enum: Object.values(ATTENDANCE_STATUS),
        default: ATTENDANCE_STATUS.PRESENT
    },

    // Check-in Method
    method: {
        type: String,
        enum: Object.values(CHECKIN_METHODS),
        default: CHECKIN_METHODS.MANUAL
    },

    // Location Data
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
    distanceFromVenue: {
        type: Number, // in meters
        default: 0
    },
    withinGeofence: {
        type: Boolean,
        default: true
    },

    // Device Information
    deviceInfo: {
        deviceId: String,
        deviceType: String, // mobile, tablet, kiosk, web
        browser: String,
        os: String,
        ipAddress: String
    },

    // Late Information
    isLate: {
        type: Boolean,
        default: false
    },
    minutesLate: {
        type: Number,
        default: 0
    },

    // Verification
    isVerified: {
        type: Boolean,
        default: true
    },
    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    verificationNote: String,

    // Manual Entry
    isManualEntry: {
        type: Boolean,
        default: false
    },
    manualEntryReason: String,
    enteredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // Exception Handling
    isException: {
        type: Boolean,
        default: false
    },
    exceptionType: {
        type: String,
        enum: ['correction', 'late_entry', 'excused_absence', 'technical_issue', 'other']
    },
    exceptionReason: String,
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // Additional Notes
    notes: {
        type: String,
        maxlength: [500, 'Notes cannot exceed 500 characters']
    },

    // Engagement Metrics
    duration: Number, // minutes spent in service
    participation: {
        offering: { type: Boolean, default: false },
        communion: { type: Boolean, default: false },
        altar_call: { type: Boolean, default: false }
    },

    // Flags
    isDuplicate: {
        type: Boolean,
        default: false
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    deletedAt: Date,
    deleteReason: String,

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

// Compound indexes for performance
attendanceSchema.index({ user: 1, date: -1 });
attendanceSchema.index({ service: 1, date: -1 });
attendanceSchema.index({ user: 1, service: 1, date: 1 }, { unique: true }); // Prevent duplicates
attendanceSchema.index({ date: 1, status: 1 });
attendanceSchema.index({ location: '2dsphere' });
attendanceSchema.index({ isDuplicate: 1, isDeleted: 1 });

// Pre-save middleware to detect duplicates
attendanceSchema.pre('save', async function(next) {
    if (this.isNew) {
        const duplicate = await this.constructor.findOne({
            user: this.user,
            service: this.service,
            date: {
                $gte: new Date(this.date).setHours(0, 0, 0, 0),
                $lt: new Date(this.date).setHours(23, 59, 59, 999)
            },
            _id: { $ne: this._id },
            isDeleted: false
        });

        if (duplicate) {
            this.isDuplicate = true;
            // Auto-delete the duplicate
            this.isDeleted = true;
            this.deleteReason = 'Automatic duplicate detection';
        }
    }
    next();
});

// Method to calculate duration
attendanceSchema.methods.calculateDuration = function() {
    if (this.checkOutTime && this.checkInTime) {
        const duration = Math.round((this.checkOutTime - this.checkInTime) / (1000 * 60));
        this.duration = duration;
        return duration;
    }
    return 0;
};

// Static method to get attendance summary
attendanceSchema.statics.getAttendanceSummary = async function(filters = {}) {
    const pipeline = [
        { $match: { isDeleted: false, ...filters } },
        {
            $group: {
                _id: null,
                totalAttendance: { $sum: 1 },
                present: {
                    $sum: { $cond: [{ $eq: ['$status', ATTENDANCE_STATUS.PRESENT] }, 1, 0] }
                },
                late: {
                    $sum: { $cond: [{ $eq: ['$status', ATTENDANCE_STATUS.LATE] }, 1, 0] }
                },
                absent: {
                    $sum: { $cond: [{ $eq: ['$status', ATTENDANCE_STATUS.ABSENT] }, 1, 0] }
                },
                excused: {
                    $sum: { $cond: [{ $eq: ['$status', ATTENDANCE_STATUS.EXCUSED] }, 1, 0] }
                },
                averageDuration: { $avg: '$duration' },
                totalMinutesLate: { $sum: '$minutesLate' }
            }
        }
    ];

    const result = await this.aggregate(pipeline);
    return result[0] || {
        totalAttendance: 0,
        present: 0,
        late: 0,
        absent: 0,
        excused: 0,
        averageDuration: 0,
        totalMinutesLate: 0
    };
};

// Virtual for formatted check-in time
attendanceSchema.virtual('checkInTimeFormatted').get(function() {
    return this.checkInTime ? this.checkInTime.toLocaleTimeString() : '';
});

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;