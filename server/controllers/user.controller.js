const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

const sanitizeUser = (user) => ({
  _id: user._id,
  username: user.username,
  email: user.email,
  friendCode: user.friendCode,
  createdAt: user.createdAt,
});

const signup = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'חסרים פרטים לרישום' });
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(409).json({ message: 'אימייל זה כבר נמצא בשימוש' });
    }

    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(409).json({ message: 'שם משתמש זה תפוס' });
    }

    const user = new User({
      username,
      email,
      passwordHash: password,
    });
    await user.save();

    const token = jwt.sign({ _id: user._id }, JWT_SECRET, { expiresIn: '14d' });

    return res.status(201).json({ token, user: sanitizeUser(user) });
  } catch (err) {
    return res.status(500).json({ message: 'שגיאה בעת יצירת המשתמש', details: err.message });
  }
};

const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ message: 'נא להזין שם משתמש/אימייל וסיסמה' });
    }

    const user = await User.findOne({
      $or: [
        { email: identifier },
        { username: identifier },
        { friendCode: identifier.toUpperCase?.() },
      ],
    });

    if (!user) {
      return res.status(401).json({ message: 'משתמש לא נמצא' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'פרטי התחברות שגויים' });
    }

    const token = jwt.sign({ _id: user._id }, JWT_SECRET, { expiresIn: '14d' });
    return res.json({ token, user: sanitizeUser(user) });
  } catch (err) {
    return res.status(500).json({ message: 'שגיאה בהתחברות' });
  }
};

const searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || query.trim().length < 2) {
      return res.status(400).json({ message: 'חיפוש מחייב לפחות שני תווים' });
    }

    const regex = new RegExp(query.trim(), 'i');
    const users = await User.find({
      $or: [
        { username: regex },
        { friendCode: query.trim().toUpperCase() },
      ],
      _id: { $ne: req.userId },
    })
      .limit(10)
      .lean();

    return res.json(users.map(sanitizeUser));
  } catch (err) {
    return res.status(500).json({ message: 'שגיאה בחיפוש משתמשים' });
  }
};

module.exports = { signup, login, searchUsers };
