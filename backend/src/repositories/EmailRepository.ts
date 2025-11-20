import { Pool } from 'pg';
import { SendEmailDTO, CommunicationFilters } from '@/types/communication.types';
import {pool} from '@config/database';
import logger from '@config/logger';

export class EmailRepository {
    private pool: Pool;

    constructor() {
        this.pool = pool;
    }

    async create(data: SendEmailDTO & { userId: string }) {
        const client = await this.pool.connect();
        try {
            const query = `
        INSERT INTO email_messages (
          church_id, user_id, destination_type, recipients, 
          subject, body, attachments, status, scheduled_at, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        RETURNING *
      `;

            const values = [
                data.churchId,
                data.userId,
                data.destination,
                JSON.stringify(data.recipients),
                data.subject,
                data.body,
                data.attachments ? JSON.stringify(data.attachments) : null,
                data.scheduledAt ? 'scheduled' : 'pending',
                data.scheduledAt || null
            ];

            const result = await client.query(query, values);
            return result.rows[0];
        } catch (error) {
            logger.error('Error in EmailRepository.create:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async findAll(filters: CommunicationFilters) {
        const client = await this.pool.connect();
        try {
            const { churchId, page = 1, limit = 10 } = filters;
            const offset = (page - 1) * limit;

            const countQuery = 'SELECT COUNT(*) FROM email_messages WHERE church_id = $1';
            const countResult = await client.query(countQuery, [churchId]);
            const total = parseInt(countResult.rows[0].count);

            const dataQuery = `
        SELECT * FROM email_messages 
        WHERE church_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;

            const dataResult = await client.query(dataQuery, [churchId, limit, offset]);

            return {
                data: dataResult.rows,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } finally {
            client.release();
        }
    }

    async updateStatus(id: string, status: string, deliveryInfo?: any) {
        const client = await this.pool.connect();
        try {
            const query = `
        UPDATE email_messages 
        SET status = $1, delivery_info = $2, sent_at = NOW()
        WHERE id = $3
        RETURNING *
      `;

            const result = await client.query(query, [status, JSON.stringify(deliveryInfo), id]);
            return result.rows[0];
        } finally {
            client.release();
        }
    }
}
