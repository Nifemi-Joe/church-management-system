import { Pool } from 'pg';
import { CreateOfferingDTO } from '@/types/financial.types';
import {pool} from '@config/database';
import logger from '@config/logger';

export class OfferingRepository {
    private pool: Pool;

    constructor() {
        this.pool = pool;
    }

    async create(data: CreateOfferingDTO & { total: number }) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            const offeringQuery = `
        INSERT INTO offerings (church_id, event_id, date, total, notes, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING *
      `;

            const offeringValues = [
                data.churchId,
                data.eventId || null,
                data.date,
                data.total,
                data.notes || null
            ];

            const offeringResult = await client.query(offeringQuery, offeringValues);
            const offering = offeringResult.rows[0];

            if (data.items && data.items.length > 0) {
                const itemsQuery = `
          INSERT INTO offering_items (offering_id, offering_type_id, channel, amount)
          VALUES ${data.items.map((_, i) => `($1, ${i * 3 + 2}, ${i * 3 + 3}, ${i * 3 + 4})`).join(', ')}
        `;

                const itemsValues = [offering.id];
                data.items.forEach(item => {
                    itemsValues.push(item.offeringItemId, item.channel, item.amount);
                });

                await client.query(itemsQuery, itemsValues);
            }

            await client.query('COMMIT');
            return offering;
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Error in OfferingRepository.create:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async findAll(filters: any) {
        const client = await this.pool.connect();
        try {
            const { churchId, startDate, endDate, page = 1, limit = 10 } = filters;
            const offset = (page - 1) * limit;

            let whereClause = 'WHERE o.church_id = $1';
            const values: any[] = [churchId];
            let paramCount = 1;

            if (startDate) {
                paramCount++;
                whereClause += ` AND o.date >= ${paramCount}`;
                values.push(startDate);
            }

            if (endDate) {
                paramCount++;
                whereClause += ` AND o.date <= ${paramCount}`;
                values.push(endDate);
            }

            const countQuery = `SELECT COUNT(*) FROM offerings o ${whereClause}`;
            const countResult = await client.query(countQuery, values);
            const total = parseInt(countResult.rows[0].count);

            const dataQuery = `
        SELECT 
          o.*,
          e.name as event_name,
          COUNT(oi.id) as item_count
        FROM offerings o
        LEFT JOIN events e ON o.event_id = e.id
        LEFT JOIN offering_items oi ON o.id = oi.offering_id
        ${whereClause}
        GROUP BY o.id, e.name
        ORDER BY o.date DESC, o.created_at DESC
        LIMIT ${paramCount + 1} OFFSET ${paramCount + 2}
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
        } finally {
            client.release();
        }
    }

    async findById(id: string, churchId: string) {
        const client = await this.pool.connect();
        try {
            const query = `
        SELECT 
          o.*,
          json_agg(
            json_build_object(
              'id', oi.id,
              'offeringType', ot.name,
              'channel', oi.channel,
              'amount', oi.amount
            )
          ) as items
        FROM offerings o
        LEFT JOIN offering_items oi ON o.id = oi.offering_id
        LEFT JOIN offering_types ot ON oi.offering_type_id = ot.id
        WHERE o.id = $1 AND o.church_id = $2
        GROUP BY o.id
      `;

            const result = await client.query(query, [id, churchId]);
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    async getStatistics(churchId: string, startDate?: Date, endDate?: Date) {
        const client = await this.pool.connect();
        try {
            let whereClause = 'WHERE church_id = $1';
            const values: any[] = [churchId];
            let paramCount = 1;

            if (startDate) {
                paramCount++;
                whereClause += ` AND date >= ${paramCount}`;
                values.push(startDate);
            }

            if (endDate) {
                paramCount++;
                whereClause += ` AND date <= ${paramCount}`;
                values.push(endDate);
            }

            const query = `
        SELECT 
          COUNT(*) as total_offerings,
          SUM(total) as total_amount,
          AVG(total) as average_amount,
          MAX(total) as highest_amount
        FROM offerings
        ${whereClause}
      `;

            const result = await client.query(query, values);
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    async delete(id: string, churchId: string) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            await client.query('DELETE FROM offering_items WHERE offering_id = $1', [id]);
            await client.query('DELETE FROM offerings WHERE id = $1 AND church_id = $2', [id, churchId]);

            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}
