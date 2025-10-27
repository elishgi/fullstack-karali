const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// סכמת המשתמש המלאה
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: false, trim: true, default: '' },
  lastName: { type: String, required: false, trim: true, default: '' },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: function requiredPassword() { return !this.googleId; } },
  googleId: { type: String, unique: true, sparse: true },
  phone: { type: String, required: false, trim: true, default: '' },
  bio: { type: String, required: false, trim: true, default: '', maxlength: 180 },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
}, { timestamps: true });


// הצפנת סיסמה לפני שמירה
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// השוואת סיסמאות
userSchema.methods.comparePassword = function (candidatePassword) {
  if (!this.password) {
    return Promise.resolve(false);
  }
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
