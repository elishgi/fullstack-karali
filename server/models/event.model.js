const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    name: {
        type : String,
        required : true
    },
    color: {
        type : String,
        default: '#000000'
    },
    totalColor: {
        type : Number,
        default : 0
    }
});

module.exports = mongoose.model('Event', eventSchema);