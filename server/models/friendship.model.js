const mongoose = require('mongoose');

const friendshipSchema = new mongoose.Schema({
  userA: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  userB: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  since: {
    type: Date,
    default: Date.now,
  },
}, {
  versionKey: false,
});

friendshipSchema.pre('validate', function ensureOrdering(next) {
  if (this.userA && this.userB && this.userA.toString() > this.userB.toString()) {
    const tmp = this.userA;
    this.userA = this.userB;
    this.userB = tmp;
  }
  next();
});

friendshipSchema.index({ userA: 1, userB: 1 }, { unique: true });

module.exports = mongoose.model('Friendship', friendshipSchema);
