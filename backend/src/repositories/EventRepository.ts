import { Pool } from 'pg';
import { CreateEventDTO } from '@/types/event.types';
import {pool} from '@config/database';
import logger from '@config/logger';

export class EventRepository {
    private pool: Pool;

    constructor() {
        this.pool = pool;
    }

    async create(data: CreateEventDTO) {
        const client = await this.pool.connect();
        try {
            const query = `
        INSERT INTO events (
          church_id, name, details, group_id, date, 
          is_paid, price, banner_url, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        RETURNING *
      `;

            const values = [
                data.churchId,
                data.name,
                data.details || null,
                data.groupId || null,
                data.date,
                data.isPaid,
                data.price || null,
                data.bannerUrl || null
            ];

            const result = await client.query(query, values);
            return result.rows[0];
        } catch (error) {
            logger.error('Error in EventRepository.create:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async findAll(filters: any) {
        const client = await this.pool.connect();
        try {
            const { churchId, page = 1, limit = 10 } = filters;
            const offset = (page - 1) * limit;

            const countQuery = 'SELECT COUNT(*) FROM events WHERE church_id = $1';
            const countResult = await client.query(countQuery, [churchId]);
            const total = parseInt(countResult.rows[0].count);

            const dataQuery = `
        SELECT 
          e.*,
          g.name as group_name,
          COUNT(er.id) as registration_count
        FROM events e
        LEFT JOIN groups g ON e.group_id = g.id
        LEFT JOIN event_registrations er ON e.id = er.event_id
        WHERE e.church_id = $1
        GROUP BY e.id, g.name
        ORDER BY e.date DESC
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

    async findById(id: string, churchId: string) {
        const client = await this.pool.connect();
        try {
            const query = `
        SELECT 
          e.*,
          g.name as group_name
        FROM events e
        LEFT JOIN groups g ON e.group_id = g.id
        WHERE e.id = $1 AND e.church_id = $2
      `;

            const result = await client.query(query, [id, churchId]);
            return result.rows[0];
        } finally {
            client.release();
        }
    }
}
