const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const Event = require('../models/event.model');
const Log = require('../models/log.model');
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

const sanitizeUser = (userDoc) => {
  if (!userDoc) return null;
  return {
    _id: userDoc._id,
    username: userDoc.username,
    email: userDoc.email,
    name: userDoc.name || '',
    lastName: userDoc.lastName || '',
    phone: userDoc.phone || '',
    bio: userDoc.bio || '',
  };
};


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
      user: sanitizeUser(user),
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
      user: sanitizeUser(user),
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

const updateAccount = async (req, res) => {
  try {
    const userId = ensureUserId(req, res);
    if (!userId) return;

    const {
      username,
      name,
      lastName,
      email,
      phone,
      bio,
      password,
    } = req.body || {};

    const updates = {};

    if (username !== undefined) {
      const trimmed = (username || '').trim();
      if (!trimmed) {
        return res.status(400).json({ message: 'שם משתמש הוא שדה חובה' });
      }
      const existing = await User.findOne({ username: trimmed, _id: { $ne: userId } });
      if (existing) {
        return res.status(400).json({ message: 'שם המשתמש כבר בשימוש' });
      }
      updates.username = trimmed;
    }

    if (email !== undefined) {
      const trimmedEmail = (email || '').trim().toLowerCase();
      if (!trimmedEmail) {
        return res.status(400).json({ message: 'אימייל הוא שדה חובה' });
      }
      const existingEmail = await User.findOne({ email: trimmedEmail, _id: { $ne: userId } });
      if (existingEmail) {
        return res.status(400).json({ message: 'אימייל זה כבר בשימוש' });
      }
      updates.email = trimmedEmail;
    }

    if (name !== undefined) {
      updates.name = (name || '').trim();
    }

    if (lastName !== undefined) {
      updates.lastName = (lastName || '').trim();
    }

    if (phone !== undefined) {
      const trimmedPhone = (phone || '').trim();
      updates.phone = trimmedPhone;
    }

    if (bio !== undefined) {
      const trimmedBio = (bio || '').trim();
      if (trimmedBio.length > 180) {
        return res.status(400).json({ message: 'הביוגרפיה חורגת מהמגבלה' });
      }
      updates.bio = trimmedBio;
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'המשתמש לא נמצא' });
    }

    Object.assign(user, updates);

    const newPassword = (password || '').trim();
    if (newPassword) {
      user.password = newPassword;
    }

    await user.save();

    return res.json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error('Update account error:', err);
    if (err.code === 11000) {
      if (err.keyPattern?.username) {
        return res.status(400).json({ message: 'שם המשתמש כבר בשימוש' });
      }
      if (err.keyPattern?.email) {
        return res.status(400).json({ message: 'אימייל זה כבר בשימוש' });
      }
    }
    return res.status(500).json({ message: 'שגיאה בעת עדכון החשבון' });
  }
};


module.exports = { signup, login, deleteAccount, resetAccount, updateAccount };
