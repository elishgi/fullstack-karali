const mongoose = require('mongoose');
const Friendship = require('../models/friendship.model');

function normalizePair(userIdA, userIdB) {
  const a = new mongoose.Types.ObjectId(userIdA);
  const b = new mongoose.Types.ObjectId(userIdB);
  return a.toString() < b.toString() ? [a, b] : [b, a];
}

async function areFriends(userIdA, userIdB) {
  if (!userIdA || !userIdB) return false;
  const [userA, userB] = normalizePair(userIdA, userIdB);
  const existing = await Friendship.findOne({ userA, userB }).lean();
  return Boolean(existing);
}

async function createFriendship(userIdA, userIdB) {
  const [userA, userB] = normalizePair(userIdA, userIdB);
  return Friendship.findOneAndUpdate(
    { userA, userB },
    {},
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
}

async function getFriendIds(userId) {
  const friendships = await Friendship.find({
    $or: [{ userA: userId }, { userB: userId }],
  }).lean();

  return friendships.map((friendship) => {
    if (friendship.userA.toString() === userId.toString()) {
      return friendship.userB.toString();
    }
    return friendship.userA.toString();
  });
}

module.exports = {
  areFriends,
  createFriendship,
  getFriendIds,
};
