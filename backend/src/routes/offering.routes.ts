import { Router } from 'express';
import { OfferingController } from '@controllers/OfferingController';

const router = Router();
const offeringController = new OfferingController();

router.post('/', offeringController.recordOffering);
router.get('/', offeringController.getOfferings);
router.get('/statistics', offeringController.getStatistics);
router.get('/:id', offeringController.getOfferingById);
router.delete('/:id', offeringController.deleteOffering);

export default router;