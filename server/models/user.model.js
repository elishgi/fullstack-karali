// נבדק!

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// סכמת המשתמש המלאה
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: false, trim: true, default: '' },
  lastName: { type: String, required: false, trim: true, default: '' },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true },
  phone: { type: String, required: false, trim: true, default: '' },
  bio: { type: String, required: false, trim: true, default: '', maxlength: 180 },
}, { timestamps: true });


// הצפנת סיסמה לפני שמירה
// דג את הפעולה לפני השמירה
userSchema.pre('save', async function (next) {
  // אם רק עדכן ביו ולא סיסמה אל תעשה האש על האש
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// השוואת סיסמאות
userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
