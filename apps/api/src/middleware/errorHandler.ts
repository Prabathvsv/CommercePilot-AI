import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { logger } from '../config/logger.js';
import { AppError } from '../utils/errors.js';

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  // Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: 'VALIDATION_ERROR',
      details: err.flatten(),
    });
    return;
  }

  // Prisma known errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({ success: false, message: 'Unique constraint violation', error: err.code });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({ success: false, message: 'Record not found', error: err.code });
      return;
    }
  }

  // Our operational errors
  if (err instanceof AppError) {
    const payload: Record<string, unknown> = {
      success: false,
      message: err.message,
      error: err.name,
    };
    if ('details' in err && err.details !== undefined) payload.details = err.details;
    res.status(err.statusCode).json(payload);
    return;
  }

  logger.error('Unhandled error', { path: req.path, error: err });
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: 'INTERNAL_ERROR',
  });
}
