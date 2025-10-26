const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const FRIEND_CODE_LENGTH = 6;

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
  },
  friendCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    minlength: 6,
    maxlength: 8,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, {
  versionKey: false,
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

async function generateFriendCode(model) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  while (true) {
    let code = '';
    for (let i = 0; i < FRIEND_CODE_LENGTH; i += 1) {
      const index = Math.floor(Math.random() * alphabet.length);
      code += alphabet[index];
    }
    // eslint-disable-next-line no-await-in-loop
    const exists = await model.exists({ friendCode: code });
    if (!exists) {
      return code;
    }
  }
}

userSchema.pre('validate', async function preValidate(next) {
  if (!this.friendCode) {
    this.friendCode = await generateFriendCode(this.constructor);
  }
  next();
});

userSchema.pre('save', async function preSave(next) {
  if (this.isModified('passwordHash')) {
    const saltRounds = 10;
    this.passwordHash = await bcrypt.hash(this.passwordHash, saltRounds);
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
