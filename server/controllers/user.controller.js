const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/user.model');
const Event = require('../models/event.model');
const Log = require('../models/log.model');
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;
let mailTransport;

const getMailTransport = () => {
  if (mailTransport) {
    return mailTransport;
  }

  if (process.env.SMTP_HOST) {
    mailTransport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  } else {
    mailTransport = nodemailer.createTransport({ jsonTransport: true });
    console.warn('SMTP credentials were not supplied. Password reset e-mails will be logged.');
  }

  return mailTransport;
};

const sendPasswordResetEmail = async ({ to, name, resetUrl }) => {
  const transporter = getMailTransport();
  const from = process.env.MAIL_FROM || 'no-reply@karali.app';

  const message = {
    from,
    to,
    subject: 'איפוס סיסמה - Karali',
    text: `שלום ${name || ''}\n\nהתקבלה בקשה לאפס את הסיסמה שלך ב-Karali.\nלחץ על הקישור הבא כדי לבחור סיסמה חדשה:\n${resetUrl}\n\nאם לא ביקשת זאת, ניתן להתעלם מהודעה זו.`,
    html: `<p>שלום ${name || ''}</p><p>התקבלה בקשה לאפס את הסיסמה שלך ב-Karali.</p><p><a href="${resetUrl}">לחץ כאן לאיפוס הסיסמה</a></p><p>אם לא ביקשת זאת, ניתן להתעלם מהודעה זו.</p>`,
  };

  await transporter.sendMail(message);
};

const generateUsernameFromEmail = (email) => {
  const [localPart] = email.split('@');
  return localPart.replace(/[^a-zA-Z0-9._-]/g, '') || `user${crypto.randomInt(1000, 9999)}`;
};

const generateUniqueUsername = async (email, fallbackName) => {
  let base = fallbackName ? fallbackName.trim().replace(/\s+/g, '').toLowerCase() : '';
  if (!base) {
    base = generateUsernameFromEmail(email.toLowerCase());
  }
  let candidate = base;
  let counter = 1;

  while (await User.findOne({ username: candidate })) {
    candidate = `${base}${counter}`;
    counter += 1;
    if (counter > 9999) {
      candidate = `${base}${crypto.randomInt(10000, 99999)}`;
      break;
    }
  }

  return candidate;
};

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
    isGoogleAccount: Boolean(userDoc.googleId),
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

    if (user.googleId && !user.password) {
      return res.status(400).json({ message: 'החשבון מחובר לגוגל. התחבר באמצעות "התחברות עם Google".' });
    }

    if (applyLegacyDefaults(user)) {
      await user.save();
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

const googleAuth = async (req, res) => {
  try {
    const { idToken } = req.body || {};
    if (!idToken) {
      return res.status(400).json({ message: 'אסימון גוגל חסר' });
    }

    if (!googleClient || !GOOGLE_CLIENT_ID) {
      return res.status(500).json({ message: 'שירות גוגל אינו מוגדר בצד השרת' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = (payload.email || '').toLowerCase();
    const googleId = payload.sub;

    if (!email || !googleId) {
      return res.status(400).json({ message: 'האסימון שסופק אינו תקין' });
    }

    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (!user) {
      const username = await generateUniqueUsername(email, payload.name || payload.given_name);
      user = new User({
        username,
        email,
        googleId,
        name: payload.given_name || payload.name || '',
        lastName: payload.family_name || '',
      });
      applyLegacyDefaults(user);
    } else {
      if (!user.googleId) {
        user.googleId = googleId;
      }
      if (!user.name && payload.given_name) {
        user.name = payload.given_name;
      }
      if (!user.lastName && payload.family_name) {
        user.lastName = payload.family_name;
      }
    }

    await user.save();

    const token = jwt.sign({ _id: user._id }, JWT_SECRET);
    return res.json({
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error('Google auth error:', err);
    return res.status(500).json({ message: 'נכשלה ההתחברות באמצעות Google' });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const email = (req.body?.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ message: 'יש להזין כתובת אימייל' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ message: 'אם קיים חשבון עם כתובת האימייל שסופקה, נשלחה אליו הודעה לאיפוס סיסמה.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 1000 * 60 * 60; // שעה אחת
    await user.save();

    const baseUrl = process.env.PASSWORD_RESET_URL || 'https://karali.app/reset-password';
    const resetUrl = `${baseUrl}?token=${token}`;
    await sendPasswordResetEmail({
      to: email,
      name: user.name || user.username,
      resetUrl,
    });

    return res.json({ message: 'אם קיים חשבון עם כתובת האימייל שסופקה, נשלחה אליו הודעה לאיפוס סיסמה.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ message: 'לא ניתן היה לשלוח קישור לאיפוס סיסמה' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body || {};

    if (!token || !password) {
      return res.status(400).json({ message: 'יש לספק אסימון וסיסמה חדשה' });
    }

    if (!/^(?=.*[A-Za-z])(?=.*\d).{6,}$/.test(password)) {
      return res.status(400).json({ message: 'הסיסמה חייבת להכיל לפחות 6 תווים, כולל אות אחת ומספר אחד' });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'הקישור לאיפוס סיסמה אינו תקף או שפג תוקפו' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.json({ message: 'הסיסמה עודכנה בהצלחה. ניתן להתחבר עם הסיסמה החדשה.' });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ message: 'שגיאה בעת איפוס הסיסמה' });
  }
};

const ensureUserId = (req, res) => {
  const userId = req.userId || req.user?._id || req.user?.id || req.user?.userId;
  if (!userId) {
    res.status(401).json({ message: 'משתמש לא מזוהה' });
    return null;
  }
  return userId;
};

const applyLegacyDefaults = (userDoc) => {
  if (!userDoc) return false;
  let changed = false;
  const ensure = (field, value = '') => {
    if (userDoc[field] === undefined) {
      userDoc[field] = value;
      changed = true;
    }
  };

  ensure('name');
  ensure('lastName');
  ensure('phone');
  ensure('bio');

  return changed;
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

    applyLegacyDefaults(user);

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


module.exports = {
  signup,
  login,
  googleAuth,
  forgotPassword,
  resetPassword,
  deleteAccount,
  resetAccount,
  updateAccount,
};
