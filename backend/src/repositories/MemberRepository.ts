import { pool } from '@config/database';
import type { CreateMemberDTO, UpdateMemberDTO, MemberFilters, Member } from '@/types/member.types';
import { AppError } from '@utils/AppError';
import logger from '@config/logger';

export class MemberRepository {
  async create(data: CreateMemberDTO): Promise<Member> {
    const client = await pool.connect();
    
    try {
      const query = `
        INSERT INTO members (
          church_id, first_name, last_name, email, phone, 
          gender, marital_status, date_of_birth, address, 
          city, state, country, postal_code, 
          registration_type, status, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *
      `;

      const values = [
        data.churchId,
        data.firstName,
        data.lastName,
        data.email || null,
        data.phone || null,
        data.gender || null,
        data.maritalStatus || null,
        data.dateOfBirth || null,
        data.address || null,
        data.city || null,
        data.state || null,
        data.country || null,
        data.postalCode || null,
        data.registrationType || 'manual',
        data.status || 'active',
        data.createdBy || null
      ];

      const result = await client.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error('Error in MemberRepository.create:', error);
      throw new AppError('Failed to create member', 500);
    } finally {
      client.release();
    }
  }

  async findAll(filters: MemberFilters): Promise<{ members: Member[]; total: number; page: number; totalPages: number }> {
    const client = await pool.connect();
    
    try {
      let query = `
        SELECT * FROM members 
        WHERE church_id = $1 AND deleted_at IS NULL
      `;
      
      const values: any[] = [filters.churchId];
      let paramCount = 1;

      if (filters.search) {
        paramCount++;
        query += ` AND (
          first_name ILIKE $${paramCount} OR 
          last_name ILIKE $${paramCount} OR 
          email ILIKE $${paramCount} OR 
          phone ILIKE $${paramCount}
        )`;
        values.push(`%${filters.search}%`);
      }

      if (filters.status) {
        paramCount++;
        query += ` AND status = $${paramCount}`;
        values.push(filters.status);
      }

      if (filters.gender) {
        paramCount++;
        query += ` AND gender = $${paramCount}`;
        values.push(filters.gender);
      }

      if (filters.maritalStatus) {
        paramCount++;
        query += ` AND marital_status = $${paramCount}`;
        values.push(filters.maritalStatus);
      }

      // Get total count
      const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
      const countResult = await client.query(countQuery, values);
      const total = parseInt(countResult.rows[0].count);

      // Add pagination
      query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      values.push(filters.limit, (filters.page - 1) * filters.limit);

      const result = await client.query(query, values);
      
      return {
        members: result.rows,
        total,
        page: filters.page,
        totalPages: Math.ceil(total / filters.limit)
      };
    } catch (error) {
      logger.error('Error in MemberRepository.findAll:', error);
      throw new AppError('Failed to fetch members', 500);
    } finally {
      client.release();
    }
  }

  async findById(id: string, churchId: string): Promise<Member | null> {
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT * FROM members 
        WHERE id = $1 AND church_id = $2 AND deleted_at IS NULL
      `;
      
      const result = await client.query(query, [id, churchId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error in MemberRepository.findById:', error);
      throw new AppError('Failed to fetch member', 500);
    } finally {
      client.release();
    }
  }

  async findByEmail(email: string, churchId: string): Promise<Member | null> {
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT * FROM members 
        WHERE email = $1 AND church_id = $2 AND deleted_at IS NULL
      `;
      
      const result = await client.query(query, [email, churchId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error in MemberRepository.findByEmail:', error);
      throw new AppError('Failed to fetch member by email', 500);
    } finally {
      client.release();
    }
  }

  async findByPhone(phone: string, churchId: string): Promise<Member | null> {
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT * FROM members 
        WHERE phone = $1 AND church_id = $2 AND deleted_at IS NULL
      `;
      
      const result = await client.query(query, [phone, churchId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error in MemberRepository.findByPhone:', error);
      throw new AppError('Failed to fetch member by phone', 500);
    } finally {
      client.release();
    }
  }

  async update(id: string, churchId: string, data: UpdateMemberDTO): Promise<Member> {
    const client = await pool.connect();
    
    try {
      const fields: string[] = [];
      const values: any[] = [];
      let paramCount = 0;

      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && key !== 'churchId' && key !== 'id') {
          paramCount++;
          fields.push(`${this.camelToSnake(key)} = $${paramCount}`);
          values.push(value);
        }
      });

      if (fields.length === 0) {
        throw new AppError('No fields to update', 400);
      }

      paramCount++;
      values.push(id);
      paramCount++;
      values.push(churchId);

      const query = `
        UPDATE members 
        SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramCount - 1} AND church_id = $${paramCount} AND deleted_at IS NULL
        RETURNING *
      `;

      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        throw new AppError('Member not found', 404);
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error in MemberRepository.update:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async delete(id: string, churchId: string): Promise<void> {
    const client = await pool.connect();
    
    try {
      const query = `
        UPDATE members 
        SET deleted_at = CURRENT_TIMESTAMP 
        WHERE id = $1 AND church_id = $2 AND deleted_at IS NULL
      `;
      
      await client.query(query, [id, churchId]);
    } catch (error) {
      logger.error('Error in MemberRepository.delete:', error);
      throw new AppError('Failed to delete member', 500);
    } finally {
      client.release();
    }
  }

  async getStatistics(churchId: string): Promise<any> {
    const client = await pool.connect();
    
    try {
      const queries = await Promise.all([
        client.query('SELECT COUNT(*) as total FROM members WHERE church_id = $1 AND deleted_at IS NULL', [churchId]),
        client.query('SELECT COUNT(*) as male FROM members WHERE church_id = $1 AND gender = $2 AND deleted_at IS NULL', [churchId, 'male']),
        client.query('SELECT COUNT(*) as female FROM members WHERE church_id = $1 AND gender = $2 AND deleted_at IS NULL', [churchId, 'female']),
        client.query('SELECT COUNT(*) as single FROM members WHERE church_id = $1 AND marital_status = $2 AND deleted_at IS NULL', [churchId, 'single']),
        client.query('SELECT COUNT(*) as married FROM members WHERE church_id = $1 AND marital_status = $2 AND deleted_at IS NULL', [churchId, 'married'])
      ]);

      return {
        total: parseInt(queries[0].rows[0].total),
        byGender: {
          male: parseInt(queries[1].rows[0].male),
          female: parseInt(queries[2].rows[0].female)
        },
        byMaritalStatus: {
          single: parseInt(queries[3].rows[0].single),
          married: parseInt(queries[4].rows[0].married)
        }
      };
    } catch (error) {
      logger.error('Error in MemberRepository.getStatistics:', error);
      throw new AppError('Failed to fetch statistics', 500);
    } finally {
      client.release();
    }
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}
