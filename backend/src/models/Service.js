const mongoose = require('mongoose');
const { RRule } = require('rrule');
const { SERVICE_TYPES, DAYS_OF_WEEK } = require('../config/constants');

const serviceSchema = new mongoose.Schema({
    // Basic Information
    name: {
        type: String,
        required: [true, 'Service name is required'],
        trim: true,
        maxlength: [100, 'Service name cannot exceed 100 characters']
    },
    type: {
        type: String,
        enum: Object.values(SERVICE_TYPES),
        required: true
    },
    description: {
        type: String,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },

    // Scheduling - Recurring Pattern
    recurrence: {
        isRecurring: {
            type: Boolean,
            default: true
        },
        frequency: {
            type: String,
            enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'],
            default: 'WEEKLY'
        },
        interval: {
            type: Number,
            default: 1,
            min: 1
        },
        daysOfWeek: [{
            type: Number,
            enum: Object.values(DAYS_OF_WEEK),
            validate: {
                validator: function(v) {
                    return v >= 0 && v <= 6;
                },
                message: 'Day must be between 0 (Sunday) and 6 (Saturday)'
            }
        }],
        // For monthly recurrence
        dayOfMonth: {
            type: Number,
            min: 1,
            max: 31
        },
        // Advanced: nth weekday of month (e.g., "first Sunday")
        weekOfMonth: {
            type: Number,
            min: 1,
            max: 5
        },
        // End conditions
        endDate: Date,
        occurrences: Number,
        // RRule string for complex patterns
        rruleString: String
    },

    // Time Settings
    startTime: {
        type: String,
        required: [true, 'Start time is required'],
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:mm format']
    },
    endTime: {
        type: String,
        required: [true, 'End time is required'],
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:mm format']
    },
    lateThresholdMinutes: {
        type: Number,
        default: 15,
        min: 0
    },

    // Location
    venue: {
        type: String,
        default: 'Main Auditorium'
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number],
            default: [3.5852, 6.4698] // Lekki coordinates
        }
    },
    geofenceRadius: {
        type: Number,
        default: 500, // meters
        min: 0
    },

    // Check-in Settings
    checkInSettings: {
        enableQRCode: { type: Boolean, default: true },
        enableManual: { type: Boolean, default: true },
        enableNFC: { type: Boolean, default: false },
        enableGPS: { type: Boolean, default: true },
        enableFacialRecognition: { type: Boolean, default: false },
        autoCheckInEnabled: { type: Boolean, default: false },
        checkInWindowBefore: { type: Number, default: 30 }, // minutes
        checkInWindowAfter: { type: Number, default: 120 } // minutes
    },

    // Attendance Requirements
    requiredFor: {
        allMembers: { type: Boolean, default: false },
        workers: { type: Boolean, default: false },
        ministers: { type: Boolean, default: false },
        departments: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Department'
        }],
        roles: [String]
    },

    // Service Details
    expectedAttendance: {
        type: Number,
        min: 0
    },
    minister: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    assistants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],

    // Notifications
    notifications: {
        enabled: { type: Boolean, default: true },
        reminderBefore: { type: Number, default: 24 }, // hours
        channels: {
            email: { type: Boolean, default: true },
            sms: { type: Boolean, default: false },
            push: { type: Boolean, default: true }
        }
    },

    // Status
    isActive: {
        type: Boolean,
        default: true
    },
    isCancelled: {
        type: Boolean,
        default: false
    },
    cancellationReason: String,

    // Statistics
    stats: {
        totalOccurrences: { type: Number, default: 0 },
        averageAttendance: { type: Number, default: 0 },
        highestAttendance: { type: Number, default: 0 },
        lowestAttendance: { type: Number, default: 0 },
        lastOccurrence: Date
    },

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
serviceSchema.index({ type: 1, isActive: 1 });
serviceSchema.index({ 'recurrence.daysOfWeek': 1 });
serviceSchema.index({ location: '2dsphere' });

// Method to generate dates for the next N occurrences
serviceSchema.methods.generateOccurrences = function(count = 10) {
    if (!this.recurrence.isRecurring) {
        return [];
    }

    const rule = new RRule({
        freq: RRule[this.recurrence.frequency],
        interval: this.recurrence.interval,
        byweekday: this.recurrence.daysOfWeek?.map(d => {
            const days = [RRule.SU, RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR, RRule.SA];
            return days[d];
        }),
        dtstart: new Date(),
        until: this.recurrence.endDate,
        count: this.recurrence.occurrences || count
    });

    return rule.all().slice(0, count);
};

// Method to get next occurrence
serviceSchema.methods.getNextOccurrence = function() {
    const occurrences = this.generateOccurrences(1);
    return occurrences.length > 0 ? occurrences[0] : null;
};

// Method to check if service is happening on a specific date
serviceSchema.methods.isScheduledFor = function(date) {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    if (!this.recurrence.isRecurring) {
        return false;
    }

    const dayOfWeek = targetDate.getDay();
    return this.recurrence.daysOfWeek.includes(dayOfWeek);
};

// Virtual for duration in minutes
serviceSchema.virtual('durationMinutes').get(function() {
    const [startHour, startMin] = this.startTime.split(':').map(Number);
    const [endHour, endMin] = this.endTime.split(':').map(Number);
    return (endHour * 60 + endMin) - (startHour * 60 + startMin);
});

const Service = mongoose.model('Service', serviceSchema);

module.exports = Service;