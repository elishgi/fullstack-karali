const mongoose = require('mongoose');

//סכמת התיעוד 
const logSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  eventName: {
    type: String,
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  timeOfDay: {
    type: String,
    enum: ['בוקר', 'צהריים', 'ערב', 'לילה'],
    required: true
  },
  dayOfWeek: {
    type: String,
    enum: ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'],
    required: true
  },
  comment: {
    type: String,
    default: ''
  },
  imageUri: {
    type: String,
    default: ''
  },
  location: {
    lat: Number,
    lng: Number
  }
});

module.exports = mongoose.model('Log', logSchema);
