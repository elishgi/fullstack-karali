const Event = require('../models/event.model');
const Log = require('../models/log.model');

const getAllEvents = async (req, res) => {
  try {
    const events = await Event.find();
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createEvent = async (req, res) => {
  try {
    const { name, color } = req.body;
    const newEvent = new Event({
      name,
      color
    });
    await newEvent.save();
    res.status(201).json(newEvent);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color, totalColor } = req.body;

    const updatedEvent = await Event.findByIdAndUpdate(
      id,
      { name, color, totalColor },
      { new: true }
    );

    if (!updatedEvent) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json(updatedEvent);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedEvent = await Event.findByIdAndDelete(id);

    if (!deletedEvent) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json({ message: 'Event deleted' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};


const deleteEventAndLogs = async (req, res) => {
  const { id } = req.params;

  try {

    // מחיקת כל הלוגים שקשורים לאירוע
    await Log.deleteMany({ eventId: id });

    // מחיקת האירוע עצמו
    await Event.findByIdAndDelete(id);

    res.json({ message: 'האירוע וכל הלוגים נמחקו בהצלחה' });
  } catch (err) {
    console.error('שגיאה במחיקת אירוע ולוגים:', err);
    res.status(500).json({ message: 'שגיאה במחיקת אירוע ולוגים' });
  }
};


module.exports = {
  getAllEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  deleteEventAndLogs,
};
