import Joi from 'joi';

export const createMemberSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).required()
    .messages({
      'string.empty': 'First name is required',
      'string.min': 'First name must be at least 2 characters',
      'string.max': 'First name cannot exceed 50 characters'
    }),
  
  lastName: Joi.string().min(2).max(50).required()
    .messages({
      'string.empty': 'Last name is required',
      'string.min': 'Last name must be at least 2 characters',
      'string.max': 'Last name cannot exceed 50 characters'
    }),
  
  email: Joi.string().email().optional().allow('', null)
    .messages({
      'string.email': 'Please provide a valid email address'
    }),
  
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional().allow('', null)
    .messages({
      'string.pattern.base': 'Please provide a valid phone number'
    }),
  
  gender: Joi.string().valid('male', 'female', 'other').optional().allow('', null),
  
  maritalStatus: Joi.string().valid('single', 'married', 'divorced', 'widowed').optional().allow('', null),
  
  dateOfBirth: Joi.date().max('now').optional().allow(null)
    .messages({
      'date.max': 'Date of birth cannot be in the future'
    }),
  
  address: Joi.string().max(200).optional().allow('', null),
  city: Joi.string().max(100).optional().allow('', null),
  state: Joi.string().max(100).optional().allow('', null),
  country: Joi.string().max(100).optional().allow('', null),
  postalCode: Joi.string().max(20).optional().allow('', null),
  
  registrationType: Joi.string().valid('manual', 'qr_code', 'import').optional(),
  status: Joi.string().valid('active', 'inactive', 'suspended').optional()
});

export const updateMemberSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).optional(),
  lastName: Joi.string().min(2).max(50).optional(),
  email: Joi.string().email().optional().allow('', null),
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional().allow('', null),
  gender: Joi.string().valid('male', 'female', 'other').optional().allow('', null),
  maritalStatus: Joi.string().valid('single', 'married', 'divorced', 'widowed').optional().allow('', null),
  dateOfBirth: Joi.date().max('now').optional().allow(null),
  address: Joi.string().max(200).optional().allow('', null),
  city: Joi.string().max(100).optional().allow('', null),
  state: Joi.string().max(100).optional().allow('', null),
  country: Joi.string().max(100).optional().allow('', null),
  postalCode: Joi.string().max(20).optional().allow('', null),
  status: Joi.string().valid('active', 'inactive', 'suspended').optional()
}).min(1);
