// middleware/errorHandler.js

/**
 * Global Error Handling Middleware for FleetOS
 * Catches all operational and unexpected errors across the application pipeline
 */
const errorHandler = (err, req, res, next) => {
  // Establish baseline properties, default to 500 Internal Server Error
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  console.error(`❌ [FleetOS Engine Error]: ${message}`);
  if (err.stack && process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  // Handle Mongoose Bad ObjectId cast errors (e.g., searching an invalid vehicle ID format)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Resource not found with id of ${err.value}`;
  }

  // Handle Mongoose Validation validation failures (e.g., missing required vehicle fields)
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map(val => val.message).join(', ');
  }

  // Handle MongoDB Duplicate Key errors (e.g., trying to register an existing VIN or Plate Number)
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue || {});
    message = `Duplicate field value entered: ${field.join(', ')}. Must be unique.`;
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Not authorized, token validation failed';
  }

  // Send uniform JSON response back to our frontend layout
  res.status(statusCode).json({
    success: false,
    message,
    // Provide stack traces only when building locally to preserve production security
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

export default errorHandler;