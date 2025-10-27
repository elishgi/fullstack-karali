// יצירת ראוטר חדש ויוצר נתיבים חדשים לפי מה שמייבא

const express = require('express');
const router = express.Router();
const {
  signup,
  login,
  googleAuth,
  forgotPassword,
  resetPassword,
  deleteAccount,
  resetAccount,
  updateAccount,
} = require('../controllers/user.controller');
const auth = require('../middleware/auth');

//רישום משתמש חדש
router.post('/signup', signup);
//התחברות משתמש קיים
router.post('/login', login);

// התחברות/הרשמה חכמה באמצעות Google
router.post('/auth/google', googleAuth);

// תהליך שחזור סיסמה
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// מחיקת חשבון כולל כל הנתונים
router.delete('/account', auth, deleteAccount);

// איפוס חשבון – מוחק אירועים ותיעודים בלבד
router.post('/account/reset', auth, resetAccount);

// עדכון פרטי חשבון משתמש מחובר (נתיב חדש + תאימות לאחור)
router.put('/account', auth, updateAccount);
router.put('/me', auth, updateAccount);

module.exports = router;
