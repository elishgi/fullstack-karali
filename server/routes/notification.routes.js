const express = require('express');
const { listNotifications, markNotificationRead } = require('../controllers/notification.controller');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.get('/notifications', listNotifications);
router.patch('/notifications/:id/read', markNotificationRead);

module.exports = router;
