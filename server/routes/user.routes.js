// יצירת ראוטר חדש ויוצר נתיבים חדשים לפי מה שמייבא

const express = require('express');
const router = express.Router();
const { signup, login } = require('../controllers/user.controller');

//רישום משתמש חדש
router.post('/signup', signup);
//התחברות משתמש קיים
router.post('/login', login);

module.exports = router;