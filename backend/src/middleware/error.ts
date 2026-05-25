import type { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';
import { env } from '../config/env';

interface ErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
    stack?: string;
  };
}

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  let apiErr: ApiError;

  // Multer upload errors (LIMIT_FILE_SIZE, LIMIT_FILE_COUNT, etc.)
  const multerCode = (err as { code?: string }).code;
  if (typeof multerCode === 'string' && (multerCode.startsWith('LIMIT_') || multerCode === 'LIMIT_FILE_TYPE')) {
    apiErr =
      multerCode === 'LIMIT_FILE_SIZE'
        ? ApiError.badRequest('File too large — max 5 MB per image')
        : multerCode === 'LIMIT_FILE_COUNT'
        ? ApiError.badRequest('Too many files — max 12 images per upload')
        : ApiError.badRequest(`Upload error: ${multerCode}`);
  } else if (err instanceof ApiError) {
    apiErr = err;
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    apiErr = mapPrismaError(err);
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    apiErr = ApiError.badRequest('Invalid query parameters');
  } else if (err instanceof SyntaxError && 'body' in err) {
    apiErr = ApiError.badRequest('Malformed JSON in request body');
  } else {
    apiErr = ApiError.internal(env.isProduction ? 'Internal server error' : (err as Error)?.message ?? 'Unknown error');
  }

  if (apiErr.statusCode >= 500) {
    logger.error({ err, path: req.originalUrl, method: req.method }, apiErr.message);
  } else {
    logger.warn({ code: apiErr.code, path: req.originalUrl, method: req.method }, apiErr.message);
  }

  const body: ErrorBody = {
    error: {
      code: apiErr.code,
      message: apiErr.message,
    },
  };
  if (apiErr.details !== undefined) body.error.details = apiErr.details;
  if (!env.isProduction && err instanceof Error) body.error.stack = err.stack;

  res.status(apiErr.statusCode).json(body);
}

function mapPrismaError(err: Prisma.PrismaClientKnownRequestError): ApiError {
  switch (err.code) {
    case 'P2002': {
      const target = (err.meta?.target as string[] | undefined)?.join(', ') ?? 'field';
      return ApiError.conflict(`A record with that ${target} already exists`, { target });
    }
    case 'P2003':
      return ApiError.badRequest('Foreign key constraint failed', { meta: err.meta });
    case 'P2025':
      return ApiError.notFound('Record not found');
    case 'P2014':
      return ApiError.badRequest('Invalid relation update');
    default:
      return ApiError.badRequest(`Database error: ${err.code}`, { meta: err.meta });
  }
}
