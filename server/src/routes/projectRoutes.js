'use strict';

const { Router } = require('express');
const {
  getProjects,
  createProject,
  getProject,
  deleteProject,
} = require('../controllers/projectController');
const protect = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = Router();

router.use(protect);

router.get('/', getProjects);
router.post('/', validate(['projectName']), createProject);
router.get('/:id', getProject);
router.delete('/:id', deleteProject);

module.exports = router;