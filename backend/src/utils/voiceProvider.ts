import axios from 'axios';
import logger from '@config/logger';

interface VoiceProviderData {
    audioFileUrl: string;
    recipients: string[];
}

export async function sendVoiceCallToProvider(data: VoiceProviderData): Promise<any> {
    try {
        const apiKey = process.env.VOICE_API_KEY;
        const username = process.env.VOICE_USERNAME;

        if (!apiKey || !username) {
            throw new Error('Voice provider credentials not configured');
        }

        const response = await axios.post(
            'https://api.africastalking.com/version1/call',
            {
                username,
                to: data.recipients.join(','),
                from: process.env.VOICE_SENDER_ID,
                url: data.audioFileUrl // URL to fetch audio file
            },
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'apiKey': apiKey
                }
            }
        );

        logger.info('Voice calls initiated:', response.data);

        return {
            provider: 'africastalking',
            status: 'initiated',
            entries: response.data.entries
        };
    } catch (error) {
        logger.error('Error initiating voice calls:', error);
        throw error;
    }
}