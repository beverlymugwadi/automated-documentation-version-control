'use strict';

const User = require('../models/User');
const { signToken } = require('../utils/token');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const register = asyncHandler(async (req, res) => {
  const { fullName, email, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    throw new ApiError(409, 'An account with that email already exists.');
  }

  const user = await User.create({ fullName, email, password });
  const token = signToken(user._id);

  res.status(201).json({
    success: true,
    token,
    user: user.toJSON(),
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  const token = signToken(user._id);

  res.json({
    success: true,
    token,
    user: user.toJSON(),
  });
});

module.exports = { register, login };