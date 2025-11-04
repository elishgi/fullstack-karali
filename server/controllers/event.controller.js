const Event = require('../models/event.model');
const Log = require('../models/log.model');

// ניהול CRUD של אירועים + לוגיקה חדשה עבור תוקף אירוע

const getAllEvents = async (req, res) => {
  try {
    const events = await Event.find({
      userId: req.user._id,
      archived: { $ne: true },
    });
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: 'שגיאה בשליפת האירועים' });
  }
};

const createEvent = async (req, res) => {
  try {
    const {
      name,
      color,
      shared = false,
      participants = [],
      expiresAt,
      expirationDurationMs,
      type = 'regular',
      goalType = 'none',
      goalValue,
      goalDailyValue,
    } = req.body;

    if (!['regular', 'temporary'].includes(type)) {
      return res.status(400).json({ message: 'סוג האירוע אינו תקין' });
    }

    const allowedGoals = ['none', 'event', 'daily'];
    if (!allowedGoals.includes(goalType)) {
      return res.status(400).json({ message: 'סוג היעד אינו תקין' });
    }

    const parsePositiveInteger = (value) => {
      const numeric = Number(value);
      if (!Number.isFinite(numeric) || numeric <= 0) {
        return null;
      }
      return Math.floor(numeric);
    };

    let normalizedGoalType = goalType === 'daily' ? 'none' : goalType;
    let normalizedGoalValue = null;
    let normalizedDailyGoalValue = null;

    if (goalType === 'event') {
      normalizedGoalValue = parsePositiveInteger(goalValue);
      if (!normalizedGoalValue) {
        return res.status(400).json({ message: 'ערך יעד האירוע אינו תקין' });
      }
    }

    const requestedDailyGoal =
      goalDailyValue !== undefined ? goalDailyValue : goalType === 'daily' ? goalValue : null;
    if (requestedDailyGoal !== null && requestedDailyGoal !== undefined && requestedDailyGoal !== '') {
      normalizedDailyGoalValue = parsePositiveInteger(requestedDailyGoal);
      if (!normalizedDailyGoalValue) {
        return res.status(400).json({ message: 'ערך היעד היומי אינו תקין' });
      }
    }

    if (goalType === 'daily') {
      normalizedGoalValue = null;
    }

    let parsedExpiresAt = null;
    if (expiresAt) {
      parsedExpiresAt = new Date(expiresAt);
      if (Number.isNaN(parsedExpiresAt.getTime())) {
        return res.status(400).json({ message: 'תאריך תפוגה אינו תקין' });
      }
    }

    let normalizedDuration = null;
    if (typeof expirationDurationMs === 'number' && expirationDurationMs > 0) {
      normalizedDuration = expirationDurationMs;
    } else if (parsedExpiresAt) {
      normalizedDuration = Math.max(parsedExpiresAt.getTime() - Date.now(), 0);
    }

    const newEvent = new Event({
      name,
      color,
      shared: Boolean(shared),
      participants: Array.isArray(participants) ? participants : [],
      userId: req.user._id,
      expiresAt: parsedExpiresAt,
      expirationDurationMs: normalizedDuration,
      type,
      goalType: normalizedGoalType,
      goalValue: normalizedGoalValue,
      goalDailyValue: normalizedDailyGoalValue,
      goalDailyCount: 0,
      goalDailyLastReset: null,
      goalCompletedAt: null,
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
    const {
      name,
      color,
      totalColor,
      shared,
      participants,
      expiresAt,
      expirationDurationMs,
      expirationNotified,
      expirationAcknowledged,
      archived,
      lastPressedAt,
      type,
      goalType,
      goalValue,
      goalDailyValue,
      goalDailyCount,
      goalDailyLastReset,
      goalCompletedAt,
    } = req.body;

    const event = await Event.findOne({ _id: id, userId: req.user._id });

    if (!event) {
      return res.status(404).json({ message: 'אירוע לא נמצא' });
    }

    if (name !== undefined) {
      event.name = name;
    }

    if (color !== undefined) {
      event.color = color;
    }

    if (totalColor !== undefined) {
      event.totalColor = totalColor;
    }

    if (typeof shared === 'boolean') {
      event.shared = shared;
    }

    if (participants !== undefined) {
      event.participants = Array.isArray(participants) ? participants : [];
    }

    if (type !== undefined) {
      if (!['regular', 'temporary'].includes(type)) {
        return res.status(400).json({ message: 'סוג האירוע אינו תקין' });
      }
      event.type = type;
    }

    if (expiresAt !== undefined) {
      if (expiresAt === null) {
        event.expiresAt = null;
      } else {
        const parsed = new Date(expiresAt);
        if (Number.isNaN(parsed.getTime())) {
          return res.status(400).json({ message: 'תאריך תפוגה אינו תקין' });
        }
        event.expiresAt = parsed;
      }
    }

    if (expirationDurationMs !== undefined) {
      event.expirationDurationMs =
        typeof expirationDurationMs === 'number' && expirationDurationMs > 0
          ? expirationDurationMs
          : null;
    }

    if (typeof expirationNotified === 'boolean') {
      event.expirationNotified = expirationNotified;
    }

    if (typeof expirationAcknowledged === 'boolean') {
      event.expirationAcknowledged = expirationAcknowledged;
    }

    if (typeof archived === 'boolean') {
      event.archived = archived;
    }

    if (lastPressedAt !== undefined) {
      event.lastPressedAt = lastPressedAt ? new Date(lastPressedAt) : null;
    }

    const allowedGoals = ['none', 'event', 'daily'];
    const parsePositiveInteger = (value) => {
      const numeric = Number(value);
      if (!Number.isFinite(numeric) || numeric <= 0) {
        return null;
      }
      return Math.floor(numeric);
    };

    let nextGoalType = event.goalType;
    let nextGoalValue = event.goalValue;
    let nextDailyGoalValue = event.goalDailyValue;

    const goalTypeProvided = goalType !== undefined;

    if (goalTypeProvided) {
      if (!allowedGoals.includes(goalType)) {
        return res.status(400).json({ message: 'סוג היעד אינו תקין' });
      }
      if (goalType === 'daily') {
        nextGoalType = 'none';
        nextGoalValue = null;
        event.goalCompletedAt = null;
      } else {
        nextGoalType = goalType;
        if (goalType === 'none') {
          nextGoalValue = null;
          event.goalCompletedAt = null;
        }
      }
    }

    const legacyDailyUpdate = goalType === 'daily' && goalDailyValue === undefined;

    if (goalDailyValue !== undefined) {
      if (goalDailyValue === null || goalDailyValue === '') {
        nextDailyGoalValue = null;
        event.goalDailyCount = 0;
        event.goalDailyLastReset = null;
      } else {
        const parsedDaily = parsePositiveInteger(goalDailyValue);
        if (!parsedDaily) {
          return res.status(400).json({ message: 'ערך היעד היומי אינו תקין' });
        }
        nextDailyGoalValue = parsedDaily;
      }
    }

    if (goalValue !== undefined) {
      if (legacyDailyUpdate) {
        if (goalValue === null || goalValue === '') {
          nextDailyGoalValue = null;
          event.goalDailyCount = 0;
          event.goalDailyLastReset = null;
        } else {
          const parsedDaily = parsePositiveInteger(goalValue);
          if (!parsedDaily) {
            return res.status(400).json({ message: 'ערך היעד היומי אינו תקין' });
          }
          nextDailyGoalValue = parsedDaily;
        }
      } else if (goalValue === null || goalValue === '') {
        nextGoalValue = null;
        if (goalTypeProvided ? goalType === 'event' : nextGoalType === 'event') {
          event.goalCompletedAt = null;
        }
      } else {
        const parsedGoal = parsePositiveInteger(goalValue);
        if (!parsedGoal) {
          return res.status(400).json({ message: 'ערך היעד אינו תקין' });
        }
        if (goalTypeProvided ? goalType === 'event' : nextGoalType === 'event' || event.goalType === 'event') {
          nextGoalValue = parsedGoal;
        }
      }
    }

    event.goalType = nextGoalType;
    event.goalValue = nextGoalValue;
    event.goalDailyValue = nextDailyGoalValue;

    if (goalDailyCount !== undefined) {
      event.goalDailyCount = Number.isFinite(Number(goalDailyCount))
        ? Number(goalDailyCount)
        : event.goalDailyCount;
    }

    if (goalDailyLastReset !== undefined) {
      event.goalDailyLastReset = goalDailyLastReset
        ? new Date(goalDailyLastReset)
        : null;
    }

    if (goalCompletedAt !== undefined) {
      event.goalCompletedAt = goalCompletedAt ? new Date(goalCompletedAt) : null;
    }

    await event.save();

    res.json(event);
  } catch (err) {
    res.status(400).json({ message: 'שגיאה בעדכון אירוע' });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedEvent = await Event.findOneAndDelete({ _id: id, userId: req.user._id });

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
    await Log.deleteMany({ eventId: id, userId: req.user._id });
    await Event.findOneAndDelete({ _id: id, userId: req.user._id });

    res.json({ message: 'האירוע וכל התיעודים נמחקו בהצלחה' });
  } catch (err) {
    console.error('שגיאה במחיקת אירוע ותיעודים:', err);
    res.status(500).json({ message: 'שגיאה במחיקת אירוע ותיעודים' });
  }
};

const markEventExpirationNotified = async (req, res) => {
  const { id } = req.params;

  try {
    const updated = await Event.findOneAndUpdate(
      { _id: id, userId: req.user._id },
      { expirationNotified: true },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'אירוע לא נמצא' });
    }

    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: 'שגיאה בעדכון סטטוס התפוגה' });
  }
};

const buildEventSummary = async (eventId, userId) => {
  const logs = await Log.find({ eventId, userId }).sort({ timestamp: -1 });

  if (!logs.length) {
    return {
      totalLogs: 0,
      firstLog: null,
      lastLog: null,
      byTimeOfDay: {},
    };
  }

  const byTimeOfDay = logs.reduce((acc, log) => {
    if (log.timeOfDay) {
      acc[log.timeOfDay] = (acc[log.timeOfDay] || 0) + 1;
    }
    return acc;
  }, {});

  return {
    totalLogs: logs.length,
    firstLog: logs[logs.length - 1],
    lastLog: logs[0],
    byTimeOfDay,
  };
};

const getEventSummary = async (req, res) => {
  const { id } = req.params;

  try {
    const event = await Event.findOne({ _id: id, userId: req.user._id });
    if (!event) {
      return res.status(404).json({ message: 'אירוע לא נמצא' });
    }

    const summary = await buildEventSummary(id, req.user._id);
    res.json({ event, summary });
  } catch (err) {
    res.status(500).json({ message: 'שגיאה בשליפת סיכום האירוע' });
  }
};

const formatDateForExport = (date) => {
  if (!date) {
    return '';
  }
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) {
    return '';
  }
  return value.toLocaleString('he-IL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const escapeCsvValue = (value) => {
  if (value === null || value === undefined) {
    return '""';
  }
  const stringValue = String(value).replace(/"/g, '""');
  return `"${stringValue}"`;
};

const getTemporaryEventsOverview = async (req, res) => {
  try {
    const events = await Event.find({
      userId: req.user._id,
      type: 'temporary',
      archived: { $ne: true },
    }).sort({ updatedAt: -1 });

    const summaries = await Promise.all(
      events.map(async (event) => ({
        event,
        summary: await buildEventSummary(event._id, req.user._id),
      }))
    );

    res.json(summaries);
  } catch (err) {
    res.status(500).json({ message: 'שגיאה בשליפת האירועים הזמניים' });
  }
};

const restartEvent = async (req, res) => {
  const { id } = req.params;
  const { expiresAt, expirationDurationMs, resetLogs = true } = req.body || {};

  try {
    const event = await Event.findOne({ _id: id, userId: req.user._id });
    if (!event) {
      return res.status(404).json({ message: 'אירוע לא נמצא' });
    }

    let nextDuration = event.expirationDurationMs;
    if (typeof expirationDurationMs === 'number' && expirationDurationMs > 0) {
      nextDuration = expirationDurationMs;
    }

    let nextExpiration = null;
    if (expiresAt) {
      const parsed = new Date(expiresAt);
      if (Number.isNaN(parsed.getTime())) {
        return res.status(400).json({ message: 'תאריך תפוגה אינו תקין' });
      }
      nextExpiration = parsed;
      nextDuration = Math.max(parsed.getTime() - Date.now(), 0);
    } else if (nextDuration) {
      nextExpiration = new Date(Date.now() + nextDuration);
    }

    if (resetLogs) {
      await Log.deleteMany({ eventId: id, userId: req.user._id });
    }

    event.totalColor = 0;
    event.lastPressedAt = null;
    event.expiresAt = nextExpiration;
    event.expirationDurationMs = nextDuration || null;
    event.expirationNotified = false;
    event.expirationAcknowledged = false;
    event.archived = false;
    event.goalDailyCount = 0;
    event.goalDailyLastReset = null;
    event.goalCompletedAt = null;

    await event.save();

    res.json({ event });
  } catch (err) {
    res.status(500).json({ message: 'שגיאה באתחול האירוע מחדש' });
  }
};

const archiveEvent = async (req, res) => {
  const { id } = req.params;

  try {
    const event = await Event.findOne({ _id: id, userId: req.user._id });
    if (!event) {
      return res.status(404).json({ message: 'אירוע לא נמצא' });
    }

    const summary = await buildEventSummary(id, req.user._id);

    event.archived = true;
    event.expirationAcknowledged = true;
    await event.save();

    res.json({ event, summary });
  } catch (err) {
    res.status(500).json({ message: 'שגיאה בארכוב האירוע' });
  }
};

const exportTemporaryEventSummary = async (req, res) => {
  const { id } = req.params;

  try {
    const event = await Event.findOne({
      _id: id,
      userId: req.user._id,
      type: 'temporary',
    });

    if (!event) {
      return res.status(404).json({ message: 'אירוע זמני לא נמצא' });
    }

    const logs = await Log.find({ eventId: id, userId: req.user._id }).sort({
      timestamp: 1,
    });
    const summary = await buildEventSummary(id, req.user._id);

    const headerLines = [
      ['שם האירוע', escapeCsvValue(event.name)],
      ['סה"כ תיעודים', escapeCsvValue(summary.totalLogs)],
      [
        'תיעוד ראשון',
        escapeCsvValue(formatDateForExport(summary.firstLog?.timestamp)),
      ],
      [
        'תיעוד אחרון',
        escapeCsvValue(formatDateForExport(summary.lastLog?.timestamp)),
      ],
    ];

    const timeOfDayLines = Object.entries(summary.byTimeOfDay || {}).map(
      ([key, count]) => [`כמות בזמן ${key}`, escapeCsvValue(count)]
    );

    const logsHeader = [
      'שם האירוע',
      'תאריך ושעה',
      'חלק ביום',
      'יום בשבוע',
      'הערה',
    ].map(escapeCsvValue);

    const logLines = logs.map((log) =>
      [
        escapeCsvValue(log.eventName || event.name),
        escapeCsvValue(formatDateForExport(log.timestamp)),
        escapeCsvValue(log.timeOfDay || ''),
        escapeCsvValue(log.dayOfWeek || ''),
        escapeCsvValue(log.comment || ''),
      ].join(',')
    );

    const csvSections = [
      headerLines.map((row) => row.join(',')).join('\n'),
      timeOfDayLines.length ? timeOfDayLines.map((row) => row.join(',')).join('\n') : '',
      logs.length ? [logsHeader.join(','), ...logLines].join('\n') : '"אין תיעודים זמניים"',
    ].filter(Boolean);

    const csvContent = `\ufeff${csvSections.join('\n\n')}`;

    const safeEventName = event.name?.replace(/[^\w\u0590-\u05ff-]+/g, '-').slice(0, 40) || 'temporary-event';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="temporary-event-${safeEventName}.csv"`
    );

    res.status(200).send(csvContent);
  } catch (err) {
    console.error('שגיאה ביצוא אירוע זמני:', err);
    res.status(500).json({ message: 'שגיאה בהכנת הקובץ לייצוא' });
  }
};

module.exports = {
  getAllEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  deleteEventAndLogs,
  markEventExpirationNotified,
  getEventSummary,
  getTemporaryEventsOverview,
  exportTemporaryEventSummary,
  restartEvent,
  archiveEvent,
};
