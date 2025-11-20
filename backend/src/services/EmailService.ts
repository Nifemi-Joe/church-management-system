import { EmailRepository } from '@repositories/EmailRepository';
import { MemberRepository } from '@repositories/MemberRepository';
import { GroupRepository } from '@repositories/GroupRepository';
import { AppError } from '@utils/AppError';
import { SendEmailDTO, CommunicationFilters } from '@/types/communication.types';
import logger from '@config/logger';
import { sendEmailToProvider } from '@utils/emailProvider';

export class EmailService {
    private emailRepository: EmailRepository;
    private memberRepository: MemberRepository;
    private groupRepository: GroupRepository;

    constructor() {
        this.emailRepository = new EmailRepository();
        this.memberRepository = new MemberRepository();
        this.groupRepository = new GroupRepository();
    }

    async sendEmail(data: SendEmailDTO, userId: string) {
        try {
            const recipients = await this.resolveRecipients(data);

            if (recipients.length === 0) {
                throw new AppError('No recipients found', 400);
            }

            const emailRecord = await this.emailRepository.create({
                ...data,
                userId,
                recipients: recipients.map(r => r.email)
            });

            if (!data.scheduledAt) {
                this.processEmailSending(emailRecord.id, data, recipients);
            }

            logger.info(`Email service: Queued email ${emailRecord.id} for ${recipients.length} recipients`);

            return {
                id: emailRecord.id,
                recipientCount: recipients.length,
                status: data.scheduledAt ? 'scheduled' : 'processing'
            };
        } catch (error) {
            logger.error('Error in sendEmail service:', error);
            throw error;
        }
    }

    private async resolveRecipients(data: SendEmailDTO) {
        const recipients: Array<{ name: string; email: string }> = [];

        switch (data.destination) {
            case 'all_contacts':
                const allMembers = await this.memberRepository.findAll({
                    churchId: data.churchId,
                    limit: 10000
                });
                recipients.push(...allMembers.members
                    .filter(m => m.email)
                    .map(m => ({ name: `${m.firstName} ${m.lastName}`, email: m.email }))
                );
                break;

            case 'group':
                for (const groupId of data.recipients) {
                    const groupMembers = await this.groupRepository.getMembers(groupId, data.churchId);
                    recipients.push(...groupMembers
                        .filter(m => m.email)
                        .map(m => ({ name: `${m.first_name} ${m.last_name}`, email: m.email }))
                    );
                }
                break;

            case 'person':
                for (const memberId of data.recipients) {
                    const member = await this.memberRepository.findById(memberId, data.churchId);
                    if (member?.email) {
                        recipients.push({
                            name: `${member.firstName} ${member.lastName}`,
                            email: member.email
                        });
                    }
                }
                break;

            case 'email_list':
                recipients.push(...data.recipients.map(email => ({ name: 'Direct', email })));
                break;
        }

        return recipients;
    }

    private async processEmailSending(
        emailId: string,
        data: SendEmailDTO,
        recipients: Array<{ name: string; email: string }>
    ) {
        try {
            const deliveryInfo = await sendEmailToProvider({
                from: 'noreply@churchflow.com',
                subject: data.subject,
                body: data.body,
                recipients: recipients.map(r => r.email),
                attachments: data.attachments
            });

            await this.emailRepository.updateStatus(emailId, 'sent', deliveryInfo);
            logger.info(`Email service: Successfully sent email ${emailId}`);
        } catch (error) {
            logger.error(`Email service: Failed to send email ${emailId}:`, error);
            await this.emailRepository.updateStatus(emailId, 'failed', { error: error.message });
        }
    }

    async getEmailHistory(filters: CommunicationFilters) {
        try {
            return await this.emailRepository.findAll(filters);
        } catch (error) {
            logger.error('Error in getEmailHistory service:', error);
            throw error;
        }
    }
}
