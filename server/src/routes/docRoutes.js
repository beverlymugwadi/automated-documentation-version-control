'use strict';

const { Router } = require('express');
const {
  previewDoc,
  createDoc,
  getDocs,
  getDoc,
  updateDoc,
} = require('../controllers/docController');
const {
  getVersions,
  getVersion,
  getDiff,
  rollback,
} = require('../controllers/versionController');
const protect = require('../middleware/auth');
const validate = require('../middleware/validate');
const { exportDocument } = require('../controllers/docController');

const router = Router();

router.use(protect);

router.post('/preview', validate(['notes']), previewDoc);
router.post('/', validate(['projectId', 'title', 'notes']), createDoc);
router.get('/', getDocs);
router.get('/:docId', getDoc);
router.put('/:docId', validate(['content']), updateDoc);

// Version routes
router.get('/:docId/versions', getVersions);
router.get('/:docId/versions/:versionId', getVersion);
router.get('/:docId/diff', getDiff);
router.post('/:docId/rollback/:versionId', rollback);
router.get('/:docId/export', exportDocument);

module.exports = router;