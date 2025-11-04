const Log = require('../models/log.model');
const Event = require('../models/event.model');

// ניהול תיעודים - כולל: הוספה שליפה עם סינון , ומחיקה .

//שליפת תיעודים עם אפשרויות סינון
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
    res.status(500).json({ message: 'שגיאה בשליפת התיעודים' });
  }
};

//יצירת תיעוד חדש
const createLog = async (req, res) => {
  try {
    const { eventId, eventName, comment, imageUri, location } = req.body;

    if (!eventId) {
      return res.status(400).json({ message: 'נדרש מזהה אירוע לתיעוד' });
    }

    const event = await Event.findOne({ _id: eventId, userId: req.user._id });
    if (!event || event.archived) {
      return res.status(409).json({ message: 'האירוע אינו פעיל' });
    }

    if (event.expiresAt) {
      const expirationDate = new Date(event.expiresAt);
      if (!Number.isNaN(expirationDate.getTime()) && expirationDate <= new Date()) {
        return res.status(409).json({ message: 'האירוע כבר הסתיים' });
      }
    }


    const now = new Date();

    const hours = now.getHours();
    let timeOfDay = '';
    if (hours >= 5 && hours < 12) timeOfDay = 'בוקר';
    else if (hours >= 12 && hours < 17) timeOfDay = 'צהריים';
    else if (hours >= 17 && hours < 21) timeOfDay = 'ערב';
    else timeOfDay = 'לילה';

    const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    const dayOfWeek = days[now.getDay()];

    const eventName = (event.name || '').trim() || 'ללא שם';

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
    res.status(400).json({ message: 'שגיאה ביצירת תיעוד חדש' });
  }
};

//מחיקת תיעוד (לפי מזהה)
const deleteLog = async (req, res) => {
  try {
    const { id } = req.params;

    const log = await Log.findOne({ _id: id, userId: req.user._id });

    if (!log) {
      return res.status(404).json({ message: 'התיעוד לא נמצא' });
    }

    await log.deleteOne();

    const event = await Event.findOne({ _id: log.eventId, userId: req.user._id });
    if (event) {
      const totalCount = await Log.countDocuments({ eventId: log.eventId, userId: req.user._id });
      event.totalColor = totalCount;

      const latestLog = await Log.findOne({ eventId: log.eventId, userId: req.user._id })
        .sort({ timestamp: -1 })
        .limit(1);
      event.lastPressedAt = latestLog ? latestLog.timestamp : null;

      const todayStart = getStartOfDay(new Date());
      const tomorrowStart = new Date(todayStart);
      tomorrowStart.setDate(tomorrowStart.getDate() + 1);

      const todayCount = await Log.countDocuments({
        eventId: log.eventId,
        userId: req.user._id,
        timestamp: { $gte: todayStart, $lt: tomorrowStart },
      });

      if (todayCount > 0) {
        event.goalDailyCount = todayCount;
        event.goalDailyLastReset = todayStart;
      } else {
        event.goalDailyCount = 0;
        const dailyGoalValue = getDailyGoalValue(event);
        event.goalDailyLastReset = dailyGoalValue ? todayStart : null;
      }

      const eventGoalValue = getEventGoalValue(event);
      if (eventGoalValue && totalCount < eventGoalValue) {
        event.goalCompletedAt = null;
      }

      await event.save();
    }

    res.json({ message: 'התיעוד נמחק בהצלחה' });
  } catch (err) {
    res.status(400).json({ message: 'שגיאה במחיקת התיעוד' });
  }
};


module.exports = {
  getAllLogs,
  createLog,
  deleteLog
};
