/**
 * Custom application error class
 * Allows throwing errors with an HTTP status code anywhere in the app
 *
 * Usage:
 *   throw new AppError('Not found', 404);
 *   return next(new AppError('Unauthorized', 401));
 */
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // distinguish from programming errors
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handler — must be registered LAST in Express
 */
const globalErrorHandler = (err, req, res, next) => {
  // Default values
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';

  // Prisma error handling
  if (err.code === 'P2002') {
    // Unique constraint violation
    const field = err.meta?.target?.join(', ') || 'field';
    statusCode = 409;
    message = `A record with this ${field} already exists.`;
  }

  if (err.code === 'P2025') {
    // Record not found
    statusCode = 404;
    message = 'Record not found.';
  }

  if (err.code === 'P2003') {
    // Foreign key constraint
    statusCode = 400;
    message = 'Related record not found.';
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token. Please log in again.';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Your session has expired. Please log in again.';
  }

  // Log unexpected errors in development
  if (process.env.NODE_ENV === 'development' && statusCode >= 500) {
    console.error('💥 ERROR:', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && statusCode >= 500 && { stack: err.stack }),
  });
};

module.exports = { AppError, globalErrorHandler };
