const express = require('express');
const User = require('../models/User');

const router = express.Router();

// GET /api/leaderboard
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);

    const leaders = await User.find({})
      .sort({ territoriesOwned: -1, totalDistance: -1 })
      .limit(limit)
      .select('username color totalDistance territoriesOwned territoriesCaptured createdAt')
      .lean();

    const leaderboard = leaders.map((user, index) => ({
      rank: index + 1,
      userId: user._id,
      username: user.username,
      color: user.color,
      territoriesOwned: user.territoriesOwned,
      totalDistanceKm: Math.round((user.totalDistance / 1000) * 10) / 10,
      territoriesCaptured: user.territoriesCaptured || 0,
    }));

    res.json({ leaderboard });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

module.exports = router;
