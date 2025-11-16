const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Service = require('../models/Service');
const { formatDate, formatTime } = require('../utils/helpers');

/**
 * Generate attendance report
 */
exports.generateAttendanceReport = async (options) => {
    const {
        startDate,
        endDate,
        serviceId,
        departmentId,
        format = 'excel', // excel, csv, pdf, json
        groupBy = 'date' // date, service, department, user
    } = options;

    // Build query
    const query = { isDeleted: false };
    if (startDate) query.date = { ...query.date, $gte: new Date(startDate) };
    if (endDate) query.date = { ...query.date, $lte: new Date(endDate) };
    if (serviceId) query.service = serviceId;

    // Fetch attendance records
    const attendances = await Attendance.find(query)
        .populate('user', 'firstName lastName membershipId email phoneNumber departments')
        .populate('service', 'name type startTime')
        .sort({ date: -1, checkInTime: -1 });

    // Filter by department if needed
    let filteredAttendances = attendances;
    if (departmentId) {
        filteredAttendances = attendances.filter(a =>
            a.user.departments.some(d => d.toString() === departmentId)
        );
    }

    // Generate report based on format
    switch (format) {
        case 'excel':
            return await this.generateExcelReport(filteredAttendances, groupBy);
        case 'csv':
            return await this.generateCSVReport(filteredAttendances, groupBy);
        case 'pdf':
            return await this.generatePDFReport(filteredAttendances, groupBy, options);
        case 'json':
            return this.generateJSONReport(filteredAttendances, groupBy);
        default:
            throw new Error('Invalid format');
    }
};

/**
 * Generate Excel report
 */
exports.generateExcelReport = async (attendances, groupBy) => {
    const workbook = XLSX.utils.book_new();

    // Prepare data
    const data = attendances.map(a => ({
        'Date': formatDate(a.date),
        'Check-In Time': formatTime(a.checkInTime),
        'Member Name': a.user.fullName,
        'Membership ID': a.user.membershipId,
        'Email': a.user.email,
        'Phone': a.user.phoneNumber,
        'Service': a.service.name,
        'Service Type': a.service.type,
        'Status': a.status,
        'Method': a.method,
        'Late': a.isLate ? 'Yes' : 'No',
        'Minutes Late': a.minutesLate || 0,
        'Duration (mins)': a.duration || 'N/A'
    }));

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Set column widths
    worksheet['!cols'] = [
        { wch: 12 }, // Date
        { wch: 15 }, // Check-In Time
        { wch: 20 }, // Name
        { wch: 15 }, // Membership ID
        { wch: 25 }, // Email
        { wch: 15 }, // Phone
        { wch: 20 }, // Service
        { wch: 15 }, // Service Type
        { wch: 10 }, // Status
        { wch: 12 }, // Method
        { wch: 8 },  // Late
        { wch: 12 }, // Minutes Late
        { wch: 15 }  // Duration
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');

    // Generate summary sheet
    const summary = this.generateSummary(attendances);
    const summaryData = [
        { 'Metric': 'Total Attendance', 'Value': summary.total },
        { 'Metric': 'Present', 'Value': summary.present },
        { 'Metric': 'Late', 'Value': summary.late },
        { 'Metric': 'Absent', 'Value': summary.absent },
        { 'Metric': 'Attendance Rate', 'Value': `${summary.rate}%` },
        { 'Metric': 'Average Duration', 'Value': `${summary.avgDuration} mins` }
    ];
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Write to buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return {
        buffer,
        filename: `attendance_report_${Date.now()}.xlsx`,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
};

/**
 * Generate CSV report
 */
exports.generateCSVReport = async (attendances, groupBy) => {
    const data = attendances.map(a => ({
        'Date': formatDate(a.date),
        'Check-In Time': formatTime(a.checkInTime),
        'Member Name': a.user.fullName,
        'Membership ID': a.user.membershipId,
        'Email': a.user.email,
        'Phone': a.user.phoneNumber,
        'Service': a.service.name,
        'Status': a.status,
        'Method': a.method,
        'Late': a.isLate ? 'Yes' : 'No',
        'Minutes Late': a.minutesLate || 0
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(worksheet);

    return {
        buffer: Buffer.from(csv),
        filename: `attendance_report_${Date.now()}.csv`,
        contentType: 'text/csv'
    };
};

/**
 * Generate PDF report
 */
exports.generatePDFReport = async (attendances, groupBy, options) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50 });
            const chunks = [];

            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => {
                const buffer = Buffer.concat(chunks);
                resolve({
                    buffer,
                    filename: `attendance_report_${Date.now()}.pdf`,
                    contentType: 'application/pdf'
                });
            });

            // Header
            doc.fontSize(20).text('RCCG He Reigns Assembly', { align: 'center' });
            doc.fontSize(16).text('Attendance Report', { align: 'center' });
            doc.moveDown();

            // Date range
            if (options.startDate && options.endDate) {
                doc.fontSize(10).text(
                    `Period: ${formatDate(options.startDate)} to ${formatDate(options.endDate)}`,
                    { align: 'center' }
                );
            }
            doc.moveDown();

            // Summary
            const summary = this.generateSummary(attendances);
            doc.fontSize(12).text('Summary', { underline: true });
            doc.fontSize(10);
            doc.text(`Total Attendance: ${summary.total}`);
            doc.text(`Present: ${summary.present}`);
            doc.text(`Late: ${summary.late}`);
            doc.text(`Attendance Rate: ${summary.rate}%`);
            doc.moveDown();

            // Table header
            doc.fontSize(12).text('Attendance Records', { underline: true });
            doc.moveDown(0.5);

            // Table
            const tableTop = doc.y;
            const tableLeft = 50;
            const colWidths = [80, 120, 80, 80, 80];

            // Headers
            doc.fontSize(9).font('Helvetica-Bold');
            doc.text('Date', tableLeft, tableTop);
            doc.text('Name', tableLeft + colWidths[0], tableTop);
            doc.text('Service', tableLeft + colWidths[0] + colWidths[1], tableTop);
            doc.text('Status', tableLeft + colWidths[0] + colWidths[1] + colWidths[2], tableTop);
            doc.text('Time', tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], tableTop);

            // Data
            doc.font('Helvetica');
            let y = tableTop + 20;

            attendances.slice(0, 30).forEach(a => { // Limit to 30 records for PDF
                if (y > 700) {
                    doc.addPage();
                    y = 50;
                }

                doc.text(formatDate(a.date), tableLeft, y);
                doc.text(a.user.fullName.substring(0, 18), tableLeft + colWidths[0], y);
                doc.text(a.service.name.substring(0, 12), tableLeft + colWidths[0] + colWidths[1], y);
                doc.text(a.status, tableLeft + colWidths[0] + colWidths[1] + colWidths[2], y);
                doc.text(formatTime(a.checkInTime), tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], y);

                y += 20;
            });

            if (attendances.length > 30) {
                doc.moveDown();
                doc.fontSize(8).text(`... and ${attendances.length - 30} more records`, { align: 'center', color: 'gray' });
            }

            // Footer
            doc.fontSize(8).text(
                `Generated on ${formatDate(new Date())} at ${formatTime(new Date())}`,
                50,
                doc.page.height - 50,
                { align: 'center' }
            );

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};

/**
 * Generate JSON report
 */
exports.generateJSONReport = (attendances, groupBy) => {
    const data = attendances.map(a => ({
        date: a.date,
        checkInTime: a.checkInTime,
        user: {
            id: a.user._id,
            name: a.user.fullName,
            membershipId: a.user.membershipId,
            email: a.user.email,
            phone: a.user.phoneNumber
        },
        service: {
            id: a.service._id,
            name: a.service.name,
            type: a.service.type
        },
        status: a.status,
        method: a.method,
        isLate: a.isLate,
        minutesLate: a.minutesLate,
        duration: a.duration
    }));

    const summary = this.generateSummary(attendances);

    return {
        buffer: Buffer.from(JSON.stringify({ summary, data }, null, 2)),
        filename: `attendance_report_${Date.now()}.json`,
        contentType: 'application/json'
    };
};

/**
 * Generate member report
 */
exports.generateMemberReport = async (userId, options = {}) => {
    const user = await User.findById(userId)
        .populate('departments', 'name');

    if (!user) {
        throw new Error('User not found');
    }

    const { startDate, endDate, format = 'pdf' } = options;

    const query = {
        user: userId,
        isDeleted: false
    };

    if (startDate) query.date = { ...query.date, $gte: new Date(startDate) };
    if (endDate) query.date = { ...query.date, $lte: new Date(endDate) };

    const attendances = await Attendance.find(query)
        .populate('service', 'name type startTime')
        .sort({ date: -1 });

    // Calculate statistics
    const stats = {
        totalServices: attendances.length,
        present: attendances.filter(a => a.status === 'present').length,
        late: attendances.filter(a => a.isLate).length,
        averageMinutesLate: attendances.reduce((sum, a) => sum + (a.minutesLate || 0), 0) / attendances.length || 0,
        attendanceRate: user.attendanceStats.attendanceRate,
        engagementScore: user.attendanceStats.engagementScore,
        consecutiveAbsences: user.attendanceStats.consecutiveAbsences,
        lastAttendance: user.attendanceStats.lastAttendance
    };

    const reportData = {
        user: {
            name: user.fullName,
            membershipId: user.membershipId,
            email: user.email,
            phone: user.phoneNumber,
            role: user.role,
            departments: user.departments.map(d => d.name).join(', ')
        },
        stats,
        attendances: attendances.map(a => ({
            date: a.date,
            service: a.service.name,
            checkInTime: a.checkInTime,
            status: a.status,
            isLate: a.isLate,
            minutesLate: a.minutesLate
        }))
    };

    if (format === 'json') {
        return {
            buffer: Buffer.from(JSON.stringify(reportData, null, 2)),
            filename: `member_report_${user.membershipId}_${Date.now()}.json`,
            contentType: 'application/json'
        };
    }

    // Generate PDF for member report
    return this.generateMemberPDFReport(reportData);
};

/**
 * Generate member PDF report
 */
exports.generateMemberPDFReport = async (data) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50 });
            const chunks = [];

            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => {
                resolve({
                    buffer: Buffer.concat(chunks),
                    filename: `member_report_${data.user.membershipId}_${Date.now()}.pdf`,
                    contentType: 'application/pdf'
                });
            });

            // Header
            doc.fontSize(20).text('Member Attendance Report', { align: 'center' });
            doc.moveDown();

            // Member Info
            doc.fontSize(14).text('Member Information', { underline: true });
            doc.fontSize(10);
            doc.text(`Name: ${data.user.name}`);
            doc.text(`Membership ID: ${data.user.membershipId}`);
            doc.text(`Email: ${data.user.email}`);
            doc.text(`Phone: ${data.user.phone}`);
            doc.text(`Role: ${data.user.role}`);
            doc.text(`Departments: ${data.user.departments}`);
            doc.moveDown();

            // Statistics
            doc.fontSize(14).text('Statistics', { underline: true });
            doc.fontSize(10);
            doc.text(`Total Services Attended: ${data.stats.totalServices}`);
            doc.text(`On Time: ${data.stats.present - data.stats.late}`);
            doc.text(`Late: ${data.stats.late}`);
            doc.text(`Average Minutes Late: ${Math.round(data.stats.averageMinutesLate)}`);
            doc.text(`Attendance Rate: ${data.stats.attendanceRate}%`);
            doc.text(`Engagement Score: ${data.stats.engagementScore}`);
            doc.text(`Consecutive Absences: ${data.stats.consecutiveAbsences}`);
            doc.text(`Last Attendance: ${formatDate(data.stats.lastAttendance)}`);
            doc.moveDown();

            // Recent Attendance
            doc.fontSize(14).text('Recent Attendance History', { underline: true });
            doc.moveDown(0.5);

            doc.fontSize(10);
            data.attendances.slice(0, 20).forEach((a, i) => {
                doc.text(
                    `${i + 1}. ${formatDate(a.date)} - ${a.service} (${formatTime(a.checkInTime)}) ${a.isLate ? '- LATE' : ''}`,
                    { color: a.isLate ? 'red' : 'black' }
                );
            });

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};

/**
 * Generate summary statistics
 */
exports.generateSummary = (attendances) => {
    const total = attendances.length;
    const present = attendances.filter(a => a.status === 'present').length;
    const late = attendances.filter(a => a.isLate).length;
    const absent = attendances.filter(a => a.status === 'absent').length;

    const totalDuration = attendances.reduce((sum, a) => sum + (a.duration || 0), 0);
    const avgDuration = total > 0 ? Math.round(totalDuration / total) : 0;

    const rate = total > 0 ? Math.round((present / total) * 100) : 0;

    return {
        total,
        present,
        late,
        absent,
        rate,
        avgDuration
    };
};

/**
 * Generate monthly church report
 */
exports.generateMonthlyChurchReport = async (year, month, format = 'pdf') => {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Get all data for the month
    const attendances = await Attendance.find({
        date: { $gte: startDate, $lte: endDate },
        isDeleted: false
    }).populate('user service');

    const services = await Service.find({ isActive: true });
    const totalMembers = await User.countDocuments({ isActive: true, role: { $ne: 'visitor' } });

    // Calculate statistics
    const uniqueAttendees = new Set(attendances.map(a => a.user._id.toString())).size;
    const totalAttendance = attendances.length;
    const averageAttendance = Math.round(totalAttendance / services.length);
    const attendanceRate = Math.round((uniqueAttendees / totalMembers) * 100);

    // Group by service
    const serviceStats = {};
    attendances.forEach(a => {
        const serviceId = a.service._id.toString();
        if (!serviceStats[serviceId]) {
            serviceStats[serviceId] = {
                name: a.service.name,
                count: 0,
                late: 0
            };
        }
        serviceStats[serviceId].count++;
        if (a.isLate) serviceStats[serviceId].late++;
    });

    // Group by week
    const weeklyStats = {};
    attendances.forEach(a => {
        const week = Math.ceil(a.date.getDate() / 7);
        if (!weeklyStats[week]) weeklyStats[week] = 0;
        weeklyStats[week]++;
    });

    const reportData = {
        period: `${new Date(year, month - 1).toLocaleString('default', { month: 'long' })} ${year}`,
        summary: {
            totalMembers,
            uniqueAttendees,
            totalAttendance,
            averageAttendance,
            attendanceRate,
            totalServices: services.length
        },
        serviceStats,
        weeklyStats
    };

    if (format === 'json') {
        return {
            buffer: Buffer.from(JSON.stringify(reportData, null, 2)),
            filename: `monthly_report_${year}_${month}_${Date.now()}.json`,
            contentType: 'application/json'
        };
    }

    return this.generateMonthlyPDFReport(reportData);
};

/**
 * Generate monthly PDF report
 */
exports.generateMonthlyPDFReport = async (data) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50 });
            const chunks = [];

            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => {
                resolve({
                    buffer: Buffer.concat(chunks),
                    filename: `monthly_church_report_${Date.now()}.pdf`,
                    contentType: 'application/pdf'
                });
            });

            // Header
            doc.fontSize(22).text('RCCG He Reigns Assembly', { align: 'center' });
            doc.fontSize(18).text('Monthly Church Report', { align: 'center' });
            doc.fontSize(14).text(data.period, { align: 'center' });
            doc.moveDown(2);

            // Summary
            doc.fontSize(16).text('Overview', { underline: true });
            doc.fontSize(11);
            doc.text(`Total Active Members: ${data.summary.totalMembers}`);
            doc.text(`Unique Attendees: ${data.summary.uniqueAttendees}`);
            doc.text(`Total Attendance: ${data.summary.totalAttendance}`);
            doc.text(`Average Per Service: ${data.summary.averageAttendance}`);
            doc.text(`Overall Attendance Rate: ${data.summary.attendanceRate}%`);
            doc.text(`Total Services: ${data.summary.totalServices}`);
            doc.moveDown(2);

            // Service Statistics
            doc.fontSize(16).text('Service Statistics', { underline: true });
            doc.moveDown(0.5);
            doc.fontSize(10);

            Object.values(data.serviceStats).forEach(service => {
                doc.text(`${service.name}: ${service.count} attendees (${service.late} late)`);
            });

            doc.moveDown(2);

            // Weekly Breakdown
            doc.fontSize(16).text('Weekly Breakdown', { underline: true });
            doc.moveDown(0.5);
            doc.fontSize(10);

            Object.entries(data.weeklyStats).forEach(([week, count]) => {
                doc.text(`Week ${week}: ${count} attendances`);
            });

            // Footer
            doc.fontSize(8).text(
                `Generated on ${formatDate(new Date())}`,
                50,
                doc.page.height - 50,
                { align: 'center' }
            );

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};

/**
 * Generate department report
 */
exports.generateDepartmentReport = async (departmentId, options = {}) => {
    const Department = require('../models/Department');
    const department = await Department.findById(departmentId)
        .populate('members.user', 'firstName lastName membershipId attendanceStats')
        .populate('head', 'firstName lastName');

    if (!department) {
        throw new Error('Department not found');
    }

    const { startDate, endDate, format = 'excel' } = options;

    // Get attendance for all department members
    const memberIds = department.members.map(m => m.user._id);

    const query = {
        user: { $in: memberIds },
        isDeleted: false
    };

    if (startDate) query.date = { ...query.date, $gte: new Date(startDate) };
    if (endDate) query.date = { ...query.date, $lte: new Date(endDate) };

    const attendances = await Attendance.find(query)
        .populate('user', 'firstName lastName membershipId')
        .populate('service', 'name');

    // Calculate member statistics
    const memberStats = department.members.map(m => ({
        name: m.user.fullName,
        membershipId: m.user.membershipId,
        role: m.role,
        attendanceRate: m.user.attendanceStats.attendanceRate,
        totalPresent: m.user.attendanceStats.totalPresent,
        consecutiveAbsences: m.user.attendanceStats.consecutiveAbsences,
        engagementScore: m.user.attendanceStats.engagementScore
    }));

    const reportData = {
        department: {
            name: department.name,
            code: department.code,
            head: department.head ? department.head.fullName : 'Not assigned',
            totalMembers: department.members.length
        },
        memberStats,
        attendances
    };

    if (format === 'json') {
        return {
            buffer: Buffer.from(JSON.stringify(reportData, null, 2)),
            filename: `department_${department.code}_${Date.now()}.json`,
            contentType: 'application/json'
        };
    }

    return this.generateDepartmentExcelReport(reportData);
};

/**
 * Generate department Excel report
 */
exports.generateDepartmentExcelReport = async (data) => {
    const workbook = XLSX.utils.book_new();

    // Member Statistics Sheet
    const memberData = data.memberStats.map(m => ({
        'Name': m.name,
        'Membership ID': m.membershipId,
        'Role': m.role,
        'Attendance Rate': `${m.attendanceRate}%`,
        'Total Present': m.totalPresent,
        'Consecutive Absences': m.consecutiveAbsences,
        'Engagement Score': m.engagementScore
    }));

    const memberSheet = XLSX.utils.json_to_sheet(memberData);
    XLSX.utils.book_append_sheet(workbook, memberSheet, 'Members');

    // Recent Attendance Sheet
    const attendanceData = data.attendances.slice(0, 500).map(a => ({
        'Date': formatDate(a.date),
        'Member': a.user.fullName,
        'Membership ID': a.user.membershipId,
        'Service': a.service.name,
        'Status': a.status,
        'Check-In Time': formatTime(a.checkInTime)
    }));

    const attendanceSheet = XLSX.utils.json_to_sheet(attendanceData);
    XLSX.utils.book_append_sheet(workbook, attendanceSheet, 'Attendance');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return {
        buffer,
        filename: `department_${data.department.code}_${Date.now()}.xlsx`,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
};