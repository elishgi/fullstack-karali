const Log = require('../models/log.model');
const Event = require('../models/event.model');

// ניהול תיעודים - כולל: הוספה שליפה עם סינון , ומחיקה .

const GOAL_TYPES = {
  NONE: 'none',
  EVENT: 'event',
  DAILY: 'daily',
};

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

const hasGoalValue = (event) =>
  typeof event.goalValue === 'number' && Number.isFinite(event.goalValue) && event.goalValue > 0;

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

    if (event.goalType === GOAL_TYPES.EVENT && hasGoalValue(event)) {
      if (event.goalCompletedAt) {
        return res.status(409).json({
          message: 'האירוע הגיע ליעד התיעודים שלו.',
          code: 'event-goal-complete',
        });
      }
    }

    if (event.goalType === GOAL_TYPES.DAILY && hasGoalValue(event)) {
      const lastReset = event.goalDailyLastReset ? new Date(event.goalDailyLastReset) : null;
      if (!lastReset || lastReset < todayStart) {
        event.goalDailyCount = 0;
        event.goalDailyLastReset = todayStart;
      }

      if (event.goalDailyCount >= event.goalValue) {
        await event.save();
        return res.status(409).json({
          message: `חרגת ממגבלת התיעודים היומית (${event.goalValue}). ניתן להוסיף תיעוד חדש לאחר חצות.`,
          code: 'daily-goal-reached',
        });
      }
    }

    const existingCount = await Log.countDocuments({ eventId, userId: req.user._id });
    if (event.goalType === GOAL_TYPES.EVENT && hasGoalValue(event) && existingCount >= event.goalValue) {
      event.goalCompletedAt = event.goalCompletedAt || now;
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

    const newLog = new Log({
      eventId,
      eventName: event.name,
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

    if (event.goalType === GOAL_TYPES.DAILY && hasGoalValue(event)) {
      event.goalDailyCount = (event.goalDailyCount || 0) + 1;
      event.goalDailyLastReset = todayStart;
    }

    if (event.goalType === GOAL_TYPES.EVENT && hasGoalValue(event) && updatedTotal >= event.goalValue) {
      goalCompleted = true;
      event.goalCompletedAt = now;
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

    const deletedLog = await Log.findByIdAndDelete(id);

    if (!deletedLog) {
      return res.status(404).json({message: 'התיעוד לא נמצא' });
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
