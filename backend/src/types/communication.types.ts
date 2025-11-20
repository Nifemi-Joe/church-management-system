export interface SendSMSDTO {
    churchId: string;
    destination: 'all_contacts' | 'group' | 'person' | 'phone_numbers' | 'upload';
    recipients: string[];
    senderId: string;
    message: string;
    scheduledAt?: Date;
}

export interface SendEmailDTO {
    churchId: string;
    destination: 'all_contacts' | 'group' | 'person' | 'email_list';
    recipients: string[];
    subject: string;
    body: string;
    attachments?: string[];
    scheduledAt?: Date;
}

export interface SendVoiceDTO {
    churchId: string;
    recipients: string[];
    audioFileUrl: string;
    scheduledAt?: Date;
}

export interface CommunicationFilters {
    churchId: string;
    type?: 'sms' | 'email' | 'voice';
    status?: 'pending' | 'sent' | 'failed';
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
}
