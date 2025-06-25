const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already in use' });

    const user = new User({ name, email, password });
    await user.save();

    const token = jwt.sign({ _id: user._id }, JWT_SECRET);
    res.status(201).json({ token, user: { _id: user._id, name: user.name } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'User not found' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ _id: user._id }, JWT_SECRET);
    res.json({ token, user: { _id: user._id, name: user.name } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { signup, login };