import { Pool } from 'pg';
import type { SendSMSDTO, CommunicationFilters } from '@/types/communication.types';
import { pool } from '@config/database';   // ✅ Correct
import logger from '@config/logger';

export class SMSRepository {
    private pool: Pool;

    constructor() {
        this.pool = pool;
    }

    async create(data: SendSMSDTO & { userId: string; unitsUsed: number }) {
        const client = await this.pool.connect();
        try {
            const query = `
        INSERT INTO sms_messages (
          church_id, user_id, destination_type, recipients, 
          sender_id, message, units_used, status, scheduled_at, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        RETURNING *
      `;

            const values = [
                data.churchId,
                data.userId,
                data.destination,
                JSON.stringify(data.recipients),
                data.senderId,
                data.message,
                data.unitsUsed,
                data.scheduledAt ? 'scheduled' : 'pending',
                data.scheduledAt || null
            ];

            const result = await client.query(query, values);
            return result.rows[0];
        } catch (error) {
            logger.error('Error in SMSRepository.create:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async findAll(filters: CommunicationFilters) {
        const client = await this.pool.connect();
        try {
            const { churchId, status, startDate, endDate, page = 1, limit = 10 } = filters;
            const offset = (page - 1) * limit;

            let whereClause = 'WHERE church_id = $1';
            const values: any[] = [churchId];
            let paramCount = 1;

            if (status) {
                paramCount++;
                whereClause += ` AND status = $${paramCount}`;
                values.push(status);
            }

            if (startDate) {
                paramCount++;
                whereClause += ` AND created_at >= $${paramCount}`;
                values.push(startDate);
            }

            if (endDate) {
                paramCount++;
                whereClause += ` AND created_at <= $${paramCount}`;
                values.push(endDate);
            }

            const countQuery = `SELECT COUNT(*) FROM sms_messages ${whereClause}`;
            const countResult = await client.query(countQuery, values);
            const total = parseInt(countResult.rows[0].count);

            const dataQuery = `
        SELECT * FROM sms_messages 
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;

            values.push(limit, offset);
            const dataResult = await client.query(dataQuery, values);

            return {
                data: dataResult.rows,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            logger.error('Error in SMSRepository.findAll:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async findById(id: string, churchId: string) {
        const client = await this.pool.connect();
        try {
            const query = 'SELECT * FROM sms_messages WHERE id = $1 AND church_id = $2';
            const result = await client.query(query, [id, churchId]);
            return result.rows[0];
        } catch (error) {
            logger.error('Error in SMSRepository.findById:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async updateStatus(id: string, status: string, deliveryInfo?: any) {
        const client = await this.pool.connect();
        try {
            const query = `
        UPDATE sms_messages 
        SET status = $1, delivery_info = $2, sent_at = NOW()
        WHERE id = $3
        RETURNING *
      `;

            const result = await client.query(query, [status, JSON.stringify(deliveryInfo), id]);
            return result.rows[0];
        } catch (error) {
            logger.error('Error in SMSRepository.updateStatus:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async getBalance(churchId: string) {
        const client = await this.pool.connect();
        try {
            const query = 'SELECT sms_balance FROM churches WHERE id = $1';
            const result = await client.query(query, [churchId]);
            return result.rows[0]?.sms_balance || 0;
        } catch (error) {
            logger.error('Error in SMSRepository.getBalance:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async deductBalance(churchId: string, units: number) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            const checkQuery = 'SELECT sms_balance FROM churches WHERE id = $1 FOR UPDATE';
            const checkResult = await client.query(checkQuery, [churchId]);

            if (!checkResult.rows[0] || checkResult.rows[0].sms_balance < units) {
                throw new Error('Insufficient SMS balance');
            }

            const updateQuery = `
        UPDATE churches 
        SET sms_balance = sms_balance - $1, updated_at = NOW()
        WHERE id = $2
        RETURNING sms_balance
      `;

            const result = await client.query(updateQuery, [units, churchId]);

            await client.query('COMMIT');
            return result.rows[0].sms_balance;
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Error in SMSRepository.deductBalance:', error);
            throw error;
        } finally {
            client.release();
        }
    }
}
