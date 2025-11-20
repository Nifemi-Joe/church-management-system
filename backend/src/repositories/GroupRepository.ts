import { Pool } from 'pg';
import {pool} from '@config/database';
import logger from '@config/logger';

export class GroupRepository {
    private pool: Pool;

    constructor() {
        this.pool = pool;
    }

    async getMembers(groupId: string, churchId: string) {
        const client = await this.pool.connect();
        try {
            const query = `
        SELECT m.*
        FROM members m
        INNER JOIN group_members gm ON m.id = gm.member_id
        WHERE gm.group_id = $1 AND m.church_id = $2
      `;

            const result = await client.query(query, [groupId, churchId]);
            return result.rows;
        } catch (error) {
            logger.error('Error in GroupRepository.getMembers:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async findById(id: string, churchId: string) {
        const client = await this.pool.connect();
        try {
            const query = 'SELECT * FROM groups WHERE id = $1 AND church_id = $2';
            const result = await client.query(query, [id, churchId]);
            return result.rows[0];
        } finally {
            client.release();
        }
    }
}
