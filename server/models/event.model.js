const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  color: {
    type: String,
    default: '#000000',
  },
  totalColor: {
    type: Number,
    default: 0,
  },
  shared: {
    type: Boolean,
    default: false,
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  startsAt: {
    type: Date,
  },
  endsAt: {
    type: Date,
  },
}, {
  timestamps: true,
  versionKey: false,
});

eventSchema.virtual('userId').get(function userId() {
  return this.owner;
});

eventSchema.virtual('name')
  .get(function getName() {
    return this.title;
  })
  .set(function setName(value) {
    this.title = value;
  });

eventSchema.set('toJSON', { virtuals: true });
eventSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Event', eventSchema);
