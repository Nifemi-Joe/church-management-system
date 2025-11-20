import { OfferingRepository } from '@/repositories/OfferingRepository';
import { AppError } from '@utils/AppError';
import type { CreateOfferingDTO } from '@/types/financial.types';
import logger from '@config/logger';

export class OfferingService {
    private offeringRepository: OfferingRepository;

    constructor() {
        this.offeringRepository = new OfferingRepository();
    }

    async recordOffering(data: CreateOfferingDTO) {
        try {
            // Validate offering items
            if (!data.items || data.items.length === 0) {
                throw new AppError('At least one offering item is required', 400);
            }

            // Calculate total
            const total = data.items.reduce((sum, item) => sum + item.amount, 0);

            const offering = await this.offeringRepository.create({
                ...data,
                total
            });

            logger.info(`Offering service: Recorded offering ${offering.id} for ${data.churchId}`);

            return offering;
        } catch (error) {
            logger.error('Error in recordOffering service:', error);
            throw error;
        }
    }

    async getOfferings(churchId: string, filters: any) {
        try {
            return await this.offeringRepository.findAll({ churchId, ...filters });
        } catch (error) {
            logger.error('Error in getOfferings service:', error);
            throw error;
        }
    }

    async getOfferingById(id: string, churchId: string) {
        try {
            const offering = await this.offeringRepository.findById(id, churchId);
            if (!offering) {
                throw new AppError('Offering not found', 404);
            }
            return offering;
        } catch (error) {
            logger.error('Error in getOfferingById service:', error);
            throw error;
        }
    }

    async getStatistics(churchId: string, startDate?: Date, endDate?: Date) {
        try {
            return await this.offeringRepository.getStatistics(churchId, startDate, endDate);
        } catch (error) {
            logger.error('Error in getStatistics service:', error);
            throw error;
        }
    }

    async deleteOffering(id: string, churchId: string) {
        try {
            const offering = await this.offeringRepository.findById(id, churchId);
            if (!offering) {
                throw new AppError('Offering not found', 404);
            }

            await this.offeringRepository.delete(id, churchId);

            logger.info(`Offering service: Deleted offering ${id}`);
        } catch (error) {
            logger.error('Error in deleteOffering service:', error);
            throw error;
        }
    }
}
