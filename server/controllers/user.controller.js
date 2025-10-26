const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';


const signup = async (req, res) => {
  try {
    let { username, email, password } = req.body;

    username = (username || '').trim();
    email = (email || '').trim().toLowerCase();
    password = (password || '').trim();

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'יש למלא את כל השדות' });
    }

    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ message: 'שם המשתמש כבר תפוס' });
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: 'אימייל זה כבר בשימוש' });
    }

    const user = new User({ username, email, password });
    await user.save();

    const token = jwt.sign({ _id: user._id }, JWT_SECRET);
    return res.status(201).json({
      token,
      user: { _id: user._id, username: user.username, email: user.email },
    });
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ message: 'שגיאה בעת יצירת המשתמש' });
  }
};



const login = async (req, res) => {
  try {
    let { identifier, password } = req.body;
    identifier = (identifier || '').trim();
    password = (password || '').trim();

    if (!identifier || !password) {
      return res.status(400).json({ message: 'יש למלא אימייל/שם משתמש וסיסמה' });
    }

    // אם יש '@' נאבחן כאימייל (נוריד ל-lowercase); אחרת — username בדיוק כפי שהוזן
    const looksLikeEmail = identifier.includes('@');
    const exactQuery = looksLikeEmail
      ? { email: identifier.toLowerCase() }
      : { username: identifier };


    let user = await User.findOne(exactQuery);

    // fallback: אם לא נמצא — ננסה חיפוש לא-רגיש לרישיות (כדי לתפוס הבדלי אותיות/רווחים)
    if (!user) {
      const idForRegex = looksLikeEmail ? identifier.toLowerCase() : identifier;
      const regex = new RegExp(`^${idForRegex.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
      const fallbackQuery = looksLikeEmail ? { email: regex } : { username: regex };
      console.log('🧪 LOGIN fallbackQuery (regex i):', fallbackQuery);
      user = await User.findOne(fallbackQuery);
    }


    if (!user) {
      return res.status(401).json({ message: 'משתמש לא נמצא' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'פרטי התחברות שגויים' });
    }

    const token = jwt.sign({ _id: user._id }, JWT_SECRET);
    return res.json({
      token,
      user: { _id: user._id, username: user.username, email: user.email },
    });
  } catch (err) {
    return res.status(500).json({ message: 'שגיאה בהתחברות' });
  }
};




module.exports = { signup, login };
