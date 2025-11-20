import { Pool } from 'pg';
import { CreateServiceReportDTO } from '@/types/event.types';
import {pool} from '@config/database';
import logger from '@config/logger';

export class ServiceReportRepository {
    private pool: Pool;

    constructor() {
        this.pool = pool;
    }

    async create(data: CreateServiceReportDTO & { totalAttendance: number; totalOffering: number; totalExpense: number }) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            const reportQuery = `
        INSERT INTO service_reports (
          church_id, date, topic, preacher, category,
          total_attendance, total_offering, total_expense, notes, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        RETURNING *
      `;

            const reportValues = [
                data.churchId,
                data.date,
                data.topic,
                data.preacher,
                data.category,
                data.totalAttendance,
                data.totalOffering,
                data.totalExpense,
                data.notes || null
            ];

            const reportResult = await client.query(reportQuery, reportValues);
            const report = reportResult.rows[0];

            // Insert attendance records
            if (data.attendance && data.attendance.length > 0) {
                const attendanceQuery = `
          INSERT INTO service_attendance (service_report_id, attendance_type, count)
          VALUES ${data.attendance.map((_, i) => `($1, ${i * 2 + 2}, ${i * 2 + 3})`).join(', ')}
        `;

                const attendanceValues = [report.id];
                data.attendance.forEach(a => {
                    attendanceValues.push(a.type, a.count);
                });

                await client.query(attendanceQuery, attendanceValues);
            }

            // Insert offering records
            if (data.offerings && data.offerings.length > 0) {
                const offeringQuery = `
          INSERT INTO service_offerings (service_report_id, offering_item_id, channel, amount)
          VALUES ${data.offerings.map((_, i) => `($1, ${i * 3 + 2}, ${i * 3 + 3}, ${i * 3 + 4})`).join(', ')}
        `;

                const offeringValues = [report.id];
                data.offerings.forEach(o => {
                    offeringValues.push(o.itemId, o.channel, o.amount);
                });

                await client.query(offeringQuery, offeringValues);
            }

            // Insert expense records
            if (data.expenses && data.expenses.length > 0) {
                const expenseQuery = `
          INSERT INTO service_expenses (service_report_id, expense_item_id, account_id, amount)
          VALUES ${data.expenses.map((_, i) => `($1, ${i * 3 + 2}, ${i * 3 + 3}, ${i * 3 + 4})`).join(', ')}
        `;

                const expenseValues = [report.id];
                data.expenses.forEach(e => {
                    expenseValues.push(e.itemId, e.accountId, e.amount);
                });

                await client.query(expenseQuery, expenseValues);
            }

            await client.query('COMMIT');
            return report;
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Error in ServiceReportRepository.create:', error);
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

            const countQuery = 'SELECT COUNT(*) FROM service_reports WHERE church_id = $1';
            const countResult = await client.query(countQuery, [churchId]);
            const total = parseInt(countResult.rows[0].count);

            const dataQuery = `
        SELECT * FROM service_reports
        WHERE church_id = $1
        ORDER BY date DESC
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
          sr.*,
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'type', sa.attendance_type,
                'count', sa.count
              )
            ) FILTER (WHERE sa.id IS NOT NULL),
            '[]'
          ) as attendance,
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'itemId', so.offering_item_id,
                'channel', so.channel,
                'amount', so.amount
              )
            ) FILTER (WHERE so.id IS NOT NULL),
            '[]'
          ) as offerings,
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'itemId', se.expense_item_id,
                'accountId', se.account_id,
                'amount', se.amount
              )
            ) FILTER (WHERE se.id IS NOT NULL),
            '[]'
          ) as expenses
        FROM service_reports sr
        LEFT JOIN service_attendance sa ON sr.id = sa.service_report_id
        LEFT JOIN service_offerings so ON sr.id = so.service_report_id
        LEFT JOIN service_expenses se ON sr.id = se.service_report_id
        WHERE sr.id = $1 AND sr.church_id = $2
        GROUP BY sr.id
      `;

            const result = await client.query(query, [id, churchId]);
            return result.rows[0];
        } finally {
            client.release();
        }
    }
}