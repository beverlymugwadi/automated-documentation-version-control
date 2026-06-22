'use strict';

const DocVersion = require('../models/DocVersion');
const Documentation = require('../models/Documentation');
const { readAtCommit, diffCommits } = require('../services/versionControl');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// Get all versions for a document
const getVersions = asyncHandler(async (req, res) => {
  const doc = await Documentation.findById(req.params.docId);
  if (!doc) throw new ApiError(404, 'Documentation not found.');
  if (doc.userId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Not authorised.');
  }

  const versions = await DocVersion.find({ docId: req.params.docId })
    .sort({ versionNumber: -1 });

  res.json({ success: true, versions });
});

// Get content of a specific version
const getVersion = asyncHandler(async (req, res) => {
  const version = await DocVersion.findById(req.params.versionId);
  if (!version) throw new ApiError(404, 'Version not found.');

  const doc = await Documentation.findById(version.docId);
  if (!doc) throw new ApiError(404, 'Documentation not found.');
  if (doc.userId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Not authorised.');
  }

  // Read content from Git at that commit hash
  const content = await readAtCommit(version.docId, version.commitHash);

  res.json({ success: true, version, content });
});

// Get diff between two versions
const getDiff = asyncHandler(async (req, res) => {
  const { v1, v2 } = req.query;
  if (!v1 || !v2) throw new ApiError(400, 'v1 and v2 commit hashes are required.');

  const doc = await Documentation.findById(req.params.docId);
  if (!doc) throw new ApiError(404, 'Documentation not found.');
  if (doc.userId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Not authorised.');
  }

  const hunks = await diffCommits(req.params.docId, v1, v2);
  res.json({ success: true, hunks });
});

// Rollback to a previous version
const rollback = asyncHandler(async (req, res) => {
  const version = await DocVersion.findById(req.params.versionId);
  if (!version) throw new ApiError(404, 'Version not found.');

  const doc = await Documentation.findById(version.docId);
  if (!doc) throw new ApiError(404, 'Documentation not found.');
  if (doc.userId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Not authorised.');
  }

  // Read content from Git at that commit
  const content = await readAtCommit(version.docId, version.commitHash);

  // Save as a new version (rollback never deletes history)
  const { commitVersion } = require('../services/versionControl');
  doc.content = content;
  doc.currentVersion += 1;
  await doc.save();

  const { commitHash } = await commitVersion(
    doc._id,
    content,
    `Rollback to version ${version.versionNumber}`
  );

  const newVersion = await DocVersion.create({
    docId: doc._id,
    userId: req.user._id,
    versionNumber: doc.currentVersion,
    content,
    commitHash,
    changeMessage: `Rollback to version ${version.versionNumber}`,
  });

  res.json({ success: true, doc, version: newVersion });
});

module.exports = { getVersions, getVersion, getDiff, rollback };