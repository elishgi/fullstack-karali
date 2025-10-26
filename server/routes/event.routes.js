const express = require('express');
const {
  getAllEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  deleteEventAndLogs,
  updateParticipants,
  getEventNames,
  listParticipants,
} = require('../controllers/event.controller');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.get('/events', getAllEvents);
router.post('/events', createEvent);
router.put('/events/:id', updateEvent);
router.delete('/events/:id', deleteEvent);
router.delete('/eventsWithLogs/:id', deleteEventAndLogs);
router.patch('/events/:id/participants', updateParticipants);
router.get('/events/:id/participants', listParticipants);
router.get('/events/names', getEventNames);

module.exports = router;
