const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

// בדיקת אבטחה – האם נשלח טוקן, והאם הוא תקף

module.exports = function (req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'לא נשלח טוקן אימות' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    const extractedId = decoded?._id || decoded?.id || decoded?.userId || decoded?.sub;
    if (!extractedId) {
      return res.status(401).json({ message: 'טוקן חסר מזהה משתמש' });
    }

    req.user = { ...decoded, _id: extractedId };
    req.userId = extractedId;

    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(401).json({ message: 'טוקן לא תקף' });
  }
};
