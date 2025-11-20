import { Request, Response, NextFunction } from 'express';
import { EventService } from '@services/EventService';
import { successResponse } from '@utils/responseHandler';
import logger from '@config/logger';

export class EventController {
    private eventService: EventService;

    constructor() {
        this.eventService = new EventService();
    }

    createEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user?.churchId;
            const event = await this.eventService.createEvent({ ...req.body, churchId });

            logger.info(`Event Controller: Created event ${event.id}`);

            successResponse(res, event, 'Event created successfully', 201);
        } catch (error) {
            next(error);
        }
    };

    createServiceReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user?.churchId;
            const report = await this.eventService.createServiceReport({ ...req.body, churchId });

            logger.info(`Event Controller: Created service report ${report.id}`);

            successResponse(res, report, 'Service report created successfully', 201);
        } catch (error) {
            next(error);
        }
    };

    getEvents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user?.churchId;
            const filters = {
                page: parseInt(req.query.page as string) || 1,
                limit: parseInt(req.query.limit as string) || 10
            };

            const result = await this.eventService.getEvents(churchId, filters);

            successResponse(res, result, 'Events retrieved successfully');
        } catch (error) {
            next(error);
        }
    };

    getServiceReports = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user?.churchId;
            const filters = {
                page: parseInt(req.query.page as string) || 1,
                limit: parseInt(req.query.limit as string) || 10
            };

            const result = await this.eventService.getServiceReports(churchId, filters);

            successResponse(res, result, 'Service reports retrieved successfully');
        } catch (error) {
            next(error);
        }
    };
}
