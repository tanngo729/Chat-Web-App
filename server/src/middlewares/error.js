export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: errors
      }
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      ok: false,
      error: {
        code: 'DUPLICATE_ERROR',
        message: `${field} already exists`
      }
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      ok: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid token'
      }
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      ok: false,
      error: {
        code: 'TOKEN_EXPIRED',
        message: 'Token expired'
      }
    });
  }

  // Default error
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    ok: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'Internal server error'
    }
  });
};

export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};