'use strict';

const User = require('../models/User');
const { verifyToken } = require('../utils/token');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const protect = asyncHandler(async (req, res, next) => {
  // Check for token in Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'Not authorised. No token provided.');
  }

  // Extract and verify the token
  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);

  // Find the user and attach to request
  const user = await User.findById(decoded.id);
  if (!user) {
    throw new ApiError(401, 'Not authorised. User no longer exists.');
  }

  req.user = user;
  next();
});

module.exports = protect;