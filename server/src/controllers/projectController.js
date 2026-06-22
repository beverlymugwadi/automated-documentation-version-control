'use strict';

const Project = require('../models/Project');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// Get all projects for the logged-in user
const getProjects = asyncHandler(async (req, res) => {
  const projects = await Project.find({ userId: req.user._id }).sort({
    createdAt: -1,
  });
  res.json({ success: true, projects });
});

// Create a new project
const createProject = asyncHandler(async (req, res) => {
  const { projectName, description } = req.body;
  const project = await Project.create({
    projectName,
    description,
    userId: req.user._id,
  });
  res.status(201).json({ success: true, project });
});

// Get a single project
const getProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) {
    throw new ApiError(404, 'Project not found.');
  }
  if (project.userId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Not authorised to access this project.');
  }
  res.json({ success: true, project });
});

// Delete a project
const deleteProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) {
    throw new ApiError(404, 'Project not found.');
  }
  if (project.userId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Not authorised to delete this project.');
  }
  await project.deleteOne();
  res.json({ success: true, message: 'Project deleted.' });
});

module.exports = { getProjects, createProject, getProject, deleteProject };