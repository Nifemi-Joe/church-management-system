import { Router } from 'express';
import { AuthController } from '@controllers/AuthController';
import { validateRequest } from '@middleware/validateRequest';
import { strictRateLimiter } from '@middleware/rateLimiter';
import { loginSchema, registerSchema } from '@/validators/auth.validator';

const router = Router();
const authController = new AuthController();

router.post(
  '/register',
  strictRateLimiter,
  validateRequest(registerSchema),
  authController.register
);

router.post(
  '/login',
  strictRateLimiter,
  validateRequest(loginSchema),
  authController.login
);

router.post(
  '/refresh',
  authController.refreshToken
);

router.post(
  '/logout',
  authController.logout
);

export default router;
