import { VoiceRepository } from '@repositories/VoiceRepository';
import { MemberRepository } from '@repositories/MemberRepository';
import { AppError } from '@utils/AppError';
import { SendVoiceDTO, CommunicationFilters } from '@/types/communication.types';
import logger from '@config/logger';
import { sendVoiceCallToProvider } from '@utils/voiceProvider';

export class VoiceService {
    private voiceRepository: VoiceRepository;
    private memberRepository: MemberRepository;

    constructor() {
        this.voiceRepository = new VoiceRepository();
        this.memberRepository = new MemberRepository();
    }

    async sendVoiceCall(data: SendVoiceDTO, userId: string) {
        try {
            const balance = await this.voiceRepository.getBalance(data.churchId);
            const unitsNeeded = data.recipients.length;

            if (balance < unitsNeeded) {
                throw new AppError('Insufficient voice call balance', 402);
            }

            await this.voiceRepository.deductBalance(data.churchId, unitsNeeded);

            const voiceRecord = await this.voiceRepository.create({
                ...data,
                userId,
                unitsUsed: unitsNeeded
            });

            if (!data.scheduledAt) {
                this.processVoiceCalling(voiceRecord.id, data);
            }

            return {
                id: voiceRecord.id,
                recipientCount: data.recipients.length,
                unitsUsed: unitsNeeded,
                status: data.scheduledAt ? 'scheduled' : 'processing'
            };
        } catch (error) {
            logger.error('Error in sendVoiceCall service:', error);
            throw error;
        }
    }

    private async processVoiceCalling(voiceId: string, data: SendVoiceDTO) {
        try {
            const deliveryInfo = await sendVoiceCallToProvider({
                audioFileUrl: data.audioFileUrl,
                recipients: data.recipients
            });

            await this.voiceRepository.updateStatus(voiceId, 'completed', deliveryInfo);
        } catch (error) {
            await this.voiceRepository.updateStatus(voiceId, 'failed', { error: error.message });
        }
    }

    async getVoiceHistory(filters: CommunicationFilters) {
        return await this.voiceRepository.findAll(filters);
    }

    async getBalance(churchId: string) {
        return await this.voiceRepository.getBalance(churchId);
    }
}