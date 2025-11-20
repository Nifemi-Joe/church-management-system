import { Request, Response, NextFunction } from 'express';
import { AppError } from '@utils/AppError';
import logger from '@config/logger';

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err instanceof AppError) {
    logger.error(`${err.statusCode} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
    
    res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
    return;
  }

  // Handle Joi validation errors
  if (err.name === 'ValidationError') {
    logger.error(`Validation Error: ${err.message}`);
    res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      details: err.message
    });
    return;
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    logger.error(`JWT Error: ${err.message}`);
    res.status(401).json({
      status: 'error',
      message: 'Invalid token'
    });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    logger.error(`JWT Expired: ${err.message}`);
    res.status(401).json({
      status: 'error',
      message: 'Token expired'
    });
    return;
  }

  // Default error
  logger.error(`500 - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  logger.error(err.stack);

  res.status(500).json({
    status: 'error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
