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
    } = req.body;

    if (!['regular', 'temporary'].includes(type)) {
      return res.status(400).json({ message: 'סוג האירוע אינו תקין' });
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
    } = req.body;

    const updates = {
      ...(name !== undefined ? { name } : {}),
      ...(color !== undefined ? { color } : {}),
      ...(totalColor !== undefined ? { totalColor } : {}),
    };

    if (typeof shared === 'boolean') {
      updates.shared = shared;
    }

    if (participants !== undefined) {
      updates.participants = Array.isArray(participants) ? participants : [];
    }

    if (type !== undefined) {
      if (!['regular', 'temporary'].includes(type)) {
        return res.status(400).json({ message: 'סוג האירוע אינו תקין' });
      }
      updates.type = type;
    }

    if (expiresAt !== undefined) {
      if (expiresAt === null) {
        updates.expiresAt = null;
      } else {
        const parsed = new Date(expiresAt);
        if (Number.isNaN(parsed.getTime())) {
          return res.status(400).json({ message: 'תאריך תפוגה אינו תקין' });
        }
        updates.expiresAt = parsed;
      }
    }

    if (expirationDurationMs !== undefined) {
      updates.expirationDurationMs =
        typeof expirationDurationMs === 'number' && expirationDurationMs > 0
          ? expirationDurationMs
          : null;
    }

    if (typeof expirationNotified === 'boolean') {
      updates.expirationNotified = expirationNotified;
    }

    if (typeof expirationAcknowledged === 'boolean') {
      updates.expirationAcknowledged = expirationAcknowledged;
    }

    if (typeof archived === 'boolean') {
      updates.archived = archived;
    }

    if (lastPressedAt !== undefined) {
      updates.lastPressedAt = lastPressedAt ? new Date(lastPressedAt) : null;
    }

    const updatedEvent = await Event.findOneAndUpdate(
      { _id: id, userId: req.user._id },
      updates,
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

module.exports = {
  getAllEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  deleteEventAndLogs,
  markEventExpirationNotified,
  getEventSummary,
  getTemporaryEventsOverview,
  restartEvent,
  archiveEvent,
};
