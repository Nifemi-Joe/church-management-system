import { Request, Response, NextFunction } from 'express';
import { SMSService } from '@services/SMSService';
import { successResponse } from '@utils/responseHandler';
import { validateRequest } from '@middleware/validateRequest';
import { sendSMSSchema } from '@/validators/sms.validator';
import logger from '@config/logger';

export class SMSController {
    private smsService: SMSService;

    constructor() {
        this.smsService = new SMSService();
    }

    sendSMS = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            await validateRequest(sendSMSSchema, req.body);

            const churchId = req.user.churchId;
            const userId = req.user.id;

            const result = await this.smsService.sendSMS(
                { ...req.body, churchId },
                userId
            );

            logger.info(`SMS Controller: User ${userId} sent SMS to ${result.recipientCount} recipients`);

            successResponse(res, result, 'SMS queued successfully', 201);
        } catch (error) {
            next(error);
        }
    };

    getSMSHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user.churchId;
            const filters = {
                churchId,
                status: req.query.status as string,
                startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
                endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
                page: parseInt(req.query.page as string) || 1,
                limit: parseInt(req.query.limit as string) || 10
            };

            const result = await this.smsService.getSMSHistory(filters);

            successResponse(res, result, 'SMS history retrieved successfully');
        } catch (error) {
            next(error);
        }
    };

    getSMSById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            const churchId = req.user.churchId;

            const sms = await this.smsService.getSMSById(id, churchId);

            successResponse(res, sms, 'SMS retrieved successfully');
        } catch (error) {
            next(error);
        }
    };

    getBalance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user.churchId;
            const balance = await this.smsService.getBalance(churchId);

            successResponse(res, { balance }, 'Balance retrieved successfully');
        } catch (error) {
            next(error);
        }
    };
}
