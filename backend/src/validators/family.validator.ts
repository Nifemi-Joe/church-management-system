import Joi from 'joi';

export const createFamilySchema = Joi.object({
    name: Joi.string()
        .required()
        .min(2)
        .max(255)
        .messages({
            'string.empty': 'Family name is required',
            'string.min': 'Family name must be at least 2 characters',
            'string.max': 'Family name must not exceed 255 characters'
        }),
    fatherId: Joi.string()
        .uuid()
        .optional()
        .allow(null),
    motherId: Joi.string()
        .uuid()
        .optional()
        .allow(null),
    email: Joi.string()
        .email()
        .optional()
        .allow(null, ''),
    phone: Joi.string()
        .optional()
        .allow(null, '')
        .pattern(/^[+]?[\d\s-()]+$/)
        .messages({
            'string.pattern.base': 'Invalid phone number format'
        }),
    address: Joi.string()
        .optional()
        .allow(null, '')
        .max(500),
    wardIds: Joi.array()
        .items(Joi.string().uuid())
        .optional()
});

export const updateFamilySchema = Joi.object({
    name: Joi.string()
        .min(2)
        .max(255)
        .optional(),
    fatherId: Joi.string()
        .uuid()
        .optional()
        .allow(null),
    motherId: Joi.string()
        .uuid()
        .optional()
        .allow(null),
    email: Joi.string()
        .email()
        .optional()
        .allow(null, ''),
    phone: Joi.string()
        .optional()
        .allow(null, '')
        .pattern(/^[+]?[\d\s-()]+$/),
    address: Joi.string()
        .optional()
        .allow(null, '')
        .max(500),
    wardIds: Joi.array()
        .items(Joi.string().uuid())
        .optional()
});
