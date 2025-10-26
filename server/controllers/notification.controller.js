const Notification = require('../models/notification.model');

const listNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.userId })
      .sort({ createdAt: -1 })
      .lean();
    return res.json(notifications);
  } catch (err) {
    return res.status(500).json({ message: 'שגיאה בשליפת התראות' });
  }
};

const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findOneAndUpdate(
      { _id: id, user: req.userId },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'התראה לא נמצאה' });
    }

    return res.json(notification);
  } catch (err) {
    return res.status(500).json({ message: 'שגיאה בעדכון התראה' });
  }
};

module.exports = {
  listNotifications,
  markNotificationRead,
};
