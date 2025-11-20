import { Request, Response, NextFunction } from 'express';
import { MemberService } from '@services/MemberService';
import { AppError } from '@utils/AppError';
import { successResponse } from '@utils/responseHandler';
import logger from '@config/logger';

export class MemberController {
  private memberService: MemberService;

  constructor() {
    this.memberService = new MemberService();
  }

  createMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const churchId = req.user?.churchId;
      if (!churchId) {
        throw new AppError('Church ID not found', 400);
      }

      const memberData = {
        ...req.body,
        churchId,
        createdBy: req.user?.id
      };

      const member = await this.memberService.createMember(memberData);
      
      logger.info(`Member created: ${member.id} by user: ${req.user?.id}`);
      
      successResponse(res, member, 'Member created successfully', 201);
    } catch (error) {
      next(error);
    }
  };

  getAllMembers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const churchId = req.user?.churchId;
      if (!churchId) {
        throw new AppError('Church ID not found', 400);
      }

      const { page = 1, limit = 20, search, status, gender, maritalStatus } = req.query;

      const filters = {
        churchId,
        search: search as string,
        status: status as string,
        gender: gender as string,
        maritalStatus: maritalStatus as string,
        page: Number(page),
        limit: Number(limit)
      };

      const result = await this.memberService.getAllMembers(filters);
      
      successResponse(res, result, 'Members retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  getMemberById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const churchId = req.user?.churchId;

      if (!churchId) {
        throw new AppError('Church ID not found', 400);
      }

      const member = await this.memberService.getMemberById(id, churchId);
      
      if (!member) {
        throw new AppError('Member not found', 404);
      }

      successResponse(res, member, 'Member retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  updateMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const churchId = req.user?.churchId;

      if (!churchId) {
        throw new AppError('Church ID not found', 400);
      }

      const updateData = {
        ...req.body,
        updatedBy: req.user?.id
      };

      const member = await this.memberService.updateMember(id, churchId, updateData);
      
      logger.info(`Member updated: ${id} by user: ${req.user?.id}`);
      
      successResponse(res, member, 'Member updated successfully');
    } catch (error) {
      next(error);
    }
  };

  deleteMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const churchId = req.user?.churchId;

      if (!churchId) {
        throw new AppError('Church ID not found', 400);
      }

      await this.memberService.deleteMember(id, churchId);
      
      logger.info(`Member deleted: ${id} by user: ${req.user?.id}`);
      
      successResponse(res, null, 'Member deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  getMemberStatistics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const churchId = req.user?.churchId;

      if (!churchId) {
        throw new AppError('Church ID not found', 400);
      }

      const statistics = await this.memberService.getMemberStatistics(churchId);
      
      successResponse(res, statistics, 'Statistics retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  registerViaQR = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { churchId, ...memberData } = req.body;

      if (!churchId) {
        throw new AppError('Church ID is required', 400);
      }

      const member = await this.memberService.createMember({
        ...memberData,
        churchId,
        registrationType: 'qr_code'
      });
      
      logger.info(`Member registered via QR: ${member.id}`);
      
      successResponse(res, member, 'Member registered successfully', 201);
    } catch (error) {
      next(error);
    }
  };
}
