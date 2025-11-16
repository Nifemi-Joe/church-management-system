const express = require('express');
const router = express.Router();
const {
	quickCheckIn,
	completeRegistration,
	checkExistence
} = require('../controllers/visitorCheckInController');

// Public check-in endpoints (no authentication required)
router.post('/quick-checkin', quickCheckIn);
router.post('/check-existence', checkExistence);
router.post('/complete-registration', completeRegistration);

// Get today's services (public)
router.get('/services/today', async (req, res) => {
	const Service = require('../models/Service');
	const today = new Date().getDay();

	const services = await Service.find({
		isActive: true,
		'recurrence.daysOfWeek': today
	}).select('name type startTime endTime venue description');

	res.json({
		success: true,
		count: services.length,
		data: { services }
	});
});

// Generate QR code link for service
router.get('/service/:id/qr-link', async (req, res) => {
	const Service = require('../models/Service');
	const service = await Service.findById(req.params.id);

	if (!service) {
		return res.status(404).json({
			success: false,
			message: 'Service not found'
		});
	}

	const checkInUrl = `${process.env.CLIENT_URL}/check-in?serviceId=${service._id}`;

	res.json({
		success: true,
		data: {
			checkInUrl,
			serviceName: service.name,
			serviceTime: service.startTime
		}
	});
});

module.exports = router;