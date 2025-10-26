const express = require('express');
const { signup, login, searchUsers } = require('../controllers/user.controller');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.get('/search', auth, searchUsers);

module.exports = router;
