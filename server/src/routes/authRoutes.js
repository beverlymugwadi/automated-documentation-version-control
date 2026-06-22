'use strict';

const { Router } = require('express');
const { register, login } = require('../controllers/authController');
const validate = require('../middleware/validate');

const router = Router();

router.post('/register', validate(['fullName', 'email', 'password']), register);
router.post('/login', validate(['email', 'password']), login);

module.exports = router;