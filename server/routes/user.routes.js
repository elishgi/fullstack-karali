// יצירת ראוטר חדש ויוצר נתיבים חדשים לפי מה שמייבא

const express = require('express');
const router = express.Router();
const { signup, login, deleteAccount, resetAccount } = require('../controllers/user.controller');
const auth = require('../middleware/auth');

//רישום משתמש חדש
router.post('/signup', signup);
//התחברות משתמש קיים
router.post('/login', login);

// מחיקת חשבון כולל כל הנתונים
router.delete('/account', auth, deleteAccount);

// איפוס חשבון – מוחק אירועים ותיעודים בלבד
router.post('/account/reset', auth, resetAccount);

module.exports = router;