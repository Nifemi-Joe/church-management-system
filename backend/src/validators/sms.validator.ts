import Joi from 'joi';

export const sendSMSSchema = Joi.object({
    destination: Joi.string()
        .valid('all_contacts', 'group', 'person', 'phone_numbers', 'upload')
        .required(),
    recipients: Joi.array()
        .items(Joi.string())
        .min(1)
        .required(),
    senderId: Joi.string()
        .required()
        .messages({
            'string.empty': 'Sender ID is required'
        }),
    message: Joi.string()
        .required()
        .min(1)
        .max(1000)
        .messages({
            'string.empty': 'Message is required',
            'string.max': 'Message must not exceed 1000 characters'
        }),
    scheduledAt: Joi.date()
        .optional()
        .min('now')
});
