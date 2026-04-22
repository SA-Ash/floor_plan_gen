const { Router } = require('express');
const store = require('../store');

const router = Router();

// GET /dashboard/stats
router.get('/stats', (req, res) => {
  res.json(store.getStats());
});

// GET /dashboard/activity
router.get('/activity', (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  res.json(store.activities.slice(0, limit));
});

// GET /dashboard/notifications
router.get('/notifications', (req, res) => {
  res.json({
    notifications: store.notifications.slice(0, 20),
    unreadCount: store.getUnreadCount()
  });
});

// PUT /dashboard/notifications/:id/read
router.put('/notifications/:id/read', (req, res) => {
  const notif = store.markNotificationRead(req.params.id);
  if (!notif) return res.status(404).json({ error: 'Notification not found' });
  res.json(notif);
});

// PUT /dashboard/notifications/read-all
router.put('/notifications/read-all', (req, res) => {
  store.notifications.forEach(n => { n.read = true; });
  res.json({ success: true });
});

module.exports = router;
