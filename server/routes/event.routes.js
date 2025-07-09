const express = require('express');
const router = express.Router();

const {
    getAllEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    deleteEventAndLogs,
} = require('../controllers/event.controller');

const Event = require('../models/event.model');
const auth = require('../middleware/auth');

//  כל הראוטים מוגנים ע"י auth
//ראוטרים: שלפית אירועים, יצירת אירוע, עדכון לפי שם מזהה, מחיקת אירוע, מחיקת אירוע ותיעודים
router.get('/events', auth, getAllEvents);
router.post('/events', auth, createEvent);
router.put('/events/:id', auth, updateEvent);
router.delete('/events/:id', auth, deleteEvent);
router.delete('/eventsWithLogs/:id', auth, deleteEventAndLogs);

// גם שליפת שמות – רק של המשתמש המחובר
router.get('/events/names', auth, async (req, res) => {
    try {
        const names = await Event.find({ userId: req.user._id }).distinct('name');
        res.json(names);
    } catch (err) {
        res.status(500).json({ message: 'שגיאה בשליפת שמות האירועים' });
    }
});

module.exports = router;

