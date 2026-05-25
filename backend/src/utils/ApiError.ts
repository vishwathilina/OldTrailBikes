/**
 * Operational HTTP error. Anything thrown that is NOT an ApiError is treated
 * as a programmer error / unexpected failure by the global error handler.
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(statusCode: number, message: string, code = 'API_ERROR', details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace?.(this, this.constructor);
  }

  static badRequest(msg = 'Bad request', details?: unknown): ApiError {
    return new ApiError(400, msg, 'BAD_REQUEST', details);
  }

  static unauthorized(msg = 'Unauthorized'): ApiError {
    return new ApiError(401, msg, 'UNAUTHORIZED');
  }

  static forbidden(msg = 'Forbidden'): ApiError {
    return new ApiError(403, msg, 'FORBIDDEN');
  }

  static notFound(msg = 'Resource not found'): ApiError {
    return new ApiError(404, msg, 'NOT_FOUND');
  }

  static conflict(msg = 'Resource conflict', details?: unknown): ApiError {
    return new ApiError(409, msg, 'CONFLICT', details);
  }

  static unprocessable(msg = 'Unprocessable entity', details?: unknown): ApiError {
    return new ApiError(422, msg, 'UNPROCESSABLE_ENTITY', details);
  }

  static tooManyRequests(msg = 'Too many requests'): ApiError {
    return new ApiError(429, msg, 'TOO_MANY_REQUESTS');
  }

  static internal(msg = 'Internal server error'): ApiError {
    return new ApiError(500, msg, 'INTERNAL_ERROR');
  }
}
