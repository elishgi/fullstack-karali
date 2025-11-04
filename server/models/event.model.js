const mongoose = require('mongoose');

//סכמת האירוע
const eventSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    color: {
        type: String,
        default: '#000000'
    },
    totalColor: {
        type: Number,
        default: 0
    },
    shared: {
        type: Boolean,
        default: false
    },
    type: {
        type: String,
        enum: ['regular', 'temporary'],
        default: 'regular'
    },
    participants: {
        type: [String],
        default: []
    },
    expiresAt: {
        type: Date,
        default: null
    },
    expirationDurationMs: {
        type: Number,
        default: null
    },
    expirationNotified: {
        type: Boolean,
        default: false
    },
    expirationAcknowledged: {
        type: Boolean,
        default: false
    },
    archived: {
        type: Boolean,
        default: false
    },
    lastPressedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Event', eventSchema);
