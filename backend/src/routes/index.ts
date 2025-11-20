import { Router } from 'express';
import authRoutes from './auth.routes';
import memberRoutes from './member.routes';
import eventRoutes from './event.routes';
import smsRoutes from './sms.routes';
import emailRoutes from './email.routes';
import familyRoutes from './family.routes';
import offeringRoutes from './offering.routes';
import pledgeRoutes from './pledge.routes';
import transactionRoutes from './transaction.routes';
import accountRoutes from './account.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/members', memberRoutes);
router.use('/sms', authMiddleware, smsRoutes);
router.use('/emails', authMiddleware, emailRoutes);
router.use('/families', authMiddleware, familyRoutes);
router.use('/offerings', authMiddleware, offeringRoutes);
router.use('/pledges', authMiddleware, pledgeRoutes);
router.use('/transactions', authMiddleware, transactionRoutes);
router.use('/accounts', authMiddleware, accountRoutes);
router.use('/events', authMiddleware, eventRoutes);

export default router;
