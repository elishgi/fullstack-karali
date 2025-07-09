const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

//סכמת המשתמש (שם, אימייל , סיסמא)
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

//יצירת הצפנה לסיסמא
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

//השוואה בין ההצפנה לססימא הקיימת
userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);