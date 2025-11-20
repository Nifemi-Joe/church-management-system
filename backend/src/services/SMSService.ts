import { SMSRepository } from '@repositories/SMSRepository';
import { MemberRepository } from '@repositories/MemberRepository';
import { GroupRepository } from '@repositories/GroupRepository';
import { AppError } from '@utils/AppError';
import { SendSMSDTO, CommunicationFilters } from '@/types/communication.types';
import logger from '@config/logger';
import { sendSMSToProvider } from '@utils/smsProvider';

export class SMSService {
    private smsRepository: SMSRepository;
    private memberRepository: MemberRepository;
    private groupRepository: GroupRepository;

    constructor() {
        this.smsRepository = new SMSRepository();
        this.memberRepository = new MemberRepository();
        this.groupRepository = new GroupRepository();
    }

    async sendSMS(data: SendSMSDTO, userId: string) {
        try {
            // Resolve recipients based on destination type
            const recipients = await this.resolveRecipients(data);

            if (recipients.length === 0) {
                throw new AppError('No recipients found', 400);
            }

            // Calculate units needed (1 unit per 160 characters per recipient)
            const messagePages = Math.ceil(data.message.length / 160);
            const unitsNeeded = recipients.length * messagePages;

            // Check balance
            const balance = await this.smsRepository.getBalance(data.churchId);
            if (balance < unitsNeeded) {
                throw new AppError('Insufficient SMS balance', 402);
            }

            // Deduct balance
            await this.smsRepository.deductBalance(data.churchId, unitsNeeded);

            // Save SMS record
            const smsRecord = await this.smsRepository.create({
                ...data,
                userId,
                recipients: recipients.map(r => r.phone),
                unitsUsed: unitsNeeded
            });

            // Send SMS (async - don't wait)
            if (!data.scheduledAt) {
                this.processSMSSending(smsRecord.id, data, recipients);
            }

            logger.info(`SMS service: Queued SMS ${smsRecord.id} for ${recipients.length} recipients`);

            return {
                id: smsRecord.id,
                recipientCount: recipients.length,
                unitsUsed: unitsNeeded,
                status: data.scheduledAt ? 'scheduled' : 'processing'
            };
        } catch (error) {
            logger.error('Error in sendSMS service:', error);
            throw error;
        }
    }

    private async resolveRecipients(data: SendSMSDTO) {
        const recipients: Array<{ name: string; phone: string }> = [];

        switch (data.destination) {
            case 'all_contacts':
                const allMembers = await this.memberRepository.findAll({
                    churchId: data.churchId,
                    limit: 10000
                });
                recipients.push(...allMembers.members
                    .filter(m => m.phone)
                    .map(m => ({ name: `${m.firstName} ${m.lastName}`, phone: m.phone }))
                );
                break;

            case 'group':
                for (const groupId of data.recipients) {
                    const groupMembers = await this.groupRepository.getMembers(groupId, data.churchId);
                    recipients.push(...groupMembers
                        .filter(m => m.phone)
                        .map(m => ({ name: `${m.first_name} ${m.last_name}`, phone: m.phone }))
                    );
                }
                break;

            case 'person':
                for (const memberId of data.recipients) {
                    const member = await this.memberRepository.findById(memberId, data.churchId);
                    if (member?.phone) {
                        recipients.push({
                            name: `${member.firstName} ${member.lastName}`,
                            phone: member.phone
                        });
                    }
                }
                break;

            case 'phone_numbers':
                recipients.push(...data.recipients.map(phone => ({ name: 'Direct', phone })));
                break;

            default:
                throw new AppError('Invalid destination type', 400);
        }

        return recipients;
    }

    private async processSMSSending(
        smsId: string,
        data: SendSMSDTO,
        recipients: Array<{ name: string; phone: string }>
    ) {
        try {
            // Personalize message with #name# placeholder
            const messages = recipients.map(recipient => ({
                phone: recipient.phone,
                message: data.message.replace(/#name#/g, recipient.name)
            }));

            // Send via SMS provider (e.g., Twilio, Africa's Talking)
            const deliveryInfo = await sendSMSToProvider({
                senderId: data.senderId,
                messages
            });

            // Update status
            await this.smsRepository.updateStatus(smsId, 'sent', deliveryInfo);

            logger.info(`SMS service: Successfully sent SMS ${smsId}`);
        } catch (error) {
            logger.error(`SMS service: Failed to send SMS ${smsId}:`, error);
            await this.smsRepository.updateStatus(smsId, 'failed', { error: error.message });
        }
    }

    async getSMSHistory(filters: CommunicationFilters) {
        try {
            return await this.smsRepository.findAll(filters);
        } catch (error) {
            logger.error('Error in getSMSHistory service:', error);
            throw error;
        }
    }

    async getSMSById(id: string, churchId: string) {
        try {
            const sms = await this.smsRepository.findById(id, churchId);
            if (!sms) {
                throw new AppError('SMS not found', 404);
            }
            return sms;
        } catch (error) {
            logger.error('Error in getSMSById service:', error);
            throw error;
        }
    }

    async getBalance(churchId: string) {
        try {
            return await this.smsRepository.getBalance(churchId);
        } catch (error) {
            logger.error('Error in getBalance service:', error);
            throw error;
        }
    }
}