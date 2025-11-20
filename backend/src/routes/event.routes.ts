import { Router } from 'express';
import { EventController } from '@controllers/EventController';

const router = Router();
const eventController = new EventController();

router.post('/', eventController.createEvent);
router.get('/', eventController.getEvents);
router.get('/:id', eventController.getEventById);
router.put('/:id', eventController.updateEvent);
router.delete('/:id', eventController.deleteEvent);

// Service Report sub-routes
router.post('/service-reports', eventController.createServiceReport);
router.get('/service-reports', eventController.getServiceReports);
router.get('/service-reports/:id', eventController.getServiceReportById);

export default router;