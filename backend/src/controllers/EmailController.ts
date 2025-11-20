import { Request, Response, NextFunction } from 'express';
import { EmailService } from '@services/EmailService';
import { successResponse } from '@utils/responseHandler';
import logger from '@config/logger';

export class EmailController {
    private emailService: EmailService;

    constructor() {
        this.emailService = new EmailService();
    }

    sendEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user?.churchId;
            const userId = req.user?.id;

            const result = await this.emailService.sendEmail(
                { ...req.body, churchId },
                userId
            );

            logger.info(`Email Controller: User ${userId} sent email to ${result.recipientCount} recipients`);

            successResponse(res, result, 'Email queued successfully', 201);
        } catch (error) {
            next(error);
        }
    };

    getEmailHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user?.churchId;
            const filters = {
                churchId,
                page: parseInt(req.query.page as string) || 1,
                limit: parseInt(req.query.limit as string) || 10
            };

            const result = await this.emailService.getEmailHistory(filters);

            successResponse(res, result, 'Email history retrieved successfully');
        } catch (error) {
            next(error);
        }
    };
}