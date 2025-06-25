const Log = require('../models/log.model');


const getAllLogs = async (req, res) => {
  try {
    const { fromDate, toDate, eventName, timeOfDay, eventId } = req.query;

    const filter = {};

    if (fromDate && toDate) {
      filter.timestamp = {
        $gte: new Date(fromDate),
        $lte: new Date(toDate),
      };
    }

    if (eventName) {
      filter.eventName = { $regex: eventName, $options: 'i' }; // חיפוש גמיש
    }

    if (timeOfDay) {
      filter.timeOfDay = timeOfDay;
    }

    if (eventId) {
      filter.eventId = eventId;
    }

    filter.userId = req.user._id;
    const logs = await Log.find(filter).sort({ timestamp: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


const createLog = async (req, res) => {
  try {
    const { eventId, eventName, comment, imageUri, location } = req.body;


    const now = new Date();

    const hours = now.getHours();
    let timeOfDay = '';
    if (hours >= 5 && hours < 12) timeOfDay = 'בוקר';
    else if (hours >= 12 && hours < 17) timeOfDay = 'צהריים';
    else if (hours >= 17 && hours < 21) timeOfDay = 'ערב';
    else timeOfDay = 'לילה';

    const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    const dayOfWeek = days[now.getDay()];

    const newLog = new Log({
      eventId,
      eventName,
      timestamp: now,
      timeOfDay,
      dayOfWeek,
      comment,
      imageUri,
      location,
      userId: req.user._id
    });


    await newLog.save();

    res.status(201).json(newLog);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const deleteLog = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedLog = await Log.findByIdAndDelete(id);

    if (!deletedLog) {
      return res.status(404).json({ message: 'Log not found' });
    }

    res.json({ message: 'Log deleted' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};


module.exports = {
  getAllLogs,
  createLog,
  deleteLog
};
