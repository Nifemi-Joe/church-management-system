import { Router } from 'express';
import { FamilyController } from '@controllers/FamilyController';

const router = Router();
const familyController = new FamilyController();

router.post('/', familyController.createFamily);
router.get('/', familyController.getAllFamilies);
router.get('/:id', familyController.getFamilyById);
router.put('/:id', familyController.updateFamily);
router.delete('/:id', familyController.deleteFamily);

export default router;