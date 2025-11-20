import { MemberRepository } from '@repositories/MemberRepository';
import { AppError } from '@utils/AppError';
import type { CreateMemberDTO, UpdateMemberDTO, MemberFilters } from '@/types/member.types';
import logger from '@config/logger';

export class MemberService {
  private memberRepository: MemberRepository;

  constructor() {
    this.memberRepository = new MemberRepository();
  }

  async createMember(data: CreateMemberDTO) {
    try {
      // Validate email uniqueness
      if (data.email) {
        const existingMember = await this.memberRepository.findByEmail(data.email, data.churchId);
        if (existingMember) {
          throw new AppError('Email already exists', 409);
        }
      }

      // Validate phone uniqueness
      if (data.phone) {
        const existingMember = await this.memberRepository.findByPhone(data.phone, data.churchId);
        if (existingMember) {
          throw new AppError('Phone number already exists', 409);
        }
      }

      const member = await this.memberRepository.create(data);
      
      logger.info(`Member service: Created member ${member.id}`);
      
      return member;
    } catch (error) {
      logger.error('Error in createMember service:', error);
      throw error;
    }
  }

  async getAllMembers(filters: MemberFilters) {
    try {
      const result = await this.memberRepository.findAll(filters);
      return result;
    } catch (error) {
      logger.error('Error in getAllMembers service:', error);
      throw error;
    }
  }

  async getMemberById(id: string, churchId: string) {
    try {
      const member = await this.memberRepository.findById(id, churchId);
      
      if (!member) {
        throw new AppError('Member not found', 404);
      }

      return member;
    } catch (error) {
      logger.error('Error in getMemberById service:', error);
      throw error;
    }
  }

  async updateMember(id: string, churchId: string, data: UpdateMemberDTO) {
    try {
      // Check if member exists
      const existingMember = await this.memberRepository.findById(id, churchId);
      if (!existingMember) {
        throw new AppError('Member not found', 404);
      }

      // Validate email uniqueness if email is being updated
      if (data.email && data.email !== existingMember.email) {
        const emailExists = await this.memberRepository.findByEmail(data.email, churchId);
        if (emailExists) {
          throw new AppError('Email already exists', 409);
        }
      }

      // Validate phone uniqueness if phone is being updated
      if (data.phone && data.phone !== existingMember.phone) {
        const phoneExists = await this.memberRepository.findByPhone(data.phone, churchId);
        if (phoneExists) {
          throw new AppError('Phone number already exists', 409);
        }
      }

      const updatedMember = await this.memberRepository.update(id, churchId, data);
      
      logger.info(`Member service: Updated member ${id}`);
      
      return updatedMember;
    } catch (error) {
      logger.error('Error in updateMember service:', error);
      throw error;
    }
  }

  async deleteMember(id: string, churchId: string) {
    try {
      const member = await this.memberRepository.findById(id, churchId);
      
      if (!member) {
        throw new AppError('Member not found', 404);
      }

      await this.memberRepository.delete(id, churchId);
      
      logger.info(`Member service: Deleted member ${id}`);
    } catch (error) {
      logger.error('Error in deleteMember service:', error);
      throw error;
    }
  }

  async getMemberStatistics(churchId: string) {
    try {
      const statistics = await this.memberRepository.getStatistics(churchId);
      return statistics;
    } catch (error) {
      logger.error('Error in getMemberStatistics service:', error);
      throw error;
    }
  }
}
