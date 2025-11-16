// ============================================
// routes/followups.js
// ============================================
const express3 = require('express');
const router3 = express3.Router();
const { protect: protect3, authorize: authorize3 } = require('../middleware/auth');
const FollowUp = require("../models/FollowUp");

router3.use(protect3);

router3.get('/', async (req, res) => {
    const FollowUp = require('../models/FollowUp');
    const { status, priority, assignedTo, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (assignedTo) query.assignedTo = assignedTo;

    // If not admin, only show assigned follow-ups
    if (!['admin', 'super_admin', 'pastor'].includes(req.user.role)) {
        query.assignedTo = req.user.id;
    }

    const followUps = await FollowUp.find(query)
        .populate('member', 'firstName lastName email phoneNumber')
        .populate('assignedTo', 'firstName lastName')
        .sort({ priority: -1, dueDate: 1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

    const total = await FollowUp.countDocuments(query);

    res.json({
        success: true,
        count: followUps.length,
        total,
        pages: Math.ceil(total / limit),
        data: { followUps }
    });
});

router3.post('/', authorize3('admin', 'super_admin', 'pastor'), async (req, res) => {
    const FollowUp = require('../models/FollowUp');
    const followUp = await FollowUp.create({
        ...req.body,
        createdBy: req.user.id
    });

    res.status(201).json({ success: true, data: { followUp } });
});

router3.put('/:id/complete', async (req, res) => {
    const FollowUp = require('../models/FollowUp');
    const { outcome, notes } = req.body;

    const followUp = await FollowUp.findById(req.params.id);
    if (!followUp) {
        return res.status(404).json({ success: false, message: 'Follow-up not found' });
    }

    await followUp.complete(outcome, notes);

    res.json({ success: true, message: 'Follow-up completed', data: { followUp } });
});

module.exports = router3;