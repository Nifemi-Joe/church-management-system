import { EventRepository } from '@/repositories/EventRepository';
import { ServiceReportRepository } from '@/repositories/ServiceReportRepository';
import { AppError } from '@utils/AppError';
import { CreateEventDTO, CreateServiceReportDTO } from '@/types/event.types';
import logger from '@config/logger';

export class EventService {
    private eventRepository: EventRepository;
    private serviceReportRepository: ServiceReportRepository;

    constructor() {
        this.eventRepository = new EventRepository();
        this.serviceReportRepository = new ServiceReportRepository();
    }

    async createEvent(data: CreateEventDTO) {
        try {
            if (data.isPaid && !data.price) {
                throw new AppError('Price is required for paid events', 400);
            }

            const event = await this.eventRepository.create(data);

            logger.info(`Event service: Created event ${event.id}`);

            return event;
        } catch (error) {
            logger.error('Error in createEvent service:', error);
            throw error;
        }
    }

    async createServiceReport(data: CreateServiceReportDTO) {
        try {
            // Validate attendance data
            if (!data.attendance || data.attendance.length === 0) {
                throw new AppError('Attendance data is required', 400);
            }

            // Calculate totals
            const totalAttendance = data.attendance.reduce((sum, a) => sum + a.count, 0);
            const totalOffering = data.offerings?.reduce((sum, o) => sum + o.amount, 0) || 0;
            const totalExpense = data.expenses?.reduce((sum, e) => sum + e.amount, 0) || 0;

            const report = await this.serviceReportRepository.create({
                ...data,
                totalAttendance,
                totalOffering,
                totalExpense
            });

            logger.info(`Event service: Created service report ${report.id}`);

            return report;
        } catch (error) {
            logger.error('Error in createServiceReport service:', error);
            throw error;
        }
    }

    async getEvents(churchId: string, filters: any) {
        try {
            return await this.eventRepository.findAll({ churchId, ...filters });
        } catch (error) {
            logger.error('Error in getEvents service:', error);
            throw error;
        }
    }

    async getServiceReports(churchId: string, filters: any) {
        try {
            return await this.serviceReportRepository.findAll({ churchId, ...filters });
        } catch (error) {
            logger.error('Error in getServiceReports service:', error);
            throw error;
        }
    }
}