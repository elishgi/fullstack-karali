// נבדק!
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

// בדיקת אבטחה – האם נשלח טוקן, והאם הוא תקף
module.exports = function (req, res, next) {
  // בדיקת טוקן בהאדר
  const authHeader = req.headers.authorization;
  let token = null;
  // האם הטוקן קיים? והאם עם הקידומת?
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // שמירת טוקן ללא קידומת bearer
    token = authHeader.split(' ')[1];
  // 
  } else if (req.query && typeof req.query.token === 'string' && req.query.token) {
    token = req.query.token;
    delete req.query.token;
  }

  if (!token) {
    return res.status(401).json({ message: 'לא נשלח טוקן אימות' });
  }

  try {
    // בדיקה תקינות ,ופענוח נתונים למשתנה 
    const decoded = jwt.verify(token, JWT_SECRET);
    // בדיקה האם קיים בכל צורה 
    const extractedId =
      decoded?._id || decoded?.id || decoded?.userId || decoded?.sub;
    // בדיקת שגיאה - לא קיים משתשמש זהות
    if (!extractedId) {
      return res.status(401).json({ message: 'טוקן חסר מזהה משתמש' });
    }

    // הצמדת יוזר לכל בקשה -לקיחת כל המידע מהטוקן פנימה,והגדרת מזהה יחיד
    req.user = { ...decoded, _id: extractedId };
    // קיצור
    req.userId = extractedId;

    next();

  // תפיסת שגיאה 
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(401).json({ message: 'טוקן לא תקף' });
  }
};
