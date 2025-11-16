// ============================================
// routes/users.js
// ============================================
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', authorize('admin', 'super_admin', 'pastor'), async (req, res) => {
    const User = require('../models/User');
    const { role, isActive, search, page = 1, limit = 20 } = req.query;

    const query = {};
    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) {
        query.$or = [
            { firstName: new RegExp(search, 'i') },
            { lastName: new RegExp(search, 'i') },
            { email: new RegExp(search, 'i') },
            { membershipId: new RegExp(search, 'i') }
        ];
    }

    const users = await User.find(query)
        .populate('departments', 'name code')
        .select('-password')
        .limit(limit * 1)
        .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
        success: true,
        count: users.length,
        total,
        pages: Math.ceil(total / limit),
        data: { users }
    });
});

router.get('/:id', async (req, res) => {
    const User = require('../models/User');
    const user = await User.findById(req.params.id)
        .populate('departments', 'name code')
        .select('-password');

    if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: { user } });
});

router.put('/:id', authorize('admin', 'super_admin'), async (req, res) => {
    const User = require('../models/User');
    const user = await User.findByIdAndUpdate(
        req.params.id,
        { ...req.body, updatedBy: req.user.id },
        { new: true, runValidators: true }
    ).select('-password');

    res.json({ success: true, message: 'User updated', data: { user } });
});

module.exports = router;
