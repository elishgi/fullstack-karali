const express = require('express');
const {
  sendFriendRequest,
  listFriendRequests,
  respondToRequest,
  listFriends,
} = require('../controllers/friend.controller');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.post('/friends/requests', sendFriendRequest);
router.get('/friends/requests', listFriendRequests);
router.patch('/friends/requests/:id', respondToRequest);
router.get('/friends', listFriends);

module.exports = router;
