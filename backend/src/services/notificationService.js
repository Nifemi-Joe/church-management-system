const nodemailer = require('nodemailer');
const User = require('../models/User');
const { NOTIFICATION_TYPES } = require('../config/constants');

/**
 * Send notification to user(s)
 * @param {Object} options - Notification options
 */
exports.sendNotification = async (options) => {
    const {
        userId,
        userIds,
        type,
        title,
        message,
        data,
        channels = ['email', 'push']
    } = options;

    try {
        let users = [];

        if (userId) {
            const user = await User.findById(userId);
            if (user) users.push(user);
        } else if (userIds && Array.isArray(userIds)) {
            users = await User.find({ _id: { $in: userIds } });
        }

        // Filter users based on notification preferences
        const recipients = users.filter(user => {
            if (channels.includes('email') && !user.notifications.email) return false;
            if (channels.includes('sms') && !user.notifications.sms) return false;
            if (channels.includes('push') && !user.notifications.push) return false;
            return true;
        });

        const results = {
            email: { sent: 0, failed: 0 },
            sms: { sent: 0, failed: 0 },
            push: { sent: 0, failed: 0 }
        };

        // Send via different channels
        for (const user of recipients) {
            if (channels.includes('email') && user.notifications.email) {
                try {
                    await this.sendEmailNotification(user.email, title, message, data);
                    results.email.sent++;
                } catch (error) {
                    results.email.failed++;
                }
            }

            if (channels.includes('sms') && user.notifications.sms && user.phoneNumber) {
                try {
                    await this.sendSMSNotification(user.phoneNumber, message);
                    results.sms.sent++;
                } catch (error) {
                    results.sms.failed++;
                }
            }

            if (channels.includes('push') && user.notifications.push) {
                try {
                    await this.sendPushNotification(user._id, title, message, data);
                    results.push.sent++;
                } catch (error) {
                    results.push.failed++;
                }
            }
        }

        return results;
    } catch (error) {
        console.error('Error sending notification:', error);
        throw error;
    }
};

/**
 * Send email notification
 */
exports.sendEmailNotification = async (email, subject, message, data = {}) => {
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        }
    });

    const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: email,
        subject,
        html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #0ea5e9 0%, #8b5cf6 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 20px; border-radius: 0 0 10px 10px; }
          .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>${subject}</h2>
          </div>
          <div class="content">
            ${message}
            ${data.actionUrl ? `<p><a href="${data.actionUrl}" style="display: inline-block; padding: 10px 20px; background: #0ea5e9; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px;">${data.actionText || 'View Details'}</a></p>` : ''}
          </div>
          <div class="footer">
            <p>${process.env.CHURCH_NAME}</p>
            <p>${process.env.CHURCH_LOCATION}</p>
          </div>
        </div>
      </body>
      </html>
    `
    };

    await transporter.sendMail(mailOptions);
};

/**
 * Send SMS notification (Placeholder - integrate with SMS provider)
 */
exports.sendSMSNotification = async (phoneNumber, message) => {
    // TODO: Integrate with SMS provider (Twilio, Termii, etc.)
    console.log(`SMS to ${phoneNumber}: ${message}`);

    // Example with Twilio:
    // const client = require('twilio')(accountSid, authToken);
    // await client.messages.create({
    //   body: message,
    //   from: process.env.TWILIO_PHONE_NUMBER,
    //   to: phoneNumber
    // });
};

/**
 * Send push notification (Placeholder - integrate with push service)
 */
exports.sendPushNotification = async (userId, title, message, data = {}) => {
    // TODO: Integrate with push notification service (Firebase, OneSignal, etc.)
    console.log(`Push to ${userId}: ${title} - ${message}`);

    // Store notification in database for in-app display
    // await Notification.create({ userId, title, message, data, read: false });
};

/**
 * Send bulk notifications
 */
exports.sendBulkNotification = async (options) => {
    const {
        filter = {},
        type,
        title,
        message,
        data,
        channels
    } = options;

    // Get all users matching filter
    const users = await User.find({ isActive: true, ...filter });
    const userIds = users.map(u => u._id);

    return await this.sendNotification({
        userIds,
        type,
        title,
        message,
        data,
        channels
    });
};

/**
 * Send attendance reminder
 */
exports.sendAttendanceReminder = async (serviceId) => {
    const Service = require('../models/Service');
    const service = await Service.findById(serviceId);

    if (!service || !service.notifications.enabled) {
        return;
    }

    const filter = {};
    if (service.requiredFor.allMembers) {
        filter.role = { $ne: 'visitor' };
    } else if (service.requiredFor.workers) {
        filter.isWorker = true;
    }

    const title = `Reminder: ${service.name}`;
    const message = `Don't forget! ${service.name} is coming up. See you there!`;

    await this.sendBulkNotification({
        filter,
        type: NOTIFICATION_TYPES.ATTENDANCE_REMINDER,
        title,
        message,
        data: { serviceId: service._id },
        channels: service.notifications.channels.email ? ['email', 'push'] : ['push']
    });
};

/**
 * Send missed service notification
 */
exports.sendMissedServiceNotification = async (userId, serviceName) => {
    const title = 'We Missed You!';
    const message = `We noticed you weren't at ${serviceName}. Hope everything is okay. We'd love to see you at the next service!`;

    await this.sendNotification({
        userId,
        type: NOTIFICATION_TYPES.MISSED_SERVICE,
        title,
        message,
        channels: ['email', 'push']
    });
};

/**
 * Send birthday greeting
 */
exports.sendBirthdayGreeting = async (userId) => {
    const user = await User.findById(userId);
    if (!user) return;

    const title = `🎉 Happy Birthday, ${user.firstName}!`;
    const message = `
    <h2>Happy Birthday ${user.firstName}!</h2>
    <p>On this special day, we pray that God's blessings overflow in your life.</p>
    <p>May this new year bring you joy, peace, and prosperity!</p>
    <p>We celebrate you today!</p>
    <p>With love,<br>RCCG He Reigns Assembly Family</p>
  `;

    await this.sendNotification({
        userId,
        type: NOTIFICATION_TYPES.BIRTHDAY,
        title,
        message,
        channels: ['email', 'sms', 'push']
    });
};

/**
 * Send announcement
 */
exports.sendAnnouncement = async (options) => {
    const {
        title,
        message,
        targetGroup = 'all', // all, workers, ministers, department
        departmentId,
        channels = ['email', 'push']
    } = options;

    let filter = { isActive: true };

    switch (targetGroup) {
        case 'workers':
            filter.isWorker = true;
            break;
        case 'ministers':
            filter.isMinister = true;
            break;
        case 'department':
            if (departmentId) {
                filter.departments = departmentId;
            }
            break;
    }

    await this.sendBulkNotification({
        filter,
        type: NOTIFICATION_TYPES.ANNOUNCEMENT,
        title,
        message,
        channels
    });
};

/**
 * Send follow-up notification
 */
exports.sendFollowUpNotification = async (followUpId) => {
    const FollowUp = require('../models/FollowUp');
    const followUp = await FollowUp.findById(followUpId)
        .populate('member', 'firstName lastName')
        .populate('assignedTo', 'firstName email phoneNumber');

    if (!followUp) return;

    const title = `Follow-up Task: ${followUp.member.firstName} ${followUp.member.lastName}`;
    const message = `You have been assigned a follow-up task for ${followUp.member.firstName} ${followUp.member.lastName}. Reason: ${followUp.reason}. Due: ${followUp.dueDate.toDateString()}`;

    await this.sendNotification({
        userId: followUp.assignedTo._id,
        type: NOTIFICATION_TYPES.FOLLOWUP,
        title,
        message,
        data: { followUpId: followUp._id },
        channels: ['email', 'push']
    });
};

/**
 * Send report ready notification
 */
exports.sendReportReadyNotification = async (userId, reportType, downloadUrl) => {
    const title = 'Report Ready';
    const message = `Your ${reportType} report is ready for download.`;

    await this.sendNotification({
        userId,
        type: NOTIFICATION_TYPES.REPORT_READY,
        title,
        message,
        data: {
            actionUrl: downloadUrl,
            actionText: 'Download Report'
        },
        channels: ['email', 'push']
    });
};

/**
 * Schedule notification for later
 */
exports.scheduleNotification = async (options) => {
    const { scheduledFor, ...notificationOptions } = options;

    // TODO: Implement job queue (Bull, Agenda, etc.)
    // For now, just log
    console.log(`Notification scheduled for ${scheduledFor}:`, notificationOptions);

    // Example with node-cron or agenda:
    // agenda.schedule(scheduledFor, 'send-notification', notificationOptions);
};

/**
 * Get notification statistics
 */
exports.getNotificationStats = async (startDate, endDate) => {
    // TODO: Implement notification tracking in database
    // Return stats like: sent, delivered, opened, clicked
    return {
        email: { sent: 0, delivered: 0, opened: 0 },
        sms: { sent: 0, delivered: 0 },
        push: { sent: 0, delivered: 0, clicked: 0 }
    };
};