'use strict';

const Documentation = require('../models/Documentation');
const DocVersion = require('../models/DocVersion');
const { generateDoc } = require('../services/docGenerator');
const { commitVersion } = require('../services/versionControl');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// Preview generated documentation without saving
const previewDoc = asyncHandler(async (req, res) => {
  const { title, notes, code } = req.body;

  let result;
  try {
    result = generateDoc({ title, notes, code });
  } catch (err) {
    if (err.code === 'AST_PARSE_ERROR') {
      throw new ApiError(400, err.message);
    }
    throw err;
  }

  res.json({ success: true, ...result });
});

// Save a new documentation document
const createDoc = asyncHandler(async (req, res) => {
  const { projectId, title, notes, code, changeMessage } = req.body;

  let result;
  try {
    result = generateDoc({ title, notes, code });
  } catch (err) {
    if (err.code === 'AST_PARSE_ERROR') {
      throw new ApiError(400, err.message);
    }
    throw err;
  }

  const doc = await Documentation.create({
    projectId,
    userId: req.user._id,
    title: title || 'Untitled Documentation',
    content: result.markdown,
    structured: result.structure,
    currentVersion: 1,
  });

  const { commitHash } = await commitVersion(
    doc._id,
    result.markdown,
    changeMessage || 'Initial documentation'
  );

  await DocVersion.create({
    docId: doc._id,
    userId: req.user._id,
    versionNumber: 1,
    content: result.markdown,
    commitHash,
    changeMessage: changeMessage || 'Initial documentation',
  });

  res.status(201).json({ success: true, doc });
});

// Get all docs for a project
const getDocs = asyncHandler(async (req, res) => {
  const { projectId } = req.query;
  if (!projectId) throw new ApiError(400, 'projectId is required.');

  const docs = await Documentation.find({
    projectId,
    userId: req.user._id,
  }).sort({ updatedAt: -1 });

  res.json({ success: true, docs });
});

// Get a single doc
const getDoc = asyncHandler(async (req, res) => {
  const doc = await Documentation.findById(req.params.docId);
  if (!doc) throw new ApiError(404, 'Documentation not found.');
  if (doc.userId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Not authorised.');
  }
  res.json({ success: true, doc });
});

// Update a doc (save new version)
const updateDoc = asyncHandler(async (req, res) => {
  const { content, changeMessage } = req.body;

  const doc = await Documentation.findById(req.params.docId);
  if (!doc) throw new ApiError(404, 'Documentation not found.');
  if (doc.userId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Not authorised.');
  }

  doc.content = content;
  doc.currentVersion += 1;
  await doc.save();

  const { commitHash } = await commitVersion(
    doc._id,
    content,
    changeMessage || 'Updated documentation'
  );

  await DocVersion.create({
    docId: doc._id,
    userId: req.user._id,
    versionNumber: doc.currentVersion,
    content,
    commitHash,
    changeMessage: changeMessage || 'Updated documentation',
  });

  res.json({ success: true, doc });
});

const { exportDoc } = require('../services/exporters');

const exportDocument = asyncHandler(async (req, res) => {
  const { format = 'markdown' } = req.query;

  const doc = await Documentation.findById(req.params.docId);
  if (!doc) throw new ApiError(404, 'Documentation not found.');
  if (doc.userId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Not authorised.');
  }

  await exportDoc(format, doc, res);
});

module.exports = { previewDoc, createDoc, getDocs, getDoc, updateDoc, exportDocument };