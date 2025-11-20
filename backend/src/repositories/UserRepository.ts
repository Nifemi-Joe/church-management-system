import { pool } from '@config/database';
import { AppError } from '@utils/AppError';
import logger from '@config/logger';

export class UserRepository {
  async create(data: any): Promise<any> {
    const client = await pool.connect();
    
    try {
      const query = `
        INSERT INTO users (
          church_id, email, password, first_name, last_name, role, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, church_id, email, first_name, last_name, role, status, created_at
      `;

      const values = [
        data.churchId,
        data.email,
        data.password,
        data.firstName,
        data.lastName,
        data.role || 'admin',
        data.status || 'active'
      ];

      const result = await client.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error('Error in UserRepository.create:', error);
      throw new AppError('Failed to create user', 500);
    } finally {
      client.release();
    }
  }

  async findByEmail(email: string): Promise<any> {
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT * FROM users 
        WHERE email = $1 AND deleted_at IS NULL
      `;
      
      const result = await client.query(query, [email]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error in UserRepository.findByEmail:', error);
      throw new AppError('Failed to fetch user', 500);
    } finally {
      client.release();
    }
  }

  async findById(id: string): Promise<any> {
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT * FROM users 
        WHERE id = $1 AND deleted_at IS NULL
      `;
      
      const result = await client.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error in UserRepository.findById:', error);
      throw new AppError('Failed to fetch user', 500);
    } finally {
      client.release();
    }
  }
}
