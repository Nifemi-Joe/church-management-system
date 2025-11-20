import { Pool } from 'pg';
import {pool} from '@config/database';

export class VoiceRepository {
    private pool: Pool;

    constructor() {
        this.pool = pool;
    }

    async create(data: any) {
        const client = await this.pool.connect();
        try {
            const query = `
        INSERT INTO voice_calls (
          church_id, user_id, recipients, audio_file_url,
          units_used, status, scheduled_at, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING *
      `;

            const values = [
                data.churchId,
                data.userId,
                JSON.stringify(data.recipients),
                data.audioFileUrl,
                data.unitsUsed,
                data.scheduledAt ? 'scheduled' : 'pending',
                data.scheduledAt || null
            ];

            const result = await client.query(query, values);
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    async findAll(filters: any) {
        const client = await this.pool.connect();
        try {
            const { churchId, page = 1, limit = 10 } = filters;
            const offset = (page - 1) * limit;

            const countQuery = 'SELECT COUNT(*) FROM voice_calls WHERE church_id = $1';
            const countResult = await client.query(countQuery, [churchId]);
            const total = parseInt(countResult.rows[0].count);

            const dataQuery = `
        SELECT * FROM voice_calls 
        WHERE church_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;

            const dataResult = await client.query(dataQuery, [churchId, limit, offset]);

            return {
                data: dataResult.rows,
                pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
            };
        } finally {
            client.release();
        }
    }

    async updateStatus(id: string, status: string, deliveryInfo?: any) {
        const client = await this.pool.connect();
        try {
            const query = `
        UPDATE voice_calls 
        SET status = $1, delivery_info = $2, completed_at = NOW()
        WHERE id = $3
        RETURNING *
      `;

            const result = await client.query(query, [status, JSON.stringify(deliveryInfo), id]);
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    async getBalance(churchId: string) {
        const client = await this.pool.connect();
        try {
            const query = 'SELECT voice_balance FROM churches WHERE id = $1';
            const result = await client.query(query, [churchId]);
            return result.rows[0]?.voice_balance || 0;
        } finally {
            client.release();
        }
    }

    async deductBalance(churchId: string, units: number) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            const checkQuery = 'SELECT voice_balance FROM churches WHERE id = $1 FOR UPDATE';
            const checkResult = await client.query(checkQuery, [churchId]);

            if (!checkResult.rows[0] || checkResult.rows[0].voice_balance < units) {
                throw new Error('Insufficient voice balance');
            }

            const updateQuery = `
        UPDATE churches 
        SET voice_balance = voice_balance - $1, updated_at = NOW()
        WHERE id = $2
        RETURNING voice_balance
      `;

            const result = await client.query(updateQuery, [units, churchId]);

            await client.query('COMMIT');
            return result.rows[0].voice_balance;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}