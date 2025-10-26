const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const Event = require('../models/event.model');
const Log = require('../models/log.model');
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

const ensureUserId = (req, res) => {
  const userId = req.user?._id;
  if (!userId) {
    res.status(401).json({ message: 'משתמש לא מזוהה' });
    return null;
  }
  return userId;
};

const deleteAccount = async (req, res) => {
  try {
    const userId = ensureUserId(req, res);
    if (!userId) return;

    await Promise.all([
      Log.deleteMany({ userId }),
      Event.deleteMany({ userId }),
    ]);

    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser) {
      return res.status(404).json({ message: 'המשתמש לא נמצא' });
    }

    return res.json({ message: 'החשבון והנתונים נמחקו בהצלחה' });
  } catch (err) {
    console.error('Delete account error:', err);
    return res.status(500).json({ message: 'שגיאה בעת מחיקת החשבון' });
  }
};

const resetAccount = async (req, res) => {
  try {
    const userId = ensureUserId(req, res);
    if (!userId) return;

    await Promise.all([
      Log.deleteMany({ userId }),
      Event.deleteMany({ userId }),
    ]);

    return res.json({ message: 'החשבון אופס וכל האירועים והתיעודים נמחקו' });
  } catch (err) {
    console.error('Reset account error:', err);
    return res.status(500).json({ message: 'שגיאה בעת איפוס החשבון' });
  }
};


module.exports = { signup, login, deleteAccount, resetAccount };
