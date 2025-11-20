import Joi from 'joi';

export const registerSchema = Joi.object({
  churchId: Joi.string().uuid().required()
    .messages({
      'string.empty': 'Church ID is required',
      'string.uuid': 'Invalid church ID format'
    }),
  
  email: Joi.string().email().required()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Please provide a valid email address'
    }),
  
  password: Joi.string().min(8).required()
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .messages({
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 8 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    }),
  
  firstName: Joi.string().min(2).max(50).required()
    .messages({
      'string.empty': 'First name is required',
      'string.min': 'First name must be at least 2 characters'
    }),
  
  lastName: Joi.string().min(2).max(50).required()
    .messages({
      'string.empty': 'Last name is required',
      'string.min': 'Last name must be at least 2 characters'
    }),
  
  role: Joi.string().valid('admin', 'staff', 'member').optional()
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Please provide a valid email address'
    }),
  
  password: Joi.string().required()
    .messages({
      'string.empty': 'Password is required'
    })
});
