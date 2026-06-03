const express = require('express');
const Territory = require('../models/Territory');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/territory/all
router.get('/all', async (req, res) => {
  try {
    // Optional bounding box filter for performance
    const { swLat, swLng, neLat, neLng } = req.query;

    let query = { ownerId: { $ne: null } };

    if (swLat && swLng && neLat && neLng) {
      query.lat = { $gte: parseFloat(swLat), $lte: parseFloat(neLat) };
      query.lng = { $gte: parseFloat(swLng), $lte: parseFloat(neLng) };
    }

    const territories = await Territory.find(query)
      .populate('ownerId', 'username color')
      .lean({ virtuals: true })
      .limit(5000); // safety limit

    res.json({ territories });
  } catch (err) {
    console.error('Territory all error:', err);
    res.status(500).json({ error: 'Failed to fetch territories' });
  }
});

// GET /api/territory/user/:userId
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const territories = await Territory.find({ ownerId: req.params.userId })
      .lean({ virtuals: true });
    res.json({ territories });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user territories' });
  }
});

// POST /api/territory/capture (manual capture endpoint, used internally)
router.post('/capture', auth, async (req, res) => {
  try {
    const { gridKeys } = req.body;
    if (!gridKeys || !Array.isArray(gridKeys)) {
      return res.status(400).json({ error: 'gridKeys array required' });
    }

    const captured = [];
    for (const gridKey of gridKeys.slice(0, 100)) { // max 100 per request
      const territory = await Territory.findOneAndUpdate(
        { gridKey },
        {
          ownerId: req.userId,
          color: req.user.color,
          capturedAt: new Date(),
          lastDefendedAt: new Date(),
          decayState: 'fresh',
        },
        { upsert: true, new: true }
      );
      captured.push(territory);
    }

    if (req.io) {
      req.io.emit('territory-captured', { territories: captured, capturedBy: req.user.username });
    }

    res.json({ captured: captured.length, territories: captured });
  } catch (err) {
    res.status(500).json({ error: 'Failed to capture territories' });
  }
});

module.exports = router;
