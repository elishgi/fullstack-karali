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

const getEventGoalValue = (event) => {
  if (!event || event.goalType !== GOAL_TYPES.EVENT) {
    return null;
  }
  const value = Number(event.goalValue);
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }
  return Math.floor(value);
};

const getDailyGoalValue = (event) => {
  if (!event) {
    return null;
  }

  const rawValue =
    event.goalDailyValue !== undefined && event.goalDailyValue !== null
      ? event.goalDailyValue
      : event.goalType === GOAL_TYPES.DAILY
        ? event.goalValue
        : null;

  const value = Number(rawValue);
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }
  return Math.floor(value);
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

    const eventGoalValue = getEventGoalValue(event);
    const dailyGoalValue = getDailyGoalValue(event);

    if (eventGoalValue) {
      if (event.goalCompletedAt) {
        return res.status(409).json({
          message: 'האירוע הגיע ליעד התיעודים שלו.',
          code: 'event-goal-complete',
        });
      }
    }

    if (dailyGoalValue) {
      const lastReset = event.goalDailyLastReset ? new Date(event.goalDailyLastReset) : null;
      if (!lastReset || lastReset < todayStart) {
        event.goalDailyCount = 0;
        event.goalDailyLastReset = todayStart;
      }

      if (event.goalDailyCount >= dailyGoalValue) {
        await event.save();
        return res.status(409).json({
          message: `חרגת ממגבלת התיעודים היומית (${dailyGoalValue}). ניתן להוסיף תיעוד חדש לאחר חצות.`,
          code: 'daily-goal-reached',
        });
      }
    }

    const existingCount = await Log.countDocuments({ eventId, userId: req.user._id });
    if (eventGoalValue && existingCount >= eventGoalValue) {
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

    const eventName = (event.name || '').trim() || 'ללא שם';

    const newLog = new Log({
      eventId,
      eventName,
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

    if (dailyGoalValue) {
      event.goalDailyCount = (event.goalDailyCount || 0) + 1;
      event.goalDailyLastReset = todayStart;
    }

    if (eventGoalValue && updatedTotal >= eventGoalValue) {
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
