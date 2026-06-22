'use strict';

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const env = require('./config/env');
const errorHandler = require('./middleware/errorHandler');
const routes = require('./routes');

const app = express();

app.use(cors({ origin: env.clientOrigin, credentials: true }));
app.use(morgan('dev'));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// All API routes
app.use('/api', routes);

// Must be last
app.use(errorHandler);

module.exports = app;