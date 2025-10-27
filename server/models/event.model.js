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
    participants: {
        type: [String],
        default: []
    }
});

module.exports = mongoose.model('Event', eventSchema);