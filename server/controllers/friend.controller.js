const mongoose = require('mongoose');
const FriendRequest = require('../models/friend-request.model');
const Friendship = require('../models/friendship.model');
const Notification = require('../models/notification.model');
const User = require('../models/user.model');
const { createFriendship, areFriends } = require('../services/friendship.service');

const sanitizeUser = (user) => ({
  _id: user._id,
  username: user.username,
  friendCode: user.friendCode,
  email: user.email,
});

const sendFriendRequest = async (req, res) => {
  try {
    const { toUserId, friendCode } = req.body;
    const userId = req.userId;

    let target;
    if (toUserId && mongoose.Types.ObjectId.isValid(toUserId)) {
      target = await User.findById(toUserId);
    } else if (friendCode) {
      target = await User.findOne({ friendCode: friendCode.trim().toUpperCase() });
    }

    if (!target) {
      return res.status(404).json({ message: 'המשתמש המבוקש לא נמצא' });
    }

    if (target._id.toString() === userId.toString()) {
      return res.status(400).json({ message: 'לא ניתן לשלוח בקשת חברות לעצמך' });
    }

    if (await areFriends(userId, target._id)) {
      return res.status(409).json({ message: 'כבר קיימת חברות בין המשתמשים' });
    }

    const existingIncoming = await FriendRequest.findOne({
      fromUser: target._id,
      toUser: userId,
      status: 'pending',
    });

    if (existingIncoming) {
      existingIncoming.status = 'accepted';
      await existingIncoming.save();
      await createFriendship(userId, target._id);
      await Notification.create({
        user: target._id,
        type: 'FRIEND_ACCEPTED',
        payload: { by: sanitizeUser(req.user) },
      });
      await Notification.create({
        user: userId,
        type: 'FRIEND_ACCEPTED',
        payload: { by: sanitizeUser(target) },
      });
      return res.status(200).json({
        message: 'בקשת החברות המאוחרת אושרה',
        request: existingIncoming,
      });
    }

    const duplicate = await FriendRequest.findOne({
      fromUser: userId,
      toUser: target._id,
      status: 'pending',
    });
    if (duplicate) {
      return res.status(409).json({ message: 'כבר נשלחה בקשה ממתינה לאותו משתמש' });
    }

    const request = await FriendRequest.create({
      fromUser: userId,
      toUser: target._id,
    });

    await Notification.create({
      user: target._id,
      type: 'FRIEND_REQUEST',
      payload: { from: sanitizeUser(req.user) },
    });

    const populated = await FriendRequest.findById(request._id).populate('fromUser toUser', 'username friendCode email');

    return res.status(201).json(populated);
  } catch (err) {
    return res.status(500).json({ message: 'שגיאה בשליחת בקשה', details: err.message });
  }
};

const listFriendRequests = async (req, res) => {
  try {
    const direction = req.query.direction;
    const userId = req.userId;

    const baseQuery = { status: 'pending' };

    let incoming = [];
    let outgoing = [];

    if (!direction || direction === 'in') {
      incoming = await FriendRequest.find({ ...baseQuery, toUser: userId })
        .populate('fromUser toUser', 'username friendCode email')
        .sort({ createdAt: -1 });
    }

    if (!direction || direction === 'out') {
      outgoing = await FriendRequest.find({ ...baseQuery, fromUser: userId })
        .populate('fromUser toUser', 'username friendCode email')
        .sort({ createdAt: -1 });
    }

    return res.json({ incoming, outgoing });
  } catch (err) {
    return res.status(500).json({ message: 'שגיאה בשליפת בקשות חברות' });
  }
};

const respondToRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.userId;

    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'סטטוס לא תקף' });
    }

    const request = await FriendRequest.findById(id).populate('fromUser toUser');
    if (!request) {
      return res.status(404).json({ message: 'בקשה לא נמצאה' });
    }

    if (request.toUser._id.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'אין לך הרשאה לעדכן בקשה זו' });
    }

    request.status = status;
    await request.save();

    if (status === 'accepted') {
      await createFriendship(request.fromUser._id, request.toUser._id);
      await Notification.create({
        user: request.fromUser._id,
        type: 'FRIEND_ACCEPTED',
        payload: { by: sanitizeUser(request.toUser) },
      });
    }

    return res.json(request);
  } catch (err) {
    return res.status(500).json({ message: 'שגיאה בעדכון הבקשה', details: err.message });
  }
};

const listFriends = async (req, res) => {
  try {
    const userId = req.userId;
    const friendships = await Friendship.find({
      $or: [{ userA: userId }, { userB: userId }],
    })
      .populate('userA userB', 'username friendCode email')
      .sort({ since: -1 });

    const friends = friendships.map((friendship) => {
      const friend = friendship.userA._id.toString() === userId.toString()
        ? friendship.userB
        : friendship.userA;
      return {
        ...sanitizeUser(friend),
        since: friendship.since,
      };
    });

    return res.json(friends);
  } catch (err) {
    return res.status(500).json({ message: 'שגיאה בשליפת חברים' });
  }
};

module.exports = {
  sendFriendRequest,
  listFriendRequests,
  respondToRequest,
  listFriends,
};
