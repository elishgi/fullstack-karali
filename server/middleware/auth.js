const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

// בדיקת אבטחה – האם נשלח טוקן, והאם הוא תקף

module.exports = function (req, res, next) {
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query && typeof req.query.token === 'string' && req.query.token) {
    token = req.query.token;
    delete req.query.token;
  }

  if (!token) {
    return res.status(401).json({ message: 'לא נשלח טוקן אימות' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    const extractedId =
      decoded?._id || decoded?.id || decoded?.userId || decoded?.sub;
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
