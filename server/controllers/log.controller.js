const mongoose = require('mongoose');
const Log = require('../models/log.model');
const Event = require('../models/event.model');
const Notification = require('../models/notification.model');

const getAccessibleEventIds = async (userId) => {
  const events = await Event.find({
    $or: [{ owner: userId }, { participants: userId }],
  }).select('_id title owner participants shared');
  return events.map((event) => event._id.toString());
};

const isUserAllowedOnEvent = (event, userId) =>
  event.owner.toString() === userId.toString() ||
  (event.participants || []).some((participant) => participant.toString() === userId.toString());

const getAllLogs = async (req, res) => {
  try {
    const { fromDate, toDate, eventName, timeOfDay, eventId } = req.query;
    const userId = req.userId;

    const filter = {};

    if (fromDate || toDate) {
      filter.timestamp = {};
      if (fromDate) filter.timestamp.$gte = new Date(fromDate);
      if (toDate) filter.timestamp.$lte = new Date(toDate);
    }

    if (eventName) {
      filter.eventName = { $regex: new RegExp(eventName, 'i') };
    }

    if (timeOfDay) {
      filter.timeOfDay = timeOfDay;
    }

    const accessibleIds = await getAccessibleEventIds(userId);
    if (eventId) {
      if (!accessibleIds.includes(eventId)) {
        return res.status(403).json({ message: 'אין הרשאה לגשת לאירוע זה' });
      }
      filter.eventId = eventId;
    } else {
      filter.eventId = { $in: accessibleIds };
    }

    const logs = await Log.find(filter).sort({ timestamp: -1 });
    return res.json(logs);
  } catch (err) {
    return res.status(500).json({ message: 'שגיאה בשליפת התיעודים' });
  }
};

const resolveTimeOfDay = (date) => {
  const hours = date.getHours();
  if (hours >= 5 && hours < 12) return 'בוקר';
  if (hours >= 12 && hours < 17) return 'צהריים';
  if (hours >= 17 && hours < 21) return 'ערב';
  return 'לילה';
};

const resolveDayOfWeek = (date) => {
  const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  return days[date.getDay()];
};

const createLog = async (req, res) => {
  try {
    const { eventId, comment, imageUri, location } = req.body;
    if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ message: 'אירוע אינו תקין' });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'אירוע לא נמצא' });
    }

    if (!isUserAllowedOnEvent(event, req.userId)) {
      return res.status(403).json({ message: 'אין לך הרשאה לתעד אירוע זה' });
    }

    const now = new Date();
    const log = new Log({
      eventId,
      eventName: event.title,
      timestamp: now,
      timeOfDay: resolveTimeOfDay(now),
      dayOfWeek: resolveDayOfWeek(now),
      comment: comment || '',
      imageUri: imageUri || '',
      location: location || {},
      userId: req.userId,
    });

    await log.save();

    const recipients = new Set([
      event.owner.toString(),
      ...event.participants.map((participant) => participant.toString()),
    ]);
    recipients.delete(req.userId.toString());

    const notifications = Array.from(recipients).map((user) => ({
      user,
      type: 'EVENT_LOG',
      payload: {
        eventId: event._id,
        eventTitle: event.title,
        by: {
          _id: req.user._id,
          username: req.user.username,
          friendCode: req.user.friendCode,
        },
      },
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    return res.status(201).json(log);
  } catch (err) {
    return res.status(400).json({ message: 'שגיאה ביצירת תיעוד חדש', details: err.message });
  }
};

const deleteLog = async (req, res) => {
  try {
    const { id } = req.params;
    const log = await Log.findById(id);
    if (!log) {
      return res.status(404).json({ message: 'התיעוד לא נמצא' });
    }

    const event = await Event.findById(log.eventId);
    if (!event) {
      return res.status(404).json({ message: 'אירוע לא נמצא' });
    }

    const isOwner = event.owner.toString() === req.userId.toString();
    const isAuthor = log.userId.toString() === req.userId.toString();
    if (!isOwner && !isAuthor) {
      return res.status(403).json({ message: 'אין הרשאה למחוק תיעוד זה' });
    }

    await Log.findByIdAndDelete(id);
    return res.json({ message: 'התיעוד נמחק בהצלחה' });
  } catch (err) {
    return res.status(400).json({ message: 'שגיאה במחיקת התיעוד' });
  }
};

module.exports = {
  getAllLogs,
  createLog,
  deleteLog,
};
