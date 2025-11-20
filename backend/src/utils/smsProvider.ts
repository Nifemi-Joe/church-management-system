import axios from 'axios';
import logger from '@config/logger';

interface SMSProviderData {
    senderId: string;
    messages: Array<{ phone: string; message: string }>;
}

export async function sendSMSToProvider(data: SMSProviderData): Promise<any> {
    try {
        // Example using Africa's Talking API
        const apiKey = process.env.SMS_API_KEY;
        const username = process.env.SMS_USERNAME;

        if (!apiKey || !username) {
            throw new Error('SMS provider credentials not configured');
        }

        // Batch messages for the provider
        const recipients = data.messages.map(m => m.phone);
        const message = data.messages[0].message; // If all same message

        const response = await axios.post(
            'https://api.africastalking.com/version1/messaging',
            {
                username,
                to: recipients.join(','),
                message,
                from: data.senderId
            },
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'apiKey': apiKey
                }
            }
        );

        logger.info('SMS sent via provider:', response.data);

        return {
            provider: 'africastalking',
            status: 'sent',
            messageIds: response.data.SMSMessageData.Recipients.map((r: any) => r.messageId),
            cost: response.data.SMSMessageData.Recipients.reduce((sum: number, r: any) => sum + parseFloat(r.cost), 0)
        };
    } catch (error) {
        logger.error('Error sending SMS via provider:', error);
        throw error;
    }
}