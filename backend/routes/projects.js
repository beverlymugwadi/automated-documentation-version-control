// backend/routes/projects.js
const express = require('express');
const jwt = require('jsonwebtoken');
const Project = require('../models/Project');

const router = express.Router();

// Middleware to protect routes
const protect = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token.' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    req.userId = decoded.id;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Not authorized, invalid token.' });
  }
};

// GET /api/projects — get all projects for logged in user
router.get('/', protect, async (req, res) => {
  try {
    const projects = await Project.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.status(200).json(projects);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/projects — create a new project
router.post('/', protect, async (req, res) => {
  try {
    const { projectName, description, language } = req.body;

    if (!projectName) {
      return res.status(400).json({ message: 'Project name is required.' });
    }

    const project = await Project.create({
      projectName,
      description,
      language,
      userId: req.userId,
    });

    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;