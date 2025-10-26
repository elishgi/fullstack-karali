const mongoose = require('mongoose');
const Event = require('../models/event.model');
const Log = require('../models/log.model');
const { getFriendIds } = require('../services/friendship.service');

const toObjectIdArray = (list = []) => {
  if (!Array.isArray(list)) return [];
  return [...new Set(list.filter(Boolean).map((id) => id.toString()))].map((id) => new mongoose.Types.ObjectId(id));
};

const ensureOwnership = (event, userId) => event.owner.toString() === userId.toString();

const buildEventResponse = (event) => ({
  ...event.toObject(),
  participants: (event.participants || []).map((participant) =>
    typeof participant === 'object' && participant !== null && participant._id
      ? {
          _id: participant._id,
          username: participant.username,
          friendCode: participant.friendCode,
        }
      : participant
  ),
});

const getAllEvents = async (req, res) => {
  try {
    const scope = req.query.scope;
    const userId = req.userId;

    let criteria;
    if (scope === 'personal') {
      criteria = { owner: userId };
    } else if (scope === 'shared') {
      criteria = {
        shared: true,
        $or: [{ owner: userId }, { participants: userId }],
      };
    } else {
      criteria = {
        $or: [{ owner: userId }, { participants: userId }],
      };
    }

    const events = await Event.find(criteria)
      .populate('participants', 'username friendCode')
      .sort({ startsAt: 1, createdAt: -1 });

    return res.json(events.map(buildEventResponse));
  } catch (err) {
    return res.status(500).json({ message: 'שגיאה בשליפת האירועים', details: err.message });
  }
};

const createEvent = async (req, res) => {
  try {
    const {
      title,
      name,
      color,
      shared,
      participants = [],
      startsAt,
      endsAt,
    } = req.body;

    const owner = req.userId;
    const eventTitle = (title || name || '').trim();
    if (!eventTitle) {
      return res.status(400).json({ message: 'יש לספק שם אירוע' });
    }

    const participantIds = shared ? toObjectIdArray(participants).filter((id) => id.toString() !== owner.toString()) : [];
    if (shared && participantIds.length === 0) {
      return res.status(400).json({ message: 'אירוע משותף מחייב בחירת משתתף אחד לפחות' });
    }

    if (participantIds.length > 0) {
      const friendIds = await getFriendIds(owner);
      const notFriends = participantIds.filter((id) => !friendIds.includes(id.toString()));
      if (notFriends.length > 0) {
        return res.status(403).json({ message: 'ניתן להזמין רק חברים מאושרים לאירוע משותף' });
      }
    }

    const event = new Event({
      owner,
      title: eventTitle,
      color: color || '#000000',
      totalColor: 0,
      shared: Boolean(shared) && participantIds.length > 0,
      participants: participantIds,
      startsAt: startsAt ? new Date(startsAt) : undefined,
      endsAt: endsAt ? new Date(endsAt) : undefined,
    });

    await event.save();

    const populated = await Event.findById(event._id).populate('participants', 'username friendCode');

    return res.status(201).json(buildEventResponse(populated));
  } catch (err) {
    if (err instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ message: 'שדות האירוע אינם תקינים', details: err.message });
    }
    return res.status(500).json({ message: 'שגיאה ביצירת אירוע חדש', details: err.message });
  }
};

const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ message: 'אירוע לא נמצא' });
    }
    if (!ensureOwnership(event, req.userId)) {
      return res.status(403).json({ message: 'אין הרשאה לעדכן אירוע זה' });
    }

    const allowedFields = ['title', 'name', 'color', 'totalColor', 'startsAt', 'endsAt'];
    allowedFields.forEach((field) => {
      if (field in req.body) {
        if (field === 'startsAt' || field === 'endsAt') {
          event[field] = req.body[field] ? new Date(req.body[field]) : undefined;
        } else {
          event[field] = req.body[field];
        }
      }
    });
    await event.save();

    const populated = await Event.findById(event._id).populate('participants', 'username friendCode');
    return res.json(buildEventResponse(populated));
  } catch (err) {
    return res.status(400).json({ message: 'שגיאה בעדכון אירוע', details: err.message });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ message: 'אירוע לא נמצא' });
    }
    if (!ensureOwnership(event, req.userId)) {
      return res.status(403).json({ message: 'אין הרשאה למחיקת האירוע' });
    }

    await Event.findByIdAndDelete(id);
    return res.json({ message: 'האירוע נמחק בהצלחה' });
  } catch (err) {
    return res.status(400).json({ message: 'שגיאה במחיקת האירוע' });
  }
};

const deleteEventAndLogs = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ message: 'אירוע לא נמצא' });
    }
    if (!ensureOwnership(event, req.userId)) {
      return res.status(403).json({ message: 'אין הרשאה למחיקת האירוע' });
    }

    await Log.deleteMany({ eventId: id });
    await Event.findByIdAndDelete(id);
    return res.json({ message: 'האירוע וכל התיעודים נמחקו בהצלחה' });
  } catch (err) {
    return res.status(500).json({ message: 'שגיאה במחיקת אירוע ותיעודים', details: err.message });
  }
};

const updateParticipants = async (req, res) => {
  try {
    const { id } = req.params;
    const { participants = [] } = req.body;

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ message: 'אירוע לא נמצא' });
    }
    if (!ensureOwnership(event, req.userId)) {
      return res.status(403).json({ message: 'אין הרשאה לעדכן משתתפים' });
    }

    const participantIds = toObjectIdArray(participants).filter((pid) => pid.toString() !== req.userId.toString());
    if (participantIds.length > 0) {
      const friendIds = await getFriendIds(req.userId);
      const notFriends = participantIds.filter((id) => !friendIds.includes(id.toString()));
      if (notFriends.length > 0) {
        return res.status(403).json({ message: 'ניתן להוסיף רק חברים' });
      }
    }

    event.participants = participantIds;
    event.shared = participantIds.length > 0;
    await event.save();

    const populated = await Event.findById(event._id).populate('participants', 'username friendCode');
    return res.json(buildEventResponse(populated));
  } catch (err) {
    return res.status(400).json({ message: 'שגיאה בעדכון משתתפים', details: err.message });
  }
};

const getEventNames = async (req, res) => {
  try {
    const userId = req.userId;
    const events = await Event.find({
      $or: [{ owner: userId }, { participants: userId }],
    }).select('title');
    const names = events.map((event) => event.title);
    return res.json(names);
  } catch (err) {
    return res.status(500).json({ message: 'שגיאה בשליפת שמות האירועים' });
  }
};

const listParticipants = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id)
      .populate('participants', 'username friendCode email')
      .populate('owner', 'username friendCode email');
    if (!event) {
      return res.status(404).json({ message: 'אירוע לא נמצא' });
    }
    const participantIds = (event.participants || []).map((p) => p._id?.toString?.() || p.toString());
    if (!ensureOwnership(event, req.userId) && !participantIds.includes(req.userId.toString())) {
      return res.status(403).json({ message: 'אין הרשאה לצפות במשתתפים' });
    }

    return res.json({
      owner: {
        _id: event.owner._id,
        username: event.owner.username,
        friendCode: event.owner.friendCode,
      },
      participants: event.participants.map((participant) => ({
        _id: participant._id,
        username: participant.username,
        friendCode: participant.friendCode,
      })),
    });
  } catch (err) {
    return res.status(500).json({ message: 'שגיאה בשליפת משתתפים' });
  }
};

module.exports = {
  getAllEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  deleteEventAndLogs,
  updateParticipants,
  getEventNames,
  listParticipants,
};
