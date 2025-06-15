const express = require('express');
const router = express.Router();

const {
    getAllEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    deleteEventAndLogs,
} = require('../controllers/event.controller');

const Event = require('../models/event.model'); // ✅ הוספה חשובה

router.get('/events', getAllEvents);
router.post('/events', createEvent);
router.put('/events/:id', updateEvent);
router.delete('/events/:id', deleteEvent);
router.delete('/eventsWithLogs/:id', deleteEventAndLogs);

router.get('/events/names', async (req, res) => {
    try {
        const names = await Event.find().distinct('name'); // ← שים לב לשם הנכון
        res.json(names);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


module.exports = router;
