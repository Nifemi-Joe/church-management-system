import { FamilyRepository } from '@repositories/FamilyRepository';
import { MemberRepository } from '@repositories/MemberRepository';
import { AppError } from '@utils/AppError';
import type { CreateFamilyDTO, UpdateFamilyDTO, FamilyFilters } from '@/types/family.types';
import logger from '@config/logger';

export class FamilyService {
    private familyRepository: FamilyRepository;
    private memberRepository: MemberRepository;

    constructor() {
        this.familyRepository = new FamilyRepository();
        this.memberRepository = new MemberRepository();
    }

    async createFamily(data: CreateFamilyDTO) {
        try {
            // Validate father exists if provided
            if (data.fatherId) {
                const father = await this.memberRepository.findById(data.fatherId, data.churchId);
                if (!father) {
                    throw new AppError('Father not found', 404);
                }
                if (father.gender !== 'male') {
                    throw new AppError('Father must be male', 400);
                }
            }

            // Validate mother exists if provided
            if (data.motherId) {
                const mother = await this.memberRepository.findById(data.motherId, data.churchId);
                if (!mother) {
                    throw new AppError('Mother not found', 404);
                }
                if (mother.gender !== 'female') {
                    throw new AppError('Mother must be female', 400);
                }
            }

            // Validate wards exist if provided
            if (data.wardIds && data.wardIds.length > 0) {
                for (const wardId of data.wardIds) {
                    const ward = await this.memberRepository.findById(wardId, data.churchId);
                    if (!ward) {
                        throw new AppError(`Ward with ID ${wardId} not found`, 404);
                    }
                }
            }

            const family = await this.familyRepository.create(data);

            logger.info(`Family service: Created family ${family.id}`);

            return family;
        } catch (error) {
            logger.error('Error in createFamily service:', error);
            throw error;
        }
    }

    async getAllFamilies(filters: FamilyFilters) {
        try {
            return await this.familyRepository.findAll(filters);
        } catch (error) {
            logger.error('Error in getAllFamilies service:', error);
            throw error;
        }
    }

    async getFamilyById(id: string, churchId: string) {
        try {
            const family = await this.familyRepository.findById(id, churchId);
            if (!family) {
                throw new AppError('Family not found', 404);
            }
            return family;
        } catch (error) {
            logger.error('Error in getFamilyById service:', error);
            throw error;
        }
    }

    async updateFamily(id: string, churchId: string, data: UpdateFamilyDTO) {
        try {
            const existingFamily = await this.familyRepository.findById(id, churchId);
            if (!existingFamily) {
                throw new AppError('Family not found', 404);
            }

            // Validate updates similar to create
            if (data.fatherId) {
                const father = await this.memberRepository.findById(data.fatherId, churchId);
                if (!father || father.gender !== 'male') {
                    throw new AppError('Invalid father', 400);
                }
            }

            if (data.motherId) {
                const mother = await this.memberRepository.findById(data.motherId, churchId);
                if (!mother || mother.gender !== 'female') {
                    throw new AppError('Invalid mother', 400);
                }
            }

            const updated = await this.familyRepository.update(id, churchId, data);

            logger.info(`Family service: Updated family ${id}`);

            return updated;
        } catch (error) {
            logger.error('Error in updateFamily service:', error);
            throw error;
        }
    }

    async deleteFamily(id: string, churchId: string) {
        try {
            const family = await this.familyRepository.findById(id, churchId);
            if (!family) {
                throw new AppError('Family not found', 404);
            }

            await this.familyRepository.delete(id, churchId);

            logger.info(`Family service: Deleted family ${id}`);
        } catch (error) {
            logger.error('Error in deleteFamily service:', error);
            throw error;
        }
    }
}
