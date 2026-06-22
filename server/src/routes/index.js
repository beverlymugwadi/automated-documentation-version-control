'use strict';

const { Router } = require('express');
const authRoutes = require('./authRoutes');

const router = Router();

router.use('/auth', authRoutes);

module.exports = router;