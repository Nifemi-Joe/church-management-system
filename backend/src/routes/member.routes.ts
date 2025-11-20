import { Router } from 'express';
import { MemberController } from '@controllers/MemberController';
import { authenticate } from '@middleware/authenticate';
import { validateRequest } from '@middleware/validateRequest';
import { createMemberSchema, updateMemberSchema } from '@/validators/member.validator';

const router = Router();
const memberController = new MemberController();

router.use(authenticate);

router.post(
  '/',
  validateRequest(createMemberSchema),
  memberController.createMember
);

router.get(
  '/',
  memberController.getAllMembers
);

router.get(
  '/statistics',
  memberController.getMemberStatistics
);

router.get(
  '/:id',
  memberController.getMemberById
);

router.put(
  '/:id',
  validateRequest(updateMemberSchema),
  memberController.updateMember
);

router.delete(
  '/:id',
  memberController.deleteMember
);

router.post(
  '/qr-register',
  memberController.registerViaQR
);

export default router;
