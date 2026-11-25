import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import env from '../config/env.js';
import { AppError } from '../utils/errors.js';

export function notFoundHandler(req, res) {
  return res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`,
    },
  });
}

export function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    const response = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    };
    if (err.details) {
      response.error.details = err.details;
    }
    return res.status(err.statusCode).json(response);
  }

  if (err instanceof ZodError) {
    return res.status(422).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: err.errors.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      },
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : 'field';
      return res.status(409).json({
        success: false,
        error: {
          code: 'CONFLICT',
          message: `A record with this ${target} already exists`,
        },
      });
    }
    if (err.code === 'P2003') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REFERENCE',
          message: 'Referenced record does not exist or cannot be removed',
        },
      });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Requested record was not found',
        },
      });
    }
  }

  if (err?.name === 'JsonWebTokenError' || err?.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: err.name === 'TokenExpiredError' ? 'Authentication token expired' : 'Invalid authentication token',
      },
    });
  }

  if (err?.message?.startsWith('CORS:')) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'CORS_FORBIDDEN',
        message: 'Origin not allowed by CORS policy',
      },
    });
  }

  if (!env.isProduction && !env.isTest) {
    console.error('[Unhandled Error]', err);
  } else if (env.isProduction) {
    console.error('[Unhandled Error]', err?.message || 'Unknown error');
  }

  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected server error occurred',
    },
  });
}
