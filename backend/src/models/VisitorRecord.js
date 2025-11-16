const mongoose = require('mongoose');

const visitorRecordSchema = new mongoose.Schema({
    // Basic Information
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true
    },
    phoneNumber: {
        type: String,
        required: [true, 'Phone number is required'],
        unique: true,
        index: true
    },
    email: {
        type: String,
        lowercase: true,
        trim: true,
        sparse: true,
        index: true
    },

    // Visit Tracking
    attendances: [{
        serviceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Service',
            required: true
        },
        date: {
            type: Date,
            required: true
        },
        checkInTime: {
            type: Date,
            required: true
        }
    }],

    visitCount: {
        type: Number,
        default: 1
    },
    firstVisit: {
        type: Date,
        default: Date.now
    },
    lastVisit: {
        type: Date,
        default: Date.now
    },

    // Source tracking
    source: {
        type: String,
        enum: ['qr_scan', 'manual', 'link', 'referral', 'walk_in'],
        default: 'manual'
    },
    referredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // Registration Invite
    registrationInviteToken: String,
    registrationInviteSent: {
        type: Boolean,
        default: false
    },
    registrationInviteSentAt: Date,

    // Conversion Status
    convertedToUser: {
        type: Boolean,
        default: false
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    conversionDate: Date,

    // Contact Attempts
    contactAttempts: [{
        date: Date,
        method: String,
        notes: String
    }],

    // Device Information
    deviceInfo: {
        deviceId: String,
        deviceType: String,
        browser: String,
        os: String
    },

    // Additional Notes
    notes: String,
    tags: [String],

    // Status
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
visitorRecordSchema.index({ phoneNumber: 1 });
visitorRecordSchema.index({ email: 1 });
visitorRecordSchema.index({ convertedToUser: 1, isActive: 1 });
visitorRecordSchema.index({ firstVisit: -1 });
visitorRecordSchema.index({ visitCount: -1 });

// Virtual for full name
visitorRecordSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

// Virtual for days since first visit
visitorRecordSchema.virtual('daysSinceFirstVisit').get(function() {
    if (!this.firstVisit) return 0;
    const diffTime = Date.now() - this.firstVisit.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for visit frequency
visitorRecordSchema.virtual('visitFrequency').get(function() {
    const days = this.daysSinceFirstVisit;
    if (days === 0) return 'First Visit';
    const frequency = this.visitCount / (days / 7); // visits per week
    if (frequency >= 1) return 'Weekly';
    if (frequency >= 0.5) return 'Bi-weekly';
    if (frequency >= 0.25) return 'Monthly';
    return 'Occasional';
});

// Method to check if visitor should be followed up
visitorRecordSchema.methods.needsFollowUp = function() {
    const daysSinceLastVisit = Math.floor((Date.now() - this.lastVisit.getTime()) / (1000 * 60 * 60 * 24));

    // Follow up if:
    // 1. First time visitor (visited once, more than 3 days ago)
    if (this.visitCount === 1 && daysSinceLastVisit > 3) return true;

    // 2. Regular visitor who hasn't come in 14+ days
    if (this.visitCount >= 3 && daysSinceLastVisit > 14) return true;

    // 3. Has email but hasn't registered and visited 2+ times
    if (this.email && !this.convertedToUser && this.visitCount >= 2 && daysSinceLastVisit > 7) return true;

    return false;
};

// Static method to get visitor statistics
visitorRecordSchema.statics.getVisitorStats = async function() {
    const stats = await this.aggregate([
        {
            $facet: {
                total: [{ $count: 'count' }],
                unconverted: [
                    { $match: { convertedToUser: false } },
                    { $count: 'count' }
                ],
                firstTimers: [
                    { $match: { visitCount: 1 } },
                    { $count: 'count' }
                ],
                returning: [
                    { $match: { visitCount: { $gte: 2 } } },
                    { $count: 'count' }
                ],
                withEmail: [
                    { $match: { email: { $exists: true, $ne: null } } },
                    { $count: 'count' }
                ]
            }
        }
    ]);

    return {
        total: stats[0].total[0]?.count || 0,
        unconverted: stats[0].unconverted[0]?.count || 0,
        firstTimers: stats[0].firstTimers[0]?.count || 0,
        returning: stats[0].returning[0]?.count || 0,
        withEmail: stats[0].withEmail[0]?.count || 0
    };
};

const VisitorRecord = mongoose.model('VisitorRecord', visitorRecordSchema);

module.exports = VisitorRecord;