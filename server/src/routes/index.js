'use strict';

const { Router } = require('express');
const authRoutes = require('./authRoutes');
const projectRoutes = require('./projectRoutes');

const router = Router();

router.use('/auth', authRoutes);
router.use('/projects', projectRoutes);

module.exports = router;