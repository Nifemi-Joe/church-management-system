import { Response } from 'express';

export const successResponse = (
  res: Response,
  data: any,
  message: string = 'Success',
  statusCode: number = 200
): void => {
  res.status(statusCode).json({
    status: 'success',
    message,
    data
  });
};

export const errorResponse = (
  res: Response,
  message: string = 'Error occurred',
  statusCode: number = 500,
  errors?: any
): void => {
  res.status(statusCode).json({
    status: 'error',
    message,
    ...(errors && { errors })
  });
};
