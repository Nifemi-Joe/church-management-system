import { Router } from 'express';
import { SMSController } from '@controllers/SMSController';

const router = Router();
const smsController = new SMSController();

router.post('/', smsController.sendSMS);
router.get('/', smsController.getSMSHistory);
router.get('/balance', smsController.getBalance);
router.get('/:id', smsController.getSMSById);

export default router;