'use strict';

const { Router } = require('express');
const authRoutes = require('./authRoutes');
const projectRoutes = require('./projectRoutes');
const docRoutes = require('./docRoutes');

const router = Router();

router.use('/auth', authRoutes);
router.use('/projects', projectRoutes);
router.use('/docs', docRoutes);

module.exports = router;