import { Request, Response, NextFunction } from 'express';
import { AuthService } from '@services/AuthService';
import { successResponse } from '@utils/responseHandler';
import logger from '@config/logger';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.authService.register(req.body);
      
      logger.info(`New user registered: ${result.user.email}`);
      
      successResponse(res, result, 'Registration successful', 201);
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = req.body;
      const result = await this.authService.login(email, password);
      
      logger.info(`User logged in: ${email}`);
      
      successResponse(res, result, 'Login successful');
    } catch (error) {
      next(error);
    }
  };

  refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = req.body;
      const result = await this.authService.refreshToken(refreshToken);
      
      successResponse(res, result, 'Token refreshed successfully');
    } catch (error) {
      next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // In a production app, you might want to blacklist the token
      successResponse(res, null, 'Logout successful');
    } catch (error) {
      next(error);
    }
  };
}
