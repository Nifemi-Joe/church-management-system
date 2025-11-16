const mongoose = require('mongoose');
const { FOLLOWUP_STATUS, FOLLOWUP_PRIORITY } = require('../config/constants');

const followUpSchema = new mongoose.Schema({
    // Member Information
    member: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // Follow-up Details
    reason: {
        type: String,
        required: true,
        enum: [
            'consecutive_absences',
            'low_engagement',
            'first_time_visitor',
            'returning_member',
            'special_needs',
            'birthday',
            'anniversary',
            'prayer_request',
            'custom'
        ]
    },
    customReason: String,

    // Absence tracking (if applicable)
    missedServices: [{
        service: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Service'
        },
        date: Date
    }],
    consecutiveAbsences: {
        type: Number,
        default: 0
    },

    // Assignment
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department'
    },

    // Priority and Status
    priority: {
        type: String,
        enum: Object.values(FOLLOWUP_PRIORITY),
        default: FOLLOWUP_PRIORITY.MEDIUM
    },
    status: {
        type: String,
        enum: Object.values(FOLLOWUP_STATUS),
        default: FOLLOWUP_STATUS.PENDING
    },

    // Scheduling
    dueDate: {
        type: Date,
        required: true
    },
    completedDate: Date,

    // Contact Attempts
    contactAttempts: [{
        date: {
            type: Date,
            default: Date.now
        },
        method: {
            type: String,
            enum: ['call', 'sms', 'email', 'visit', 'whatsapp', 'other']
        },
        outcome: {
            type: String,
            enum: ['successful', 'no_response', 'callback_requested', 'declined']
        },
        notes: String,
        contactedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }],

    // Outcome
    outcome: {
        type: String,
        enum: [
            'resolved',
            'member_returned',
            'needs_pastoral_care',
            'relocated',
            'no_longer_interested',
            'requires_escalation',
            'pending'
        ]
    },
    outcomeNotes: {
        type: String,
        maxlength: [1000, 'Outcome notes cannot exceed 1000 characters']
    },

    // Actions Taken
    actionsTaken: [{
        action: String,
        date: {
            type: Date,
            default: Date.now
        },
        performedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }],

    // Escalation
    isEscalated: {
        type: Boolean,
        default: false
    },
    escalatedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    escalationReason: String,
    escalationDate: Date,

    // Notifications
    notificationsSent: [{
        type: {
            type: String,
            enum: ['email', 'sms', 'push', 'whatsapp']
        },
        sentAt: Date,
        recipient: String
    }],

    // Additional Information
    tags: [String],
    notes: {
        type: String,
        maxlength: [2000, 'Notes cannot exceed 2000 characters']
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
followUpSchema.index({ member: 1, status: 1 });
followUpSchema.index({ assignedTo: 1, status: 1 });
followUpSchema.index({ dueDate: 1, status: 1 });
followUpSchema.index({ priority: 1, status: 1 });
followUpSchema.index({ reason: 1 });

// Virtual for days overdue
followUpSchema.virtual('daysOverdue').get(function() {
    if (this.status === FOLLOWUP_STATUS.COMPLETED || !this.dueDate) {
        return 0;
    }
    const today = new Date();
    const due = new Date(this.dueDate);
    const diffTime = today - due;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
});

// Virtual for total contact attempts
followUpSchema.virtual('totalContactAttempts').get(function() {
    return this.contactAttempts ? this.contactAttempts.length : 0;
});

// Method to add contact attempt
followUpSchema.methods.addContactAttempt = async function(data) {
    this.contactAttempts.push({
        ...data,
        date: new Date()
    });

    // Auto-complete if successful
    if (data.outcome === 'successful' && this.status === FOLLOWUP_STATUS.PENDING) {
        this.status = FOLLOWUP_STATUS.IN_PROGRESS;
    }

    await this.save();
    return this;
};

// Method to mark as completed
followUpSchema.methods.complete = async function(outcome, notes) {
    this.status = FOLLOWUP_STATUS.COMPLETED;
    this.completedDate = new Date();
    this.outcome = outcome;
    if (notes) {
        this.outcomeNotes = notes;
    }
    await this.save();
    return this;
};

// Static method to create auto follow-up for consecutive absences
followUpSchema.statics.createAutoFollowUp = async function(userId, missedServices) {
    const existingFollowUp = await this.findOne({
        member: userId,
        status: { $in: [FOLLOWUP_STATUS.PENDING, FOLLOWUP_STATUS.IN_PROGRESS] },
        reason: 'consecutive_absences'
    });

    if (existingFollowUp) {
        existingFollowUp.missedServices = missedServices;
        existingFollowUp.consecutiveAbsences = missedServices.length;
        await existingFollowUp.save();
        return existingFollowUp;
    }

    // Find follow-up coordinator (can be improved with better assignment logic)
    const User = mongoose.model('User');
    const coordinator = await User.findOne({ role: 'admin', isActive: true });

    const followUp = await this.create({
        member: userId,
        reason: 'consecutive_absences',
        missedServices: missedServices,
        consecutiveAbsences: missedServices.length,
        assignedTo: coordinator._id,
        priority: missedServices.length >= 3 ? FOLLOWUP_PRIORITY.HIGH : FOLLOWUP_PRIORITY.MEDIUM,
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        createdBy: coordinator._id
    });

    return followUp;
};

const FollowUp = mongoose.model('FollowUp', followUpSchema);

module.exports = FollowUp;