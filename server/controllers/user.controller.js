const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

// מקבל את נתוני הבקשה, בודק אם קיים אימייל כזה, ויוצר משתמש חדש 

const signup = async (req, res) => {
  try {
    const name = req.body?.name?.trim();
    const email = req.body?.email?.trim().toLowerCase();
    const password = req.body?.password;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'אנא מלא את כל השדות' });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'אימייל זה כבר נמצא בשימוש' });

    const user = new User({ name, email, password });
    await user.save();

    const token = jwt.sign({ _id: user._id }, JWT_SECRET);
    res.status(201).json({ token, user: { _id: user._id, name: user.name } });
  } catch (err) {
    res.status(500).json({ message: 'שגיאה בעת יצירת המשתמש' });
  }
};

// מקבל אימייל וסיסמה, מאמת את המשתמש ומחזיר טוקן
// user.controller.js

const login = async (req, res) => {
  try {
    const identifier = req.body?.identifier?.trim();
    const password = req.body?.password;

    if (!identifier || !password) {
      return res.status(400).json({ message: 'אנא מלא אימייל/שם משתמש וסיסמה' });
    }

    const normalizedIdentifier = identifier.toLowerCase();
    // identifier יכול להיות או אימייל או שם משתמש

    const user = await User.findOne({
      $or: [{ email: normalizedIdentifier }, { name: identifier }]
    });

    if (!user) return res.status(401).json({ message: 'משתמש לא נמצא' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: 'פרטי התחברות שגויים' });

    const token = jwt.sign({ _id: user._id }, JWT_SECRET);
    res.json({ token, user: { _id: user._id, name: user.name } });
  } catch (err) {
    res.status(500).json({ message: 'שגיאה בהתחברות' });
  }
};


module.exports = { signup, login };