import { Request, Response, NextFunction } from 'express';
import { FamilyService } from '@services/FamilyService';
import { successResponse } from '@utils/responseHandler';
import { validateRequest } from '@middleware/validateRequest';
import { createFamilySchema, updateFamilySchema } from '@/validators/family.validator';
import logger from '@config/logger';

export class FamilyController {
    private familyService: FamilyService;

    constructor() {
        this.familyService = new FamilyService();
    }

    createFamily = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            await validateRequest(createFamilySchema, req.body);

            const churchId = req.user?.churchId;
            const family = await this.familyService.createFamily({ ...req.body, churchId });

            logger.info(`Family Controller: Created family ${family.id}`);

            successResponse(res, family, 'Family created successfully', 201);
        } catch (error) {
            next(error);
        }
    };

    getAllFamilies = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const churchId = req.user?.churchId;
            const filters = {
                churchId,
                search: req.query.search as string,
                page: parseInt(req.query.page as string) || 1,
                limit: parseInt(req.query.limit as string) || 10
            };

            const result = await this.familyService.getAllFamilies(filters);

            successResponse(res, result, 'Families retrieved successfully');
        } catch (error) {
            next(error);
        }
    };

    getFamilyById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            const churchId = req.user?.churchId;

            const family = await this.familyService.getFamilyById(id, churchId);

            successResponse(res, family, 'Family retrieved successfully');
        } catch (error) {
            next(error);
        }
    };

    updateFamily = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            await validateRequest(updateFamilySchema, req.body);

            const { id } = req.params;
            const churchId = req.user?.churchId;

            const family = await this.familyService.updateFamily(id, churchId, req.body);

            logger.info(`Family Controller: Updated family ${id}`);

            successResponse(res, family, 'Family updated successfully');
        } catch (error) {
            next(error);
        }
    };

    deleteFamily = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            const churchId = req.user?.churchId;

            await this.familyService.deleteFamily(id, churchId);

            logger.info(`Family Controller: Deleted family ${id}`);

            successResponse(res, null, 'Family deleted successfully');
        } catch (error) {
            next(error);
        }
    };
}