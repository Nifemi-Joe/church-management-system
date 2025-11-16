const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
    // Basic Information
    name: {
        type: String,
        required: [true, 'Department name is required'],
        unique: true,
        trim: true,
        maxlength: [100, 'Department name cannot exceed 100 characters']
    },
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
        maxlength: [10, 'Department code cannot exceed 10 characters']
    },
    description: {
        type: String,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },

    // Hierarchy
    parentDepartment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department'
    },
    level: {
        type: Number,
        default: 1,
        min: 1
    },

    // Leadership
    head: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    assistantHeads: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],

    // Members
    members: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        role: {
            type: String,
            default: 'member'
        },
        joinedDate: {
            type: Date,
            default: Date.now
        }
    }],

    // Settings
    requiresAttendance: {
        type: Boolean,
        default: false
    },
    meetingSchedule: {
        frequency: {
            type: String,
            enum: ['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'CUSTOM']
        },
        daysOfWeek: [Number],
        time: String,
        venue: String
    },

    // Contact Information
    email: {
        type: String,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
    },
    phoneNumber: String,

    // Statistics
    stats: {
        totalMembers: { type: Number, default: 0 },
        activeMembers: { type: Number, default: 0 },
        averageAttendance: { type: Number, default: 0 }
    },

    // Status
    isActive: {
        type: Boolean,
        default: true
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
departmentSchema.index({ name: 'text', code: 'text' });
departmentSchema.index({ head: 1 });
departmentSchema.index({ isActive: 1 });

// Virtual for member count
departmentSchema.virtual('memberCount').get(function() {
    return this.members ? this.members.length : 0;
});

// Pre-save middleware to update stats
departmentSchema.pre('save', function(next) {
    if (this.members) {
        this.stats.totalMembers = this.members.length;
        this.stats.activeMembers = this.members.filter(m => m.isActive !== false).length;
    }
    next();
});

// Method to add member
departmentSchema.methods.addMember = async function(userId, role = 'member') {
    const exists = this.members.some(m => m.user.toString() === userId.toString());
    if (!exists) {
        this.members.push({
            user: userId,
            role: role,
            joinedDate: new Date()
        });
        await this.save();
    }
    return this;
};

// Method to remove member
departmentSchema.methods.removeMember = async function(userId) {
    this.members = this.members.filter(m => m.user.toString() !== userId.toString());
    await this.save();
    return this;
};

const Department = mongoose.model('Department', departmentSchema);

module.exports = Department;