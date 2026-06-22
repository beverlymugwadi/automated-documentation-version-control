'use strict';

const ApiError = require('../utils/ApiError');

function errorHandler(err, req, res, next) {
  // If it's our own ApiError, use its status code and message
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  // For unexpected errors, log the details but don't expose them to the user
  console.error('Unexpected error:', err);
  return res.status(500).json({
    success: false,
    message: 'Something went wrong. Please try again.',
  });
}

module.exports = errorHandler;