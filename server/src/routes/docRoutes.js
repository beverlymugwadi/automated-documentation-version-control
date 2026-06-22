'use strict';

const { Router } = require('express');
const {
  previewDoc,
  createDoc,
  getDocs,
  getDoc,
  updateDoc,
} = require('../controllers/docController');
const protect = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = Router();

router.use(protect);

router.post('/preview', validate(['notes']), previewDoc);
router.post('/', validate(['projectId', 'title', 'notes']), createDoc);
router.get('/', getDocs);
router.get('/:docId', getDoc);
router.put('/:docId', validate(['content']), updateDoc);

module.exports = router;