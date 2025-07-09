const Event = require('../models/event.model');
const Log = require('../models/log.model');
// ניהול CRUD של אירועים .


const getAllEvents = async (req, res) => {
  try {
    const events = await Event.find({ userId: req.user._id });
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: 'שגיאה בשליפת האירועים' });
  }
};

const createEvent = async (req, res) => {
  try {
    const { name, color } = req.body;
    const newEvent = new Event({
      name,
      color,
      userId: req.user._id
    });

    await newEvent.save();
    res.status(201).json(newEvent);
  } catch (err) {
    res.status(400).json({ message: 'שגיאה ביצירת אירוע חדש' });
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
      return res.status(404).json({ message: 'אירוע לא נמצא' });
    }

    res.json(updatedEvent);
  } catch (err) {
    res.status(400).json({ message: 'שגיאה בעדכון אירוע' });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedEvent = await Event.findByIdAndDelete(id);

    if (!deletedEvent) {
      return res.status(404).json({ message: 'אירוע לא נמצא' });
    }

    res.json({ message: 'האירוע נמחק בהצלחה' });
  } catch (err) {
    res.status(400).json({ message: 'שגיאה במחיקת האירוע' });
  }
};


const deleteEventAndLogs = async (req, res) => {
  const { id } = req.params;

  try {


    await Log.deleteMany({ eventId: id });


    await Event.findByIdAndDelete(id);

    res.json({ message: 'האירוע וכל התיעודים נמחקו בהצלחה' });
  } catch (err) {
    console.error('שגיאה במחיקת אירוע ותיעודים:', err);
    res.status(500).json({ message: 'שגיאה במחיקת אירוע ותיעודים' });
  }
};


module.exports = {
  getAllEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  deleteEventAndLogs,
};
