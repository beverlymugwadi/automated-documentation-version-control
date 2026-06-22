'use strict';

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const env = require('./config/env');

const app = express();

// Allow requests from the React frontend
app.use(cors({ origin: env.clientOrigin, credentials: true }));

// Log every request to the terminal
app.use(morgan('dev'));

// Parse incoming JSON request bodies
app.use(express.json());

// Health check - confirms the server is running
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

module.exports = app;