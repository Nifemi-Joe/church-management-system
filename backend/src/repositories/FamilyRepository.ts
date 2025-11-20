import { Pool } from 'pg';
import type { CreateFamilyDTO, UpdateFamilyDTO, FamilyFilters } from '@/types/family.types';
import {pool} from '@config/database';
import logger from '@config/logger';

export class FamilyRepository {
    private pool: Pool;

    constructor() {
        this.pool = pool;
    }

    async create(data: CreateFamilyDTO) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            const familyQuery = `
        INSERT INTO families (
          church_id, name, father_id, mother_id, 
          email, phone, address, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING *
      `;

            const familyValues = [
                data.churchId,
                data.name,
                data.fatherId || null,
                data.motherId || null,
                data.email || null,
                data.phone || null,
                data.address || null
            ];

            const familyResult = await client.query(familyQuery, familyValues);
            const family = familyResult.rows[0];

            // Add wards if provided
            if (data.wardIds && data.wardIds.length > 0) {
                const wardQuery = `
          INSERT INTO family_wards (family_id, member_id)
          VALUES ${data.wardIds.map((_, i) => `($1, $${i + 2})`).join(', ')}
        `;
                await client.query(wardQuery, [family.id, ...data.wardIds]);
            }

            await client.query('COMMIT');
            return family;
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Error in FamilyRepository.create:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async findAll(filters: FamilyFilters) {
        const client = await this.pool.connect();
        try {
            const { churchId, search, page = 1, limit = 10 } = filters;
            const offset = (page - 1) * limit;

            let whereClause = 'WHERE f.church_id = $1';
            const values: any[] = [churchId];
            let paramCount = 1;

            if (search) {
                paramCount++;
                whereClause += ` AND f.name ILIKE $${paramCount}`;
                values.push(`%${search}%`);
            }

            const countQuery = `SELECT COUNT(*) FROM families f ${whereClause}`;
            const countResult = await client.query(countQuery, values);
            const total = parseInt(countResult.rows[0].count);

            const dataQuery = `
        SELECT 
          f.*,
          father.first_name || ' ' || father.last_name as father_name,
          mother.first_name || ' ' || mother.last_name as mother_name,
          COUNT(fw.id) as ward_count
        FROM families f
        LEFT JOIN members father ON f.father_id = father.id
        LEFT JOIN members mother ON f.mother_id = mother.id
        LEFT JOIN family_wards fw ON f.id = fw.family_id
        ${whereClause}
        GROUP BY f.id, father.first_name, father.last_name, mother.first_name, mother.last_name
        ORDER BY f.created_at DESC
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
            logger.error('Error in FamilyRepository.findAll:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async findById(id: string, churchId: string) {
        const client = await this.pool.connect();
        try {
            const query = `
        SELECT 
          f.*,
          json_build_object(
            'id', father.id,
            'name', father.first_name || ' ' || father.last_name,
            'email', father.email,
            'phone', father.phone
          ) as father,
          json_build_object(
            'id', mother.id,
            'name', mother.first_name || ' ' || mother.last_name,
            'email', mother.email,
            'phone', mother.phone
          ) as mother,
          COALESCE(
            json_agg(
              json_build_object(
                'id', ward.id,
                'name', ward.first_name || ' ' || ward.last_name,
                'age', EXTRACT(YEAR FROM AGE(ward.date_of_birth))
              )
            ) FILTER (WHERE ward.id IS NOT NULL),
            '[]'
          ) as wards
        FROM families f
        LEFT JOIN members father ON f.father_id = father.id
        LEFT JOIN members mother ON f.mother_id = mother.id
        LEFT JOIN family_wards fw ON f.id = fw.family_id
        LEFT JOIN members ward ON fw.member_id = ward.id
        WHERE f.id = $1 AND f.church_id = $2
        GROUP BY f.id, father.id, mother.id
      `;

            const result = await client.query(query, [id, churchId]);
            return result.rows[0];
        } catch (error) {
            logger.error('Error in FamilyRepository.findById:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async update(id: string, churchId: string, data: UpdateFamilyDTO) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            const fields: string[] = [];
            const values: any[] = [];
            let paramCount = 0;

            Object.entries(data).forEach(([key, value]) => {
                if (value !== undefined && key !== 'wardIds' && key !== 'churchId') {
                    paramCount++;
                    fields.push(`${key} = $${paramCount}`);
                    values.push(value);
                }
            });

            if (fields.length > 0) {
                paramCount++;
                fields.push(`updated_at = NOW()`);

                const updateQuery = `
          UPDATE families 
          SET ${fields.join(', ')}
          WHERE id = $${paramCount} AND church_id = $${paramCount + 1}
          RETURNING *
        `;

                values.push(id, churchId);
                const result = await client.query(updateQuery, values);

                // Update wards if provided
                if (data.wardIds) {
                    await client.query('DELETE FROM family_wards WHERE family_id = $1', [id]);

                    if (data.wardIds.length > 0) {
                        const wardQuery = `
              INSERT INTO family_wards (family_id, member_id)
              VALUES ${data.wardIds.map((_, i) => `($1, $${i + 2})`).join(', ')}
            `;
                        await client.query(wardQuery, [id, ...data.wardIds]);
                    }
                }

                await client.query('COMMIT');
                return result.rows[0];
            }

            await client.query('COMMIT');
            return null;
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Error in FamilyRepository.update:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async delete(id: string, churchId: string) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            await client.query('DELETE FROM family_wards WHERE family_id = $1', [id]);
            await client.query('DELETE FROM families WHERE id = $1 AND church_id = $2', [id, churchId]);

            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Error in FamilyRepository.delete:', error);
            throw error;
        } finally {
            client.release();
        }
    }
}