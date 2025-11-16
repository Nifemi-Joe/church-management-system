// ============================================
// routes/departments.js
// ============================================
const express2 = require('express');
const router2 = express2.Router();
const { protect: protect2, authorize: authorize2 } = require('../middleware/auth');

router2.use(protect2);

router2.get('/', async (req, res) => {
    const Department = require('../models/Department');
    const departments = await Department.find({ isActive: true })
        .populate('head', 'firstName lastName')
        .populate('assistantHeads', 'firstName lastName');

    res.json({ success: true, count: departments.length, data: { departments } });
});

router2.post('/', authorize2('admin', 'super_admin'), async (req, res) => {
    const Department = require('../models/Department');
    const department = await Department.create({
        ...req.body,
        createdBy: req.user.id
    });

    res.status(201).json({ success: true, data: { department } });
});

router2.get('/:id', async (req, res) => {
    const Department = require('../models/Department');
    const department = await Department.findById(req.params.id)
        .populate('head', 'firstName lastName email phoneNumber')
        .populate('members.user', 'firstName lastName email phoneNumber');

    if (!department) {
        return res.status(404).json({ success: false, message: 'Department not found' });
    }

    res.json({ success: true, data: { department } });
});

module.exports = router2;