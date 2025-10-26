const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

module.exports = async function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'לא נשלח טוקן אימות' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded._id || decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'משתמש לא נמצא' });
    }
    req.user = user;
    req.userId = user._id;
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'טוקן לא תקף' });
  }
};
