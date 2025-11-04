const Log = require('../models/log.model');
const Event = require('../models/event.model');

// ניהול תיעודים - כולל: הוספה שליפה עם סינון , ומחיקה .

const getTimeOfDayLabel = (date) => {
  const hours = date.getHours();
  if (hours >= 5 && hours < 12) return 'בוקר';
  if (hours >= 12 && hours < 17) return 'צהריים';
  if (hours >= 17 && hours < 21) return 'ערב';
  return 'לילה';
};

const getDayOfWeekLabel = (date) => {
  const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  return days[date.getDay()];
};

const getStartOfDay = (date) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const hasEventGoal = (event) => {
  const value = Number(event?.eventGoalValue);
  return Number.isFinite(value) && value > 0;
};

const hasDailyGoal = (event) => {
  const value = Number(event?.dailyGoalValue);
  return Number.isFinite(value) && value > 0;
};

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
    const { eventId, comment = '', imageUri = '', location = {} } = req.body;

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
    const todayStart = getStartOfDay(now);

    if (hasEventGoal(event) && event.eventGoalCompletedAt) {
      return res.status(409).json({
        message: 'האירוע הגיע ליעד התיעודים שלו.',
        code: 'event-goal-complete',
      });
    }

    let logsToday = 0;
    if (hasDailyGoal(event)) {
      const tomorrowStart = new Date(todayStart);
      tomorrowStart.setDate(tomorrowStart.getDate() + 1);

      logsToday = await Log.countDocuments({
        eventId,
        userId: req.user._id,
        timestamp: { $gte: todayStart, $lt: tomorrowStart },
      });

      if (logsToday >= event.dailyGoalValue) {
        return res.status(409).json({
          message: `חרגת ממגבלת התיעודים היומית (${event.dailyGoalValue}). ניתן להוסיף תיעוד חדש לאחר חצות.`,
          code: 'daily-goal-reached',
        });
      }
    }

    const existingCount = await Log.countDocuments({ eventId, userId: req.user._id });
    if (hasEventGoal(event) && existingCount >= event.eventGoalValue) {
      event.eventGoalCompletedAt = event.eventGoalCompletedAt || now;
      await event.save();
      return res.status(409).json({
        message: 'האירוע הגיע ליעד התיעודים שלו.',
        code: 'event-goal-complete',
      });
    }

    const timeOfDay = getTimeOfDayLabel(now);
    const dayOfWeek = getDayOfWeekLabel(now);

    const safeLocation = {};
    if (location && typeof location === 'object') {
      if (Number.isFinite(Number(location.lat))) {
        safeLocation.lat = Number(location.lat);
      }
      if (Number.isFinite(Number(location.lng))) {
        safeLocation.lng = Number(location.lng);
      }
    }

    const eventName = typeof event.name === 'string' ? event.name.trim() : '';
    const resolvedEventName = eventName || event.name || 'ללא שם';

    const newLog = new Log({
      eventId,
      eventName: resolvedEventName,
      timestamp: now,
      timeOfDay,
      dayOfWeek,
      comment,
      imageUri,
      location: safeLocation,
      userId: req.user._id,
    });

    await newLog.save();

    const updatedTotal = existingCount + 1;
    let goalCompleted = false;

    event.totalColor = updatedTotal;
    event.lastPressedAt = now;

    if (hasDailyGoal(event)) {
      const nextDailyCount = logsToday + 1;
      event.dailyGoalCount = nextDailyCount;
      event.dailyGoalLastReset = todayStart;
    }

    if (hasEventGoal(event) && updatedTotal >= event.eventGoalValue) {
      goalCompleted = true;
      event.eventGoalCompletedAt = now;
      event.expirationNotified = false;
      event.expirationAcknowledged = false;
    }

    await event.save();

    res.status(201).json({ log: newLog, event, goalCompleted });
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

    await Log.deleteOne({ _id: id, userId: req.user._id });

    const event = await Event.findOne({ _id: log.eventId, userId: req.user._id });

    if (event) {
      const [totalCount, latestLog] = await Promise.all([
        Log.countDocuments({ eventId: event._id, userId: req.user._id }),
        Log.findOne({ eventId: event._id, userId: req.user._id }).sort({ timestamp: -1 }),
      ]);

      event.totalColor = totalCount;
      event.lastPressedAt = latestLog ? latestLog.timestamp : null;

      if (hasDailyGoal(event)) {
        const todayStart = getStartOfDay(new Date());
        const tomorrowStart = new Date(todayStart);
        tomorrowStart.setDate(tomorrowStart.getDate() + 1);
        const todaysCount = await Log.countDocuments({
          eventId: event._id,
          userId: req.user._id,
          timestamp: { $gte: todayStart, $lt: tomorrowStart },
        });
        event.dailyGoalCount = todaysCount;
        event.dailyGoalLastReset = todaysCount > 0 ? todayStart : null;
      } else {
        event.dailyGoalCount = 0;
        event.dailyGoalLastReset = null;
      }

      if (hasEventGoal(event) && event.totalColor < event.eventGoalValue) {
        event.eventGoalCompletedAt = null;
      }

      await event.save();

      return res.json({ message: 'התיעוד נמחק בהצלחה', event });
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
