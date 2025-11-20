import { Request, Response, NextFunction } from 'express';
import { OfferingService } from '@services/OfferingService';
import { successResponse } from '@utils/responseHandler';
import logger from '@config/logger';

export class OfferingController {
    private offeringService: OfferingService;

    constructor() {
        this.offeringService = new OfferingService();
    }

    recordOffering = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user?.churchId;
            const offering = await this.offeringService.recordOffering({ ...req.body, churchId });

            logger.info(`Offering Controller: Recorded offering ${offering.id}`);

            successResponse(res, offering, 'Offering recorded successfully', 201);
        } catch (error) {
            next(error);
        }
    };

    getOfferings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user?.churchId;
            const filters = {
                startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
                endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
                page: parseInt(req.query.page as string) || 1,
                limit: parseInt(req.query.limit as string) || 10
            };

            const result = await this.offeringService.getOfferings(churchId, filters);

            successResponse(res, result, 'Offerings retrieved successfully');
        } catch (error) {
            next(error);
        }
    };

    getOfferingById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            const churchId = req.user?.churchId;

            const offering = await this.offeringService.getOfferingById(id, churchId);

            successResponse(res, offering, 'Offering retrieved successfully');
        } catch (error) {
            next(error);
        }
    };

    getStatistics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user?.churchId;
            const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
            const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

            const stats = await this.offeringService.getStatistics(churchId, startDate, endDate);

            successResponse(res, stats, 'Statistics retrieved successfully');
        } catch (error) {
            next(error);
        }
    };

    deleteOffering = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            const churchId = req.user?.churchId;

            await this.offeringService.deleteOffering(id, churchId);

            logger.info(`Offering Controller: Deleted offering ${id}`);

            successResponse(res, null, 'Offering deleted successfully');
        } catch (error) {
            next(error);
        }
    };
}
