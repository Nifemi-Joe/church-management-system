import nodemailer from 'nodemailer';
import logger from '@config/logger';

interface EmailProviderData {
    from: string;
    subject: string;
    body: string;
    recipients: string[];
    attachments?: string[];
}

export async function sendEmailToProvider(data: EmailProviderData): Promise<any> {
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASSWORD
            }
        });

        const mailOptions = {
            from: data.from,
            to: data.recipients.join(','),
            subject: data.subject,
            html: data.body,
            attachments: data.attachments?.map(url => ({
                path: url
            }))
        };

        const info = await transporter.sendMail(mailOptions);

        logger.info('Email sent:', info.messageId);

        return {
            provider: 'smtp',
            status: 'sent',
            messageId: info.messageId,
            accepted: info.accepted,
            rejected: info.rejected
        };
    } catch (error) {
        logger.error('Error sending email:', error);
        throw error;
    }
}
